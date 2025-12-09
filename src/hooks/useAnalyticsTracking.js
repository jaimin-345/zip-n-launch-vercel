import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Detect device type
const getDeviceType = () => {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
};

// Get browser info
const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edge')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
};

export const useAnalyticsTracking = () => {
    const { user } = useAuth();
    const location = useLocation();
    const sessionIdRef = useRef(null);
    const sessionStartRef = useRef(null);
    const previousPageRef = useRef(null);
    const isInitializedRef = useRef(false);

    // Start session on mount
    useEffect(() => {
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        const startSession = async () => {
            try {
                const { data, error } = await supabase
                    .from('analytics_user_sessions')
                    .insert({
                        user_id: user?.id || null,
                        device_type: getDeviceType(),
                        browser: getBrowserInfo()
                    })
                    .select('id')
                    .single();
                
                if (!error && data) {
                    sessionIdRef.current = data.id;
                    sessionStartRef.current = Date.now();
                    console.log('Analytics session started:', data.id);
                }
            } catch (err) {
                console.error('Failed to start analytics session:', err);
            }
        };

        startSession();

        // End session on unmount/tab close
        const endSession = async () => {
            if (sessionIdRef.current && sessionStartRef.current) {
                const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
                try {
                    await supabase
                        .from('analytics_user_sessions')
                        .update({
                            session_end: new Date().toISOString(),
                            duration_seconds: duration
                        })
                        .eq('id', sessionIdRef.current);
                } catch (err) {
                    console.error('Failed to end session:', err);
                }
            }
        };

        window.addEventListener('beforeunload', endSession);
        return () => {
            endSession();
            window.removeEventListener('beforeunload', endSession);
        };
    }, [user?.id]);

    // Track page views
    useEffect(() => {
        const trackPageView = async () => {
            if (!location.pathname) return;
            
            try {
                await supabase.from('analytics_behavior_events').insert({
                    user_id: user?.id || null,
                    session_id: sessionIdRef.current,
                    event_type: 'page_view',
                    page_path: location.pathname,
                    previous_page: previousPageRef.current,
                    event_data: { search: location.search }
                });
                previousPageRef.current = location.pathname;
            } catch (err) {
                console.error('Failed to track page view:', err);
            }
        };

        // Small delay to ensure session is initialized
        const timeout = setTimeout(trackPageView, 100);
        return () => clearTimeout(timeout);
    }, [location.pathname, user?.id]);

    // Track pattern events
    const trackPatternEvent = useCallback(async (action, patternData = {}) => {
        try {
            await supabase.from('analytics_pattern_events').insert({
                user_id: user?.id || null,
                action,
                pattern_id: patternData.patternId || null,
                association_id: patternData.associationId || null,
                discipline: patternData.discipline || null,
                difficulty_level: patternData.difficultyLevel || null,
                time_spent_seconds: patternData.timeSpent || null,
                version_id: patternData.versionId || null,
                device_type: getDeviceType(),
                browser: getBrowserInfo()
            });
        } catch (err) {
            console.error('Failed to track pattern event:', err);
        }
    }, [user?.id]);

    // Track behavior events
    const trackBehaviorEvent = useCallback(async (eventType, eventData = {}) => {
        try {
            await supabase.from('analytics_behavior_events').insert({
                user_id: user?.id || null,
                session_id: sessionIdRef.current,
                event_type: eventType,
                page_path: location.pathname,
                event_data: eventData
            });
        } catch (err) {
            console.error('Failed to track behavior event:', err);
        }
    }, [user?.id, location.pathname]);

    // Track search
    const trackSearch = useCallback((searchTerm) => {
        trackBehaviorEvent('search', { searchTerm });
    }, [trackBehaviorEvent]);

    // Track click flow
    const trackClick = useCallback((elementId, elementType) => {
        trackBehaviorEvent('click', { elementId, elementType });
    }, [trackBehaviorEvent]);

    // Track performance
    const trackPerformance = useCallback(async (metricType, data = {}) => {
        try {
            await supabase.from('analytics_performance_logs').insert({
                user_id: user?.id || null,
                metric_type: metricType,
                page_path: location.pathname,
                load_time_ms: data.loadTime || null,
                error_message: data.errorMessage || null,
                error_stack: data.errorStack || null,
                device_type: getDeviceType(),
                browser: getBrowserInfo(),
                network_type: navigator.connection?.effectiveType || 'unknown'
            });
        } catch (err) {
            console.error('Failed to track performance:', err);
        }
    }, [user?.id, location.pathname]);

    // Track errors
    const trackError = useCallback((error) => {
        trackPerformance('error', {
            errorMessage: error.message,
            errorStack: error.stack
        });
    }, [trackPerformance]);

    return {
        trackPatternEvent,
        trackBehaviorEvent,
        trackSearch,
        trackClick,
        trackPerformance,
        trackError
    };
};

export default useAnalyticsTracking;

