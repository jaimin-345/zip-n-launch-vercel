import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
    Gavel, FileText, Search, Star, BookOpen, Download, Eye, 
    ZoomIn, Heart, X, Plus, Trash2, Edit, Save, Loader2,
    ExternalLink, Filter, Clock, Package, StickyNote, Bell
} from 'lucide-react';
import JudgeNotificationPanel from '@/components/JudgeNotificationPanel';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { fetchAssociations } from '@/lib/associationsData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// Admin email that has full access
const ADMIN_EMAIL = 'johndoe@mailinator.com';

const JudgesPortalPage = () => {
    const { user, updateUserProfile } = useAuth();
    const { toast } = useToast();
    
    // Check if current user is admin (has full access)
    const isAdminUser = user?.email === ADMIN_EMAIL;
    
    // Judge Profile State
    const [isCardedJudge, setIsCardedJudge] = useState(false);
    const [cardedAssociations, setCardedAssociations] = useState([]);
    const [displayCardedAssociationsPublicly, setDisplayCardedAssociationsPublicly] = useState(false);
    const [associationsData, setAssociationsData] = useState([]);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    
    // Tab State
    const [activeTab, setActiveTab] = useState('scoresheets');
    
    // Assigned Projects State (for non-admin judges)
    const [assignedProjects, setAssignedProjects] = useState([]);
    const [assignedProjectData, setAssignedProjectData] = useState([]);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    
    // Quick Score Sheet Finder State
    const [scoresheetFilters, setScoresheetFilters] = useState({
        association: 'all',
        discipline: 'all',
        type: 'all' // 'general', 'rulebook', 'custom'
    });
    const [scoresheets, setScoresheets] = useState([]);
    const [filteredScoresheets, setFilteredScoresheets] = useState([]);
    const [isLoadingScoresheets, setIsLoadingScoresheets] = useState(false);
    const [scoresheetFavorites, setScoresheetFavorites] = useState([]);
    
    // Association Rulebook Pattern Finder State
    const [patternFilters, setPatternFilters] = useState({
        association: 'all',
        discipline: 'all',
        searchTerm: ''
    });
    const [patterns, setPatterns] = useState([]);
    const [filteredPatterns, setFilteredPatterns] = useState([]);
    const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
    const [patternFavorites, setPatternFavorites] = useState([]);
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [patternImage, setPatternImage] = useState(null);
    
    // Judge Favorite Patterns State
    const [favoritePatterns, setFavoritePatterns] = useState([]);
    const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
    const [isFavoriteDialogOpen, setIsFavoriteDialogOpen] = useState(false);
    const [editingFavorite, setEditingFavorite] = useState(null);
    const [favoriteForm, setFavoriteForm] = useState({
        association_id: '',
        discipline_id: '',
        class_id: '',
        pattern_id: '',
        rank: 1,
        creator_note: ''
    });
    
    // Disciplines State
    const [disciplines, setDisciplines] = useState([]);
    
    // Quick Links State
    const [recentScoresheets, setRecentScoresheets] = useState([]);
    const [recentPatterns, setRecentPatterns] = useState([]);
    
    // Fetch assigned projects for non-admin judges
    useEffect(() => {
        const fetchAssignedProjects = async () => {
            if (!user?.email || isAdminUser) return;
            
            setIsLoadingAssignments(true);
            try {
                // Get notifications for this judge
                const { data: notifications, error: notifError } = await supabase
                    .from('judge_notifications')
                    .select('project_id, project_name')
                    .eq('judge_email', user.email);
                
                if (notifError) throw notifError;
                
                const projectIds = [...new Set(notifications?.map(n => n.project_id) || [])];
                setAssignedProjects(projectIds);
                
                // Fetch project data to get patterns/scoresheets
                if (projectIds.length > 0) {
                    const { data: projects, error: projError } = await supabase
                        .from('projects')
                        .select('id, project_name, project_data')
                        .in('id', projectIds);
                    
                    if (projError) throw projError;
                    setAssignedProjectData(projects || []);
                }
            } catch (error) {
                console.error('Error fetching assigned projects:', error);
            } finally {
                setIsLoadingAssignments(false);
            }
        };
        
        fetchAssignedProjects();
    }, [user?.email, isAdminUser]);
    
    // Load user profile data
    useEffect(() => {
        if (user) {
            const meta = user.user_metadata || {};
            setIsCardedJudge(meta.isCardedJudge || false);
            setCardedAssociations(meta.cardedAssociations || []);
            setDisplayCardedAssociationsPublicly(meta.displayCardedAssociationsPublicly || false);
        }
    }, [user]);
    
    // Fetch associations
    useEffect(() => {
        const loadAssociations = async () => {
            const data = await fetchAssociations();
            setAssociationsData(data || []);
        };
        loadAssociations();
    }, []);
    
    // Fetch disciplines
    useEffect(() => {
        const fetchDisciplines = async () => {
            const { data, error } = await supabase
                .from('disciplines')
                .select('id, name, association_id')
                .order('name');
            
            if (error) {
                console.error('Error fetching disciplines:', error);
            } else {
                setDisciplines(data || []);
            }
        };
        fetchDisciplines();
    }, []);
    
    // Save judge profile
    const handleSaveJudgeProfile = async () => {
        if (!user) return;
        
        setIsSavingProfile(true);
        try {
            const metadata = {
                ...user.user_metadata,
                isCardedJudge,
                cardedAssociations,
                displayCardedAssociationsPublicly
            };
            
            await updateUserProfile(metadata);
            toast({
                title: 'Profile Updated',
                description: 'Your judge profile has been saved successfully.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save judge profile. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSavingProfile(false);
        }
    };
    
    const toggleCardedAssociation = (assocId) => {
        setCardedAssociations(prev => 
            prev.includes(assocId) ? prev.filter(a => a !== assocId) : [...prev, assocId]
        );
    };
    
    // Fetch scoresheets
    useEffect(() => {
        const fetchScoresheets = async () => {
            setIsLoadingScoresheets(true);
            try {
                const { data, error } = await supabase
                    .from('tbl_scoresheet')
                    .select('*, pattern:tbl_patterns(id, pdf_file_name, association_name, discipline, pattern_version)')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                setScoresheets(data || []);
            } catch (error) {
                console.error('Error fetching scoresheets:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load scoresheets.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoadingScoresheets(false);
            }
        };
        
        if (activeTab === 'scoresheets') {
            fetchScoresheets();
        }
    }, [activeTab, toast]);
    
    // Filter scoresheets based on user type
    useEffect(() => {
        if (scoresheets.length === 0) {
            setFilteredScoresheets([]);
            return;
        }
        
        let baseList = scoresheets;
        
        // For non-admin users, filter to only assigned project scoresheets
        if (!isAdminUser && assignedProjectData.length > 0) {
            // Extract pattern IDs from assigned projects
            const assignedPatternIds = new Set();
            const assignedAssociations = new Set();
            const assignedDisciplines = new Set();
            
            assignedProjectData.forEach(project => {
                const data = project.project_data;
                
                // Extract pattern IDs from patternSelections (correct field name)
                if (data?.patternSelections) {
                    Object.values(data.patternSelections).forEach(disciplinePatterns => {
                        if (typeof disciplinePatterns === 'object') {
                            Object.values(disciplinePatterns).forEach(patternData => {
                                if (patternData?.patternId) {
                                    assignedPatternIds.add(Number(patternData.patternId));
                                }
                            });
                        }
                    });
                }
                
                // Extract associations from associations object
                if (data?.associations) {
                    Object.keys(data.associations).forEach(assocKey => {
                        if (data.associations[assocKey]) {
                            assignedAssociations.add(assocKey);
                        }
                    });
                }
                
                // Extract disciplines from disciplines array
                if (data?.disciplines && Array.isArray(data.disciplines)) {
                    data.disciplines.forEach(disc => {
                        if (disc?.name) assignedDisciplines.add(disc.name);
                    });
                }
            });
            
            // Filter scoresheets to those matching assigned patterns/associations
            baseList = scoresheets.filter(s => {
                const patternMatch = s.pattern_id && assignedPatternIds.has(Number(s.pattern_id));
                // Match if association_abbrev starts with the assigned association code
                const assocMatch = Array.from(assignedAssociations).some(assoc => 
                    s.association_abbrev?.startsWith(assoc) || 
                    s.pattern?.association_name?.startsWith(assoc)
                );
                // Match discipline
                const discMatch = Array.from(assignedDisciplines).some(disc =>
                    s.discipline?.toLowerCase() === disc.toLowerCase() ||
                    s.pattern?.discipline?.toLowerCase() === disc.toLowerCase()
                );
                return patternMatch || (assocMatch && discMatch);
            });
        } else if (!isAdminUser && assignedProjects.length === 0 && !isLoadingAssignments) {
            // No assignments - show empty
            setFilteredScoresheets([]);
            return;
        }
        
        const filtered = baseList.filter(s => {
            const assoc = s.association_abbrev || s.pattern?.association_name;
            const disc = s.discipline || s.pattern?.discipline;
            const hasPattern = !!s.pattern_id;
            
            const matchAssoc = scoresheetFilters.association === 'all' || assoc === scoresheetFilters.association;
            const matchDisc = scoresheetFilters.discipline === 'all' || disc === scoresheetFilters.discipline;
            
            let matchType = true;
            if (scoresheetFilters.type === 'rulebook' && !hasPattern) matchType = false;
            if (scoresheetFilters.type === 'custom' && hasPattern) matchType = false;
            if (scoresheetFilters.type === 'general' && hasPattern) matchType = false;
            
            return matchAssoc && matchDisc && matchType;
        });
        
        setFilteredScoresheets(filtered);
    }, [scoresheets, scoresheetFilters, isAdminUser, assignedProjectData, assignedProjects, isLoadingAssignments]);
    
    // Fetch patterns
    useEffect(() => {
        const fetchPatterns = async () => {
            setIsLoadingPatterns(true);
            try {
                const { data, error } = await supabase
                    .from('tbl_patterns')
                    .select('id, pdf_file_name, association_name, discipline, pattern_version')
                    .order('pdf_file_name');
                
                if (error) throw error;
                setPatterns(data || []);
            } catch (error) {
                console.error('Error fetching patterns:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load patterns.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoadingPatterns(false);
            }
        };
        
        if (activeTab === 'patterns') {
            fetchPatterns();
        }
    }, [activeTab, toast]);
    
    // Filter patterns based on user type
    useEffect(() => {
        if (patterns.length === 0) {
            setFilteredPatterns([]);
            return;
        }
        
        let baseList = patterns;
        
        // For non-admin users, filter to only assigned project patterns
        if (!isAdminUser && assignedProjectData.length > 0) {
            const assignedPatternIds = new Set();
            const assignedAssociations = new Set();
            const assignedDisciplines = new Set();
            
            assignedProjectData.forEach(project => {
                const data = project.project_data;
                
                // Extract pattern IDs from patternSelections (correct field name)
                if (data?.patternSelections) {
                    Object.values(data.patternSelections).forEach(disciplinePatterns => {
                        if (typeof disciplinePatterns === 'object') {
                            Object.values(disciplinePatterns).forEach(patternData => {
                                if (patternData?.patternId) {
                                    assignedPatternIds.add(Number(patternData.patternId));
                                }
                            });
                        }
                    });
                }
                
                // Extract associations from associations object
                if (data?.associations) {
                    Object.keys(data.associations).forEach(assocKey => {
                        if (data.associations[assocKey]) {
                            assignedAssociations.add(assocKey);
                        }
                    });
                }
                
                // Extract disciplines from disciplines array
                if (data?.disciplines && Array.isArray(data.disciplines)) {
                    data.disciplines.forEach(disc => {
                        if (disc?.name) assignedDisciplines.add(disc.name);
                    });
                }
            });
            
            // Filter patterns to those matching assigned projects
            baseList = patterns.filter(p => {
                const patternMatch = assignedPatternIds.has(Number(p.id));
                // Match if association_name starts with the assigned association code
                const assocMatch = Array.from(assignedAssociations).some(assoc => 
                    p.association_name?.startsWith(assoc)
                );
                // Match discipline
                const discMatch = Array.from(assignedDisciplines).some(disc =>
                    p.discipline?.toLowerCase() === disc.toLowerCase()
                );
                return patternMatch || (assocMatch && discMatch);
            });
        } else if (!isAdminUser && assignedProjects.length === 0 && !isLoadingAssignments) {
            // No assignments - show empty
            setFilteredPatterns([]);
            return;
        }
        
        const filtered = baseList.filter(p => {
            const matchAssoc = patternFilters.association === 'all' || 
                p.association_name === patternFilters.association;
            const matchDisc = patternFilters.discipline === 'all' || 
                p.discipline === patternFilters.discipline;
            const matchSearch = !patternFilters.searchTerm || 
                p.pdf_file_name?.toLowerCase().includes(patternFilters.searchTerm.toLowerCase()) ||
                p.discipline?.toLowerCase().includes(patternFilters.searchTerm.toLowerCase());
            
            return matchAssoc && matchDisc && matchSearch;
        });
        
        setFilteredPatterns(filtered);
    }, [patterns, patternFilters, isAdminUser, assignedProjectData, assignedProjects, isLoadingAssignments]);
    
    // Fetch pattern image
    useEffect(() => {
        const fetchPatternImage = async () => {
            if (!selectedPattern) {
                setPatternImage(null);
                return;
            }
            
            try {
                const { data, error } = await supabase
                    .from('tbl_pattern_media')
                    .select('image_url')
                    .eq('pattern_id', selectedPattern.id)
                    .maybeSingle();
                
                if (error) throw error;
                setPatternImage(data?.image_url || null);
            } catch (error) {
                console.error('Error fetching pattern image:', error);
                setPatternImage(null);
            }
        };
        
        fetchPatternImage();
    }, [selectedPattern]);
    
    // Fetch judge favorites - table may not exist yet
    useEffect(() => {
        const fetchFavorites = async () => {
            if (!user) return;
            
            setIsLoadingFavorites(true);
            try {
                const { data, error } = await supabase
                    .from('judge_favorites')
                    .select('*')
                    .eq('judge_id', user.id)
                    .order('created_at', { ascending: false });
                
                // If table doesn't exist, just set empty array
                if (error && error.code === 'PGRST205') {
                    setFavoritePatterns([]);
                    return;
                }
                if (error) throw error;
                setFavoritePatterns(data || []);
            } catch (error) {
                console.error('Error fetching favorites:', error);
                setFavoritePatterns([]);
            } finally {
                setIsLoadingFavorites(false);
            }
        };
        
        if (activeTab === 'favorites' && user) {
            fetchFavorites();
        }
    }, [activeTab, user]);
    
    // Get unique associations from scoresheets
    const scoresheetAssociations = useMemo(() => {
        const assocs = new Set();
        scoresheets.forEach(s => {
            const assoc = s.association_abbrev || s.pattern?.association_name;
            if (assoc) assocs.add(assoc);
        });
        return Array.from(assocs).sort();
    }, [scoresheets]);
    
    // Get unique disciplines from scoresheets
    const scoresheetDisciplines = useMemo(() => {
        const discs = new Set();
        scoresheets.forEach(s => {
            const disc = s.discipline || s.pattern?.discipline;
            if (disc) discs.add(disc);
        });
        return Array.from(discs).sort();
    }, [scoresheets]);
    
    // Get unique associations from patterns
    const patternAssociations = useMemo(() => {
        const assocs = new Set();
        patterns.forEach(p => {
            if (p.association_name) assocs.add(p.association_name);
        });
        return Array.from(assocs).sort();
    }, [patterns]);
    
    // Get unique disciplines from patterns
    const patternDisciplines = useMemo(() => {
        const discs = new Set();
        patterns.forEach(p => {
            if (p.discipline) discs.add(p.discipline);
        });
        return Array.from(discs).sort();
    }, [patterns]);
    
    // Handle scoresheet actions
    const handleViewScoresheet = (scoresheet) => {
        if (scoresheet.image_url) {
            window.open(scoresheet.image_url, '_blank');
        } else {
            toast({
                title: 'No Preview Available',
                description: 'This scoresheet does not have a preview image.',
            });
        }
    };
    
    const handleDownloadScoresheet = async (scoresheet) => {
        // Use image_url as the primary source (full public URL)
        const url = scoresheet.image_url;
        
        if (!url) {
            toast({
                title: 'Download Unavailable',
                description: 'This scoresheet does not have a downloadable file.',
                variant: 'destructive',
            });
            return;
        }
        
        try {
            // Fetch the file and create a blob for proper download
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch file');
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Determine filename from storage_path or URL
            let fileName = 'scoresheet.png';
            if (scoresheet.storage_path) {
                fileName = scoresheet.storage_path.split('/').pop() || fileName;
            } else if (scoresheet.file_name) {
                fileName = scoresheet.file_name;
            } else {
                // Extract from URL
                const urlParts = url.split('/');
                fileName = urlParts[urlParts.length - 1] || fileName;
            }
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up blob URL
            window.URL.revokeObjectURL(blobUrl);
            
            toast({
                title: 'Download Started',
                description: `Downloading ${fileName}`,
            });
        } catch (error) {
            console.error('Download error:', error);
            toast({
                title: 'Download Failed',
                description: 'Could not download the scoresheet. Please try again.',
                variant: 'destructive',
            });
        }
    };
    
    const handleToggleScoresheetFavorite = (scoresheetId) => {
        setScoresheetFavorites(prev => 
            prev.includes(scoresheetId) 
                ? prev.filter(id => id !== scoresheetId)
                : [...prev, scoresheetId]
        );
        toast({
            title: scoresheetFavorites.includes(scoresheetId) ? 'Removed from Favorites' : 'Added to Favorites',
        });
    };
    
    // Handle pattern actions
    const handleViewPattern = (pattern) => {
        setSelectedPattern(pattern);
    };
    
    const handleTogglePatternFavorite = (patternId) => {
        setPatternFavorites(prev => 
            prev.includes(patternId) 
                ? prev.filter(id => id !== patternId)
                : [...prev, patternId]
        );
        toast({
            title: patternFavorites.includes(patternId) ? 'Removed from Favorites' : 'Added to Favorites',
        });
    };
    
    // Handle favorite patterns
    const handleAddFavorite = () => {
        setEditingFavorite(null);
        setFavoriteForm({
            association_id: '',
            discipline_id: '',
            class_id: '',
            pattern_id: '',
            rank: 1,
            creator_note: ''
        });
        setIsFavoriteDialogOpen(true);
    };
    
    const handleEditFavorite = (favorite) => {
        setEditingFavorite(favorite);
        setFavoriteForm({
            association_id: favorite.association_id,
            discipline_id: favorite.discipline_id,
            class_id: favorite.class_id,
            pattern_id: favorite.pattern_id,
            rank: favorite.rank,
            creator_note: favorite.creator_note || ''
        });
        setIsFavoriteDialogOpen(true);
    };
    
    const handleSaveFavorite = async () => {
        if (!user) return;
        
        try {
            if (editingFavorite) {
                // Update existing
                const { error } = await supabase
                    .from('judge_favorites')
                    .update({
                        pattern_id: favoriteForm.pattern_id,
                        rank: favoriteForm.rank,
                        creator_note: favoriteForm.creator_note,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingFavorite.id);
                
                if (error) throw error;
                toast({ title: 'Favorite Updated', description: 'Your favorite pattern has been updated.' });
            } else {
                // Check if already 3 favorites for this context
                const existing = favoritePatterns.filter(f => 
                    f.association_id === favoriteForm.association_id &&
                    f.discipline_id === favoriteForm.discipline_id &&
                    f.class_id === favoriteForm.class_id
                );
                
                if (existing.length >= 3) {
                    toast({
                        title: 'Limit Reached',
                        description: 'You can only have 3 favorite patterns per Association + Discipline + Class combination.',
                        variant: 'destructive',
                    });
                    return;
                }
                
                // Check if rank is already taken
                const rankTaken = existing.some(f => f.rank === favoriteForm.rank);
                if (rankTaken) {
                    toast({
                        title: 'Rank Taken',
                        description: 'This rank is already assigned. Please choose a different rank (1-3).',
                        variant: 'destructive',
                    });
                    return;
                }
                
                // Create new
                const { error } = await supabase
                    .from('judge_favorites')
                    .insert({
                        judge_id: user.id,
                        association_id: favoriteForm.association_id,
                        discipline_id: favoriteForm.discipline_id,
                        class_id: favoriteForm.class_id,
                        pattern_id: favoriteForm.pattern_id,
                        rank: favoriteForm.rank,
                        creator_note: favoriteForm.creator_note
                    });
                
                if (error) throw error;
                toast({ title: 'Favorite Added', description: 'Pattern added to your favorites.' });
            }
            
            // Refresh favorites
            const { data, error } = await supabase
                .from('judge_favorites')
                .select('*')
                .eq('judge_id', user.id)
                .order('created_at', { ascending: false });
            
            if (!error) setFavoritePatterns(data || []);
            
            setIsFavoriteDialogOpen(false);
        } catch (error) {
            console.error('Error saving favorite:', error);
            toast({
                title: 'Error',
                description: 'Failed to save favorite. Please try again.',
                variant: 'destructive',
            });
        }
    };
    
    const handleDeleteFavorite = async (favoriteId) => {
        try {
            const { error } = await supabase
                .from('judge_favorites')
                .delete()
                .eq('id', favoriteId);
            
            if (error) throw error;
            
            setFavoritePatterns(prev => prev.filter(f => f.id !== favoriteId));
            toast({ title: 'Favorite Removed', description: 'Pattern removed from your favorites.' });
        } catch (error) {
            console.error('Error deleting favorite:', error);
            toast({
                title: 'Error',
                description: 'Failed to remove favorite. Please try again.',
                variant: 'destructive',
            });
        }
    };
    
    // Get filtered disciplines for favorite form
    const favoriteFormDisciplines = useMemo(() => {
        if (!favoriteForm.association_id) return [];
        return disciplines.filter(d => d.association_id === favoriteForm.association_id);
    }, [favoriteForm.association_id, disciplines]);
    
    // Get filtered patterns for favorite form
    const favoriteFormPatterns = useMemo(() => {
        if (!favoriteForm.association_id || !favoriteForm.discipline_id) return [];
        return patterns.filter(p => 
            p.association_name === favoriteForm.association_id &&
            p.discipline === favoriteFormDisciplines.find(d => d.id === favoriteForm.discipline_id)?.name
        );
    }, [favoriteForm.association_id, favoriteForm.discipline_id, patterns, favoriteFormDisciplines]);
    
    return (
        <>
            <Helmet>
                <title>Judge's Toolbox - EquiPatterns</title>
                <meta name="description" content="Portal for judges to access patterns, scoresheets, and manage judge resources." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-7xl mx-auto space-y-6"
                    >
                        {/* Header with Notification Bell */}
                        <div className="relative mb-8">
                            {/* Notification Bell - Top Right */}
                            <div className="absolute right-0 top-0">
                                <JudgeNotificationPanel userEmail={user?.email} />
                            </div>
                            
                            <div className="text-center">
                                <motion.div
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6"
                                >
                                    <Gavel className="h-10 w-10 text-primary" />
                                </motion.div>
                                <h1 className="text-4xl font-bold mb-4">🧰 Judge's Toolbox</h1>
                                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                    Your dedicated portal for accessing patterns, scoresheets, and managing your judge resources.
                                </p>
                            </div>
                        </div>

                        {/* Judge Profile Setup & Verification */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Gavel className="h-5 w-5" />
                                    Judge Profile Setup & Verification
                                </CardTitle>
                                <CardDescription>
                                    Verify your judge status and carded associations
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/30">
                                    <Checkbox
                                        id="is-carded-judge"
                                        checked={isCardedJudge}
                                        onCheckedChange={(checked) => setIsCardedJudge(checked)}
                                    />
                                    <Label htmlFor="is-carded-judge" className="text-base font-medium cursor-pointer">
                                        I am a carded judge
                                    </Label>
                                </div>

                                {isCardedJudge && (
                                    <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Association(s)</Label>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Select the associations you are carded with
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {associationsData.map(assoc => (
                                                    <div key={assoc.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`carded-assoc-${assoc.id}`}
                                                            checked={cardedAssociations.includes(assoc.id)}
                                                            onCheckedChange={() => toggleCardedAssociation(assoc.id)}
                                                        />
                                                        <Label 
                                                            htmlFor={`carded-assoc-${assoc.id}`} 
                                                            className="text-sm cursor-pointer"
                                                        >
                                                            {assoc.name || assoc.id}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                            {cardedAssociations.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {cardedAssociations.map(assocId => {
                                                        const assoc = associationsData.find(a => a.id === assocId);
                                                        return (
                                                            <Badge 
                                                                key={assocId}
                                                                variant="secondary"
                                                                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                                                onClick={() => toggleCardedAssociation(assocId)}
                                                            >
                                                                {assoc?.name || assocId} ×
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/20">
                                            <Checkbox
                                                id="display-carded-publicly"
                                                checked={displayCardedAssociationsPublicly}
                                                onCheckedChange={(checked) => setDisplayCardedAssociationsPublicly(checked)}
                                            />
                                            <div className="flex-1">
                                                <Label htmlFor="display-carded-publicly" className="text-sm font-medium cursor-pointer">
                                                    Publicly display my carded associations
                                                </Label>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    When enabled, your carded associations will be visible to show managers
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <Button 
                                            onClick={handleSaveJudgeProfile} 
                                            disabled={isSavingProfile}
                                            className="w-full sm:w-auto"
                                        >
                                            {isSavingProfile ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Save Profile
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Non-admin user notice */}
                        {!isAdminUser && (
                            <Card className="mb-4 border-primary/30 bg-primary/5">
                                <CardContent className="py-4">
                                    <div className="flex items-center gap-3">
                                        <Bell className="h-5 w-5 text-primary" />
                                        <div>
                                            <p className="font-medium text-sm">Assigned Content View</p>
                                            <p className="text-xs text-muted-foreground">
                                                You're viewing scoresheets and patterns from your assigned shows. 
                                                {assignedProjects.length > 0 
                                                    ? ` (${assignedProjects.length} assignment${assignedProjects.length > 1 ? 's' : ''})` 
                                                    : ' Check notifications for new assignments.'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Main Toolbox Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="scoresheets">
                                    <FileText className="mr-2 h-4 w-4" />
                                    {isAdminUser ? 'Quick Score Sheet Finder' : 'Assigned Score Sheets'}
                                </TabsTrigger>
                                <TabsTrigger value="patterns">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    {isAdminUser ? 'Pattern Finder' : 'Assigned Patterns'}
                                </TabsTrigger>
                                <TabsTrigger value="favorites">
                                    <Star className="mr-2 h-4 w-4" />
                                    Favorite Patterns
                                </TabsTrigger>
                            </TabsList>

                            {/* Tab A: Quick Score Sheet Finder */}
                            <TabsContent value="scoresheets" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{isAdminUser ? 'Quick Score Sheet Finder' : 'Assigned Score Sheets'}</CardTitle>
                                        <CardDescription>
                                            {isAdminUser 
                                                ? 'Find the correct score sheet instantly with filters'
                                                : 'Score sheets from your assigned shows'
                                            }
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Loading state for assignments */}
                                        {!isAdminUser && isLoadingAssignments ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <span className="ml-2 text-muted-foreground">Loading assignments...</span>
                                            </div>
                                        ) : (
                                            <>
                                        {/* Filters */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Association</Label>
                                                <Select 
                                                    value={scoresheetFilters.association}
                                                    onValueChange={(value) => setScoresheetFilters(prev => ({ ...prev, association: value }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="All Associations" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Associations</SelectItem>
                                                        {scoresheetAssociations.map(assoc => (
                                                            <SelectItem key={assoc} value={assoc}>{assoc}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label>Discipline / Division</Label>
                                                <Select 
                                                    value={scoresheetFilters.discipline}
                                                    onValueChange={(value) => setScoresheetFilters(prev => ({ ...prev, discipline: value }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="All Disciplines" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Disciplines</SelectItem>
                                                        {scoresheetDisciplines.map(disc => (
                                                            <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label>Score Sheet Type</Label>
                                                <Select 
                                                    value={scoresheetFilters.type}
                                                    onValueChange={(value) => setScoresheetFilters(prev => ({ ...prev, type: value }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="All Types" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Types</SelectItem>
                                                        <SelectItem value="general">General</SelectItem>
                                                        <SelectItem value="rulebook">Rulebook Pattern</SelectItem>
                                                        <SelectItem value="custom">Custom Pattern</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Results */}
                                        {isLoadingScoresheets ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : filteredScoresheets.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                <p>No scoresheets found matching your filters.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {filteredScoresheets.map(scoresheet => (
                                                    <Card key={scoresheet.id} className="hover:shadow-md transition-shadow">
                                                        <CardContent className="p-4 space-y-3">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <h4 className="font-semibold text-sm">
                                                                        {scoresheet.discipline || scoresheet.pattern?.discipline || 'Scoresheet'}
                                                                    </h4>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {scoresheet.association_abbrev || scoresheet.pattern?.association_name || 'Unknown'}
                                                                    </p>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => handleToggleScoresheetFavorite(scoresheet.id)}
                                                                >
                                                                    <Heart 
                                                                        className={`h-4 w-4 ${
                                                                            scoresheetFavorites.includes(scoresheet.id) 
                                                                                ? 'fill-red-500 text-red-500' 
                                                                                : ''
                                                                        }`} 
                                                                    />
                                                                </Button>
                                                            </div>
                                                            
                                                            {scoresheet.image_url && (
                                                                <div className="rounded-md overflow-hidden border bg-muted/20">
                                                                    <img 
                                                                        src={scoresheet.image_url} 
                                                                        alt="Scoresheet Preview" 
                                                                        className="w-full h-auto max-h-32 object-contain"
                                                                    />
                                                                </div>
                                                            )}
                                                            
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex-1"
                                                                    onClick={() => handleViewScoresheet(scoresheet)}
                                                                >
                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                    View PDF
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex-1"
                                                                    onClick={() => handleDownloadScoresheet(scoresheet)}
                                                                >
                                                                    <Download className="mr-2 h-4 w-4" />
                                                                    Download
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Tab B: Association Rulebook Pattern Finder */}
                            <TabsContent value="patterns" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{isAdminUser ? 'Association Rulebook Pattern Finder' : 'Assigned Patterns'}</CardTitle>
                                        <CardDescription>
                                            {isAdminUser 
                                                ? 'Quickly locate official rulebook patterns by association'
                                                : 'Patterns from your assigned shows'
                                            }
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Loading state for assignments */}
                                        {!isAdminUser && isLoadingAssignments ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <span className="ml-2 text-muted-foreground">Loading assignments...</span>
                                            </div>
                                        ) : (
                                            <>
                                        {/* Filters */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Association</Label>
                                                <Select 
                                                    value={patternFilters.association}
                                                    onValueChange={(value) => setPatternFilters(prev => ({ ...prev, association: value }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="All Associations" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Associations</SelectItem>
                                                        {patternAssociations.map(assoc => (
                                                            <SelectItem key={assoc} value={assoc}>{assoc}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label>Discipline</Label>
                                                <Select 
                                                    value={patternFilters.discipline}
                                                    onValueChange={(value) => setPatternFilters(prev => ({ ...prev, discipline: value }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="All Disciplines" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Disciplines</SelectItem>
                                                        {patternDisciplines.map(disc => (
                                                            <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label>Pattern Number / Name / Keywords</Label>
                                                <Input
                                                    placeholder="Search patterns..."
                                                    value={patternFilters.searchTerm}
                                                    onChange={(e) => setPatternFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Results */}
                                        {isLoadingPatterns ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : filteredPatterns.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                <p>No patterns found matching your filters.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {filteredPatterns.map(pattern => {
                                                    const patternNumber = pattern.pdf_file_name?.match(/(\d+)/)?.[1] || pattern.id;
                                                    return (
                                                        <Card key={pattern.id} className="hover:shadow-md transition-shadow">
                                                            <CardContent className="p-4 space-y-3">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <h4 className="font-semibold text-sm">
                                                                            Pattern {patternNumber}
                                                                        </h4>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {pattern.discipline || 'Unknown'}
                                                                        </p>
                                                                        {pattern.pattern_version && (
                                                                            <Badge variant="outline" className="mt-1 text-xs">
                                                                                {pattern.pattern_version}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => handleTogglePatternFavorite(pattern.id)}
                                                                    >
                                                                        <Heart 
                                                                            className={`h-4 w-4 ${
                                                                                patternFavorites.includes(pattern.id) 
                                                                                    ? 'fill-red-500 text-red-500' 
                                                                                    : ''
                                                                            }`} 
                                                                        />
                                                                    </Button>
                                                                </div>
                                                                
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="flex-1"
                                                                        onClick={() => handleViewPattern(pattern)}
                                                                    >
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        Open Full Pattern
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleTogglePatternFavorite(pattern.id)}
                                                                    >
                                                                        <Star className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Tab C: Judge Favorite Patterns */}
                            <TabsContent value="favorites" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle>Judge Favorite Patterns</CardTitle>
                                                <CardDescription>
                                                    Define your top 3 preferred patterns per context (Association + Discipline + Class)
                                                </CardDescription>
                                            </div>
                                            <Button onClick={handleAddFavorite}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Favorite
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoadingFavorites ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : favoritePatterns.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                <p>No favorite patterns yet. Add your top picks to help show managers.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {favoritePatterns.map(favorite => {
                                                    const pattern = patterns.find(p => p.id === favorite.pattern_id);
                                                    const association = associationsData.find(a => a.id === favorite.association_id);
                                                    const discipline = disciplines.find(d => d.id === favorite.discipline_id);
                                                    
                                                    return (
                                                        <Card key={favorite.id} className="bg-muted/30">
                                                            <CardContent className="p-4">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1 space-y-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant="secondary">Rank {favorite.rank}</Badge>
                                                                            <span className="font-semibold">
                                                                                {association?.name || favorite.association_id} - {discipline?.name || favorite.discipline_id}
                                                                            </span>
                                                                        </div>
                                                                        {pattern && (
                                                                            <p className="text-sm text-muted-foreground">
                                                                                Pattern: {pattern.pdf_file_name || `Pattern ${pattern.id}`}
                                                                            </p>
                                                                        )}
                                                                        {favorite.creator_note && (
                                                                            <p className="text-sm text-muted-foreground italic">
                                                                                Note: {favorite.creator_note}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleEditFavorite(favorite)}
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleDeleteFavorite(favorite.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        {/* Nice-to-Have: Quick Links */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Quick Links
                                </CardTitle>
                                <CardDescription>
                                    Recently used score sheets and viewed patterns
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold mb-2">Recently Used Score Sheets</h4>
                                        {recentScoresheets.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No recent activity</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {recentScoresheets.slice(0, 5).map(s => (
                                                    <Button key={s.id} variant="ghost" className="w-full justify-start" size="sm">
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        {s.discipline || 'Scoresheet'}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2">Recently Viewed Patterns</h4>
                                        {recentPatterns.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No recent activity</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {recentPatterns.slice(0, 5).map(p => (
                                                    <Button key={p.id} variant="ghost" className="w-full justify-start" size="sm">
                                                        <BookOpen className="mr-2 h-4 w-4" />
                                                        {p.pdf_file_name || `Pattern ${p.id}`}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </main>
            </div>

            {/* Pattern Preview Dialog */}
            {selectedPattern && (
                <Dialog open={!!selectedPattern} onOpenChange={() => setSelectedPattern(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Pattern {selectedPattern.pdf_file_name?.match(/(\d+)/)?.[1] || selectedPattern.id}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedPattern.discipline} - {selectedPattern.association_name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {patternImage ? (
                                <div className="rounded-md overflow-hidden border bg-muted/20">
                                    <img 
                                        src={patternImage} 
                                        alt="Pattern Diagram" 
                                        className="w-full h-auto"
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No image available for this pattern.
                                </p>
                            )}
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => handleTogglePatternFavorite(selectedPattern.id)}>
                                    <Star className={`mr-2 h-4 w-4 ${patternFavorites.includes(selectedPattern.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                    {patternFavorites.includes(selectedPattern.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedPattern(null)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Add/Edit Favorite Dialog */}
            <Dialog open={isFavoriteDialogOpen} onOpenChange={setIsFavoriteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingFavorite ? 'Edit Favorite Pattern' : 'Add Favorite Pattern'}</DialogTitle>
                        <DialogDescription>
                            Select up to 3 patterns per Association + Discipline + Class combination, ranked 1-3
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Association</Label>
                            <Select 
                                value={favoriteForm.association_id}
                                onValueChange={(value) => setFavoriteForm(prev => ({ ...prev, association_id: value, discipline_id: '', pattern_id: '' }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Association" />
                                </SelectTrigger>
                                <SelectContent>
                                    {associationsData.map(assoc => (
                                        <SelectItem key={assoc.id} value={assoc.id}>{assoc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Discipline</Label>
                            <Select 
                                value={favoriteForm.discipline_id}
                                onValueChange={(value) => setFavoriteForm(prev => ({ ...prev, discipline_id: value, pattern_id: '' }))}
                                disabled={!favoriteForm.association_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Discipline" />
                                </SelectTrigger>
                                <SelectContent>
                                    {favoriteFormDisciplines.map(disc => (
                                        <SelectItem key={disc.id} value={disc.id}>{disc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Class</Label>
                            <Input
                                placeholder="Enter class name (optional)"
                                value={favoriteForm.class_id}
                                onChange={(e) => setFavoriteForm(prev => ({ ...prev, class_id: e.target.value }))}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Pattern</Label>
                            <Select 
                                value={favoriteForm.pattern_id}
                                onValueChange={(value) => setFavoriteForm(prev => ({ ...prev, pattern_id: value }))}
                                disabled={!favoriteForm.discipline_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Pattern" />
                                </SelectTrigger>
                                <SelectContent>
                                    {favoriteFormPatterns.map(pattern => (
                                        <SelectItem key={pattern.id} value={String(pattern.id)}>
                                            {pattern.pdf_file_name || `Pattern ${pattern.id}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Rank (1-3)</Label>
                            <Select 
                                value={String(favoriteForm.rank)}
                                onValueChange={(value) => setFavoriteForm(prev => ({ ...prev, rank: parseInt(value) }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1</SelectItem>
                                    <SelectItem value="2">2</SelectItem>
                                    <SelectItem value="3">3</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Creator Note (Optional)</Label>
                            <Textarea
                                placeholder="Add a note for pattern book creators / show managers..."
                                value={favoriteForm.creator_note}
                                onChange={(e) => setFavoriteForm(prev => ({ ...prev, creator_note: e.target.value }))}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFavoriteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveFavorite} disabled={!favoriteForm.association_id || !favoriteForm.discipline_id || !favoriteForm.pattern_id}>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default JudgesPortalPage;
