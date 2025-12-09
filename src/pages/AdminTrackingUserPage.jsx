import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Loader2, Search, Eye, Download, MousePointer, Clock, AlertTriangle, Activity, Users, Monitor, Smartphone, Tablet, ChevronDown } from 'lucide-react';

const AdminTrackingUserPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('pattern-events');
    const { toast } = useToast();

    // Data states
    const [patternEvents, setPatternEvents] = useState([]);
    const [userSessions, setUserSessions] = useState([]);
    const [behaviorEvents, setBehaviorEvents] = useState([]);
    const [performanceLogs, setPerformanceLogs] = useState([]);
    const [profiles, setProfiles] = useState({});

    // Stats
    const [stats, setStats] = useState({
        totalViews: 0,
        totalDownloads: 0,
        totalSessions: 0,
        avgSessionDuration: 0,
        errorCount: 0
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch profiles for user names
            const { data: profilesData } = await supabase.from('profiles').select('id, full_name');
            const profilesMap = {};
            profilesData?.forEach(p => { profilesMap[p.id] = p.full_name || 'Unknown User'; });
            setProfiles(profilesMap);

            if (activeTab === 'pattern-events') {
                const { data, error } = await supabase
                    .from('analytics_pattern_events')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100);
                if (error) throw error;
                setPatternEvents(data || []);

                // Calculate stats
                const views = data?.filter(e => e.action === 'view').length || 0;
                const downloads = data?.filter(e => e.action === 'download').length || 0;
                setStats(prev => ({ ...prev, totalViews: views, totalDownloads: downloads }));
            }

            if (activeTab === 'sessions') {
                const { data, error } = await supabase
                    .from('analytics_user_sessions')
                    .select('*')
                    .order('session_start', { ascending: false })
                    .limit(100);
                if (error) throw error;
                setUserSessions(data || []);

                const avgDuration = data?.length > 0 
                    ? data.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / data.length 
                    : 0;
                setStats(prev => ({ ...prev, totalSessions: data?.length || 0, avgSessionDuration: Math.round(avgDuration) }));
            }

            if (activeTab === 'behavior') {
                const { data, error } = await supabase
                    .from('analytics_behavior_events')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100);
                if (error) throw error;
                setBehaviorEvents(data || []);
            }

            if (activeTab === 'performance') {
                const { data, error } = await supabase
                    .from('analytics_performance_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100);
                if (error) throw error;
                setPerformanceLogs(data || []);

                const errors = data?.filter(l => l.metric_type === 'error').length || 0;
                setStats(prev => ({ ...prev, errorCount: errors }));
            }

        } catch (error) {
            console.error('Error fetching tracking data:', error);
            toast({ title: 'Error', description: 'Failed to fetch tracking data.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const getDeviceIcon = (deviceType) => {
        switch (deviceType?.toLowerCase()) {
            case 'mobile': return <Smartphone className="h-4 w-4" />;
            case 'tablet': return <Tablet className="h-4 w-4" />;
            default: return <Monitor className="h-4 w-4" />;
        }
    };

    const getActionBadge = (action) => {
        const colors = {
            view: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
            download: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
            practice: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
            save: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
            revisit: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
        };
        return <Badge className={colors[action] || 'bg-gray-100 text-gray-700'}>{action}</Badge>;
    };

    const StatCard = ({ title, value, icon: Icon, description }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );

    // Get user display name - only show users with actual profiles
    const getUserDisplayName = (userId) => {
        if (!userId) return null; // Skip anonymous users
        return profiles[userId] || null; // Return null if no profile found
    };

    // Group sessions by user (excluding anonymous)
    const getGroupedSessions = () => {
        const grouped = {};
        
        userSessions.forEach(session => {
            if (!session.user_id) return; // Skip sessions without user_id
            
            const userName = profiles[session.user_id];
            if (!userName) return; // Skip if user not found in profiles
            
            if (!grouped[session.user_id]) {
                grouped[session.user_id] = {
                    userName,
                    userId: session.user_id,
                    sessions: [],
                    totalDuration: 0,
                    sessionCount: 0
                };
            }
            
            grouped[session.user_id].sessions.push(session);
            grouped[session.user_id].totalDuration += session.duration_seconds || 0;
            grouped[session.user_id].sessionCount += 1;
        });

        // Filter by search term
        return Object.values(grouped).filter(user => 
            !searchTerm || user.userName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    // Group behavior events by user (excluding anonymous)
    const getGroupedBehaviorEvents = () => {
        const grouped = {};
        
        behaviorEvents.forEach(event => {
            if (!event.user_id) return;
            
            const userName = profiles[event.user_id];
            if (!userName) return;
            
            if (!grouped[event.user_id]) {
                grouped[event.user_id] = {
                    userName,
                    userId: event.user_id,
                    events: [],
                    eventCount: 0
                };
            }
            
            grouped[event.user_id].events.push(event);
            grouped[event.user_id].eventCount += 1;
        });

        return Object.values(grouped).filter(user => 
            !searchTerm || user.userName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    return (
        <>
            <Helmet>
                <title>Tracking User - Admin Dashboard</title>
                <meta name="description" content="View user tracking analytics and behavior data." />
            </Helmet>
            <Navigation />
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Activity className="h-8 w-8 text-primary" />
                        Tracking User
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor user behavior, pattern usage, and performance metrics.
                    </p>
                </header>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <StatCard title="Pattern Views" value={stats.totalViews} icon={Eye} />
                    <StatCard title="Downloads" value={stats.totalDownloads} icon={Download} />
                    <StatCard title="Sessions" value={stats.totalSessions} icon={Users} />
                    <StatCard title="Avg Duration" value={`${stats.avgSessionDuration}s`} icon={Clock} />
                    <StatCard title="Errors" value={stats.errorCount} icon={AlertTriangle} />
                </div>

                {/* Search */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by user or pattern..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button variant="outline" onClick={fetchData} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Refresh
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="pattern-events" className="flex items-center gap-2">
                            <Eye className="h-4 w-4" /> Pattern Events
                        </TabsTrigger>
                        <TabsTrigger value="sessions" className="flex items-center gap-2">
                            <Users className="h-4 w-4" /> User Sessions
                        </TabsTrigger>
                        <TabsTrigger value="behavior" className="flex items-center gap-2">
                            <MousePointer className="h-4 w-4" /> Behavior
                        </TabsTrigger>
                        <TabsTrigger value="performance" className="flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Performance
                        </TabsTrigger>
                    </TabsList>

                    {/* Pattern Events Tab */}
                    <TabsContent value="pattern-events">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pattern Events</CardTitle>
                                <CardDescription>Track views, downloads, saves, and practice sessions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Action</TableHead>
                                                <TableHead>Association</TableHead>
                                                <TableHead>Discipline</TableHead>
                                                <TableHead>Time Spent</TableHead>
                                                <TableHead>Device</TableHead>
                                                <TableHead>Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {patternEvents.filter(e => {
                                                const userName = getUserDisplayName(e.user_id);
                                                if (!userName) return false; // Hide anonymous/unknown users
                                                return !searchTerm || 
                                                    userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    e.discipline?.toLowerCase().includes(searchTerm.toLowerCase());
                                            }).map((event) => (
                                                <TableRow key={event.id}>
                                                    <TableCell className="font-medium">{profiles[event.user_id]}</TableCell>
                                                    <TableCell>{getActionBadge(event.action)}</TableCell>
                                                    <TableCell>{event.association_id || '-'}</TableCell>
                                                    <TableCell>{event.discipline || '-'}</TableCell>
                                                    <TableCell>{event.time_spent_seconds ? `${event.time_spent_seconds}s` : '-'}</TableCell>
                                                    <TableCell className="flex items-center gap-1">{getDeviceIcon(event.device_type)}{event.device_type || 'Unknown'}</TableCell>
                                                    <TableCell>{format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                                                </TableRow>
                                            ))}
                                            {patternEvents.filter(e => getUserDisplayName(e.user_id)).length === 0 && (
                                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pattern events recorded yet.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Sessions Tab - Grouped by User */}
                    <TabsContent value="sessions">
                        <Card>
                            <CardHeader>
                                <CardTitle>User Sessions</CardTitle>
                                <CardDescription>Monitor login timestamps and session durations grouped by user.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                ) : getGroupedSessions().length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No user sessions recorded yet.</div>
                                ) : (
                                    <Accordion type="single" collapsible className="w-full">
                                        {getGroupedSessions().map((userGroup) => (
                                            <AccordionItem key={userGroup.userId} value={userGroup.userId}>
                                                <AccordionTrigger className="hover:no-underline">
                                                    <div className="flex items-center justify-between w-full pr-4">
                                                        <div className="flex items-center gap-3">
                                                            <Users className="h-5 w-5 text-primary" />
                                                            <span className="font-semibold">{userGroup.userName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <Badge variant="outline" className="text-xs">
                                                                {userGroup.sessionCount} session{userGroup.sessionCount !== 1 ? 's' : ''}
                                                            </Badge>
                                                            <Badge variant="secondary" className="text-xs">
                                                                Total: {Math.round(userGroup.totalDuration / 60)} min
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Session Start</TableHead>
                                                                <TableHead>Session End</TableHead>
                                                                <TableHead>Duration</TableHead>
                                                                <TableHead>Device</TableHead>
                                                                <TableHead>Browser</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {userGroup.sessions.map((session) => (
                                                                <TableRow key={session.id}>
                                                                    <TableCell>{format(new Date(session.session_start), 'MMM d, yyyy HH:mm')}</TableCell>
                                                                    <TableCell>{session.session_end ? format(new Date(session.session_end), 'MMM d, yyyy HH:mm') : <Badge variant="outline">Active</Badge>}</TableCell>
                                                                    <TableCell>{session.duration_seconds ? `${Math.round(session.duration_seconds / 60)} min` : '-'}</TableCell>
                                                                    <TableCell className="flex items-center gap-1">{getDeviceIcon(session.device_type)}{session.device_type || 'Unknown'}</TableCell>
                                                                    <TableCell>{session.browser || '-'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Behavior Tab */}
                    <TabsContent value="behavior">
                        <Card>
                            <CardHeader>
                                <CardTitle>Behavior Events</CardTitle>
                                <CardDescription>Track page views, clicks, search terms, and navigation flows.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                ) : getGroupedBehaviorEvents().length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No behavior events recorded yet.</div>
                                ) : (
                                    <Accordion type="single" collapsible className="w-full">
                                        {getGroupedBehaviorEvents().map((userGroup) => (
                                            <AccordionItem key={userGroup.userId} value={userGroup.userId}>
                                                <AccordionTrigger className="hover:no-underline">
                                                    <div className="flex items-center justify-between w-full pr-4">
                                                        <div className="flex items-center gap-3">
                                                            <MousePointer className="h-5 w-5 text-primary" />
                                                            <span className="font-semibold">{userGroup.userName}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-xs">
                                                            {userGroup.eventCount} event{userGroup.eventCount !== 1 ? 's' : ''}
                                                        </Badge>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Event Type</TableHead>
                                                                <TableHead>Page</TableHead>
                                                                <TableHead>Event Data</TableHead>
                                                                <TableHead>Date</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {userGroup.events.map((event) => (
                                                                <TableRow key={event.id}>
                                                                    <TableCell><Badge variant="outline">{event.event_type}</Badge></TableCell>
                                                                    <TableCell className="max-w-[200px] truncate">{event.page_path || '-'}</TableCell>
                                                                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                                                        {event.event_data ? JSON.stringify(event.event_data) : '-'}
                                                                    </TableCell>
                                                                    <TableCell>{format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Performance Tab */}
                    <TabsContent value="performance">
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance Logs</CardTitle>
                                <CardDescription>Monitor page load times, API latency, and errors.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Metric</TableHead>
                                                <TableHead>Page</TableHead>
                                                <TableHead>Load Time</TableHead>
                                                <TableHead>Error</TableHead>
                                                <TableHead>Device</TableHead>
                                                <TableHead>Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {performanceLogs.filter(l => {
                                                const userName = getUserDisplayName(l.user_id);
                                                if (!userName) return false; // Hide anonymous/unknown users
                                                return !searchTerm || 
                                                    userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    l.page_path?.toLowerCase().includes(searchTerm.toLowerCase());
                                            }).map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-medium">{profiles[log.user_id]}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={log.metric_type === 'error' ? 'destructive' : 'outline'}>
                                                            {log.metric_type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-[150px] truncate">{log.page_path || '-'}</TableCell>
                                                    <TableCell>{log.load_time_ms ? `${log.load_time_ms}ms` : '-'}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                                                        {log.error_message || '-'}
                                                    </TableCell>
                                                    <TableCell className="flex items-center gap-1">{getDeviceIcon(log.device_type)}{log.device_type || 'Unknown'}</TableCell>
                                                    <TableCell>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                                                </TableRow>
                                            ))}
                                            {performanceLogs.filter(l => getUserDisplayName(l.user_id)).length === 0 && (
                                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No performance logs recorded yet.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </>
    );
};

export default AdminTrackingUserPage;
