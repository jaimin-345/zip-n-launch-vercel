import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Users, FileText, BookOpen, Eye, Loader2, Calendar, 
    Building, MapPin, Clock, ChevronRight, Briefcase
} from 'lucide-react';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';

const StaffPortalPage = () => {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    
    // Tab State
    const [activeTab, setActiveTab] = useState('pattern-books');
    
    // Projects State
    const [patternBookProjects, setPatternBookProjects] = useState([]);
    const [horseShowProjects, setHorseShowProjects] = useState([]);
    const [isLoadingPatternBooks, setIsLoadingPatternBooks] = useState(false);
    const [isLoadingHorseShows, setIsLoadingHorseShows] = useState(false);
    
    // Project Detail Modal State
    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Fetch Pattern Book Projects - Show ALL user's projects (like Customer Portal)
    useEffect(() => {
        const fetchPatternBooks = async () => {
            if (!user?.id) return;
            
            setIsLoadingPatternBooks(true);
            try {
                // Fetch all pattern book projects owned by the user (same as Customer Portal)
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('project_type', 'pattern_book')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false });
                
                if (error) throw error;
                
                setPatternBookProjects(data || []);
            } catch (error) {
                console.error('Error fetching pattern books:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load pattern books.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoadingPatternBooks(false);
            }
        };
        
        if (activeTab === 'pattern-books') {
            fetchPatternBooks();
        }
    }, [activeTab, user?.id, toast]);
    
    // Fetch Horse Show Projects - Show ALL user's projects (like Customer Portal)
    useEffect(() => {
        const fetchHorseShows = async () => {
            if (!user?.id) return;
            
            setIsLoadingHorseShows(true);
            try {
                // Fetch all horse show projects owned by the user
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('user_id', user.id)
                    .neq('project_type', 'pattern_book')
                    .neq('project_type', 'pattern_folder')
                    .neq('project_type', 'pattern_hub')
                    .order('updated_at', { ascending: false });
                
                if (error) throw error;
                
                setHorseShowProjects(data || []);
            } catch (error) {
                console.error('Error fetching horse shows:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load horse shows.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoadingHorseShows(false);
            }
        };
        
        if (activeTab === 'horse-shows') {
            fetchHorseShows();
        }
    }, [activeTab, user?.id, toast]);
    
    // Handle View Project
    const handleViewProject = (project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };
    
    // Handle Navigate to Pattern Book Builder
    const handleNavigateToBuilder = (projectId) => {
        navigate(`/pattern-book-builder/${projectId}?mode=judgeView`);
    };
    
    // Extract project details
    const getProjectDetails = (project) => {
        const data = project.project_data || {};
        return {
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            venue: data.venue || data.venueName || null,
            city: data.city || null,
            state: data.state || null,
            associations: data.associations || [],
            disciplines: data.disciplines || []
        };
    };
    
    // Get user role in project
    const getUserRole = (project) => {
        const projectData = project.project_data || {};
        const officials = projectData.officials || [];
        const associationJudges = projectData.associationJudges || {};
        
        // Check officials first
        const official = officials.find(o => 
            o.email?.toLowerCase() === user?.email?.toLowerCase()
        );
        if (official) {
            return official.role || 'Staff';
        }
        
        // Check associationJudges
        for (const assocData of Object.values(associationJudges)) {
            const judges = assocData?.judges || [];
            const judge = judges.find(j => j.email?.toLowerCase() === user?.email?.toLowerCase());
            if (judge) {
                return 'Judge';
            }
        }
        
        return 'Staff';
    };

    // Get all staff members for a project
    const getProjectStaff = (project) => {
        const projectData = project.project_data || {};
        const officials = projectData.officials || [];
        const associationJudges = projectData.associationJudges || {};
        const staffList = [];

        // Add officials/staff
        officials.forEach(official => {
            if (official.name) {
                staffList.push({
                    name: official.name,
                    role: official.role || 'Staff',
                    type: 'staff'
                });
            }
        });

        // Add judges from all associations
        Object.values(associationJudges).forEach(assocData => {
            const judges = assocData?.judges || [];
            judges.forEach(judge => {
                if (judge.name) {
                    staffList.push({
                        name: judge.name,
                        role: 'Judge',
                        type: 'judge'
                    });
                }
            });
        });

        return staffList;
    };

    // Get people data for a project (like Customer Portal)
    const getPeopleData = (project) => {
        const projectData = project.project_data || {};
        const owner = projectData.adminOwner || profile?.full_name || user?.email || 'Not set';
        
        // Get admin - check secondAdmin or officials with admin role
        let admin = projectData.secondAdmin || 'Not set';
        if (admin === 'Not set') {
            const adminOfficial = (projectData.officials || []).find(o => o.role === 'admin');
            admin = adminOfficial?.name || 'Not set';
        }
        
        // Collect judges from associationJudges
        const judgesList = [];
        Object.values(projectData.associationJudges || {}).forEach(assocData => {
            const judges = assocData?.judges || (Array.isArray(assocData) ? assocData : []);
            if (Array.isArray(judges)) {
                judges.forEach(judge => {
                    if (typeof judge === 'string') {
                        judgesList.push(judge);
                    } else if (judge?.name) {
                        judgesList.push(judge.name);
                    } else if (judge?.email) {
                        judgesList.push(judge.email);
                    }
                });
            }
        });
        
        // Also collect judges from officials
        const officials = projectData.officials || [];
        const judgeOfficials = officials.filter(o => o.role === 'judge');
        judgeOfficials.forEach(judge => {
            if (judge.name && !judgesList.includes(judge.name)) {
                judgesList.push(judge.name);
            } else if (judge.email && !judgesList.includes(judge.email)) {
                judgesList.push(judge.email);
            }
        });
        
        const judgesCount = judgesList.length;
        
        // Get staff list (excluding judges and admins)
        const staffList = officials
            .filter(o => o.role !== 'judge' && o.role !== 'admin')
            .map(o => o.name || o.email || 'Unknown')
            .filter(Boolean);
        const staffCount = staffList.length;
        
        return { owner, admin, judgesCount, staffCount, judgesList, staffList };
    };
    
    return (
        <>
            <Helmet>
                <title>Staff Portal - EquiPatterns</title>
                <meta name="description" content="Access your assigned pattern books and horse shows as staff member." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-block p-4 bg-primary/10 rounded-full mb-4"
                        >
                            <Briefcase className="h-10 w-10 text-primary" />
                        </motion.div>
                        <h1 className="text-4xl font-bold mb-4">👷 Staff Portal</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Your dedicated portal for accessing assigned pattern books and horse shows.
                        </p>
                    </div>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                            <TabsTrigger value="pattern-books" className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                Active Pattern Books
                            </TabsTrigger>
                            <TabsTrigger value="horse-shows" className="flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                Horse Shows
                            </TabsTrigger>
                        </TabsList>

                        {/* Tab A: Active Pattern Books Portal */}
                        <TabsContent value="pattern-books" className="space-y-4">
                            <Card className="shadow-lg border-2">
                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                                    <CardTitle className="flex items-center gap-2 text-2xl">
                                        <BookOpen className="h-6 w-6 text-primary" />
                                        Active Pattern Books Portal
                                    </CardTitle>
                                    <CardDescription className="text-base mt-1">
                                        View and manage your pattern book projects
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {isLoadingPatternBooks ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span className="ml-2 text-muted-foreground">Loading pattern books...</span>
                                        </div>
                                    ) : patternBookProjects.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                            <p>No pattern books assigned yet.</p>
                                            <p className="text-sm">You'll see pattern books here when you're added as staff.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow className="hover:bg-muted/50 border-b-2">
                                                        <TableHead className="font-semibold text-sm h-14">Show Name</TableHead>
                                                        <TableHead className="font-semibold text-sm">Owner</TableHead>
                                                        <TableHead className="font-semibold text-sm">Admin</TableHead>
                                                        <TableHead className="font-semibold text-sm">Judges</TableHead>
                                                        <TableHead className="font-semibold text-sm">Staff</TableHead>
                                                        <TableHead className="font-semibold text-sm">Associations</TableHead>
                                                        <TableHead className="font-semibold text-sm">Start Date</TableHead>
                                                        <TableHead className="font-semibold text-sm">Status</TableHead>
                                                        <TableHead className="font-semibold text-sm text-center">Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {patternBookProjects
                                                        .filter(project => (project.status || '').toLowerCase() !== 'in progress')
                                                        .map((project) => {
                                                        const details = getProjectDetails(project);
                                                        const peopleData = getPeopleData(project);
                                                        const projectData = project.project_data || {};
                                                        
                                                        // Get selected associations
                                                        const selectedAssocKeys = Object.keys(projectData.associations || {}).filter(
                                                            key => projectData.associations[key]
                                                        );
                                                        
                                                        return (
                                                            <TableRow 
                                                                key={project.id}
                                                                className="border-b hover:bg-muted/30 transition-colors"
                                                            >
                                                                <TableCell className="font-semibold py-4">
                                                                    <span className="text-base">{project.project_name || 'Untitled Pattern Book'}</span>
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        <Users className="h-4 w-4 text-primary shrink-0" />
                                                                        <span className="font-medium truncate max-w-[120px]">{peopleData.owner}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        <Users className="h-4 w-4 text-primary shrink-0" />
                                                                        <span className="truncate max-w-[120px]">{peopleData.admin}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    <Badge 
                                                                        variant="outline"
                                                                        className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700 rounded-full"
                                                                    >
                                                                        {peopleData.judgesCount} Assigned
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    {peopleData.staffList.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {peopleData.staffList.slice(0, 2).map((name, idx) => (
                                                                                <Badge 
                                                                                    key={idx}
                                                                                    variant="outline"
                                                                                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700 rounded-full"
                                                                                >
                                                                                    {name}
                                                                                </Badge>
                                                                            ))}
                                                                            {peopleData.staffList.length > 2 && (
                                                                                <Badge variant="outline" className="text-xs px-2 py-1 rounded-full">
                                                                                    +{peopleData.staffList.length - 2}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-sm">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    {selectedAssocKeys.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {selectedAssocKeys.slice(0, 3).map((assocKey, idx) => (
                                                                                <Badge 
                                                                                    key={idx}
                                                                                    variant="secondary"
                                                                                    className="text-xs px-2 py-1 rounded-full"
                                                                                >
                                                                                    {assocKey}
                                                                                </Badge>
                                                                            ))}
                                                                            {selectedAssocKeys.length > 3 && (
                                                                                <Badge variant="outline" className="text-xs px-2 py-1 rounded-full">
                                                                                    +{selectedAssocKeys.length - 3}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-sm">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    {details.startDate ? (
                                                                        <div className="flex items-center gap-2 text-sm font-medium">
                                                                            <Calendar className="h-4 w-4 text-primary" />
                                                                            <span>{format(parseLocalDate(details.startDate), "MMM do, yyyy")}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-sm">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    <Badge 
                                                                        variant="secondary"
                                                                        className={cn(
                                                                            'text-xs px-3 py-1.5 font-semibold rounded-full shadow-sm',
                                                                            (project.status || 'Draft') === 'Lock & Approve Mode' 
                                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-300 dark:border-green-700' 
                                                                                : (project.status || 'Draft') === 'Publication'
                                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                                                                        )}
                                                                    >
                                                                        {project.status || 'Draft'}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right py-4">
                                                                    <div className="flex items-center gap-2 justify-end">
                                                                        <Button
                                                                            variant="default"
                                                                            size="sm"
                                                                            onClick={() => handleNavigateToBuilder(project.id)}
                                                                            className="gap-1.5"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                            View
                                                                            <ChevronRight className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab B: Horse Shows */}
                        <TabsContent value="horse-shows" className="space-y-4">
                            <Card className="shadow-lg border-2">
                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                                    <CardTitle className="flex items-center gap-2 text-2xl">
                                        <Building className="h-6 w-6 text-primary" />
                                        Horse Shows
                                    </CardTitle>
                                    <CardDescription className="text-base mt-1">
                                        View horse shows you're assigned to as staff
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {isLoadingHorseShows ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span className="ml-2 text-muted-foreground">Loading horse shows...</span>
                                        </div>
                                    ) : horseShowProjects.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Building className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                            <p>No horse shows yet.</p>
                                            <p className="text-sm">Your horse show projects will appear here.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow className="hover:bg-muted/50 border-b-2">
                                                        <TableHead className="font-semibold text-sm h-14">Show Name</TableHead>
                                                        <TableHead className="font-semibold text-sm">Owner</TableHead>
                                                        <TableHead className="font-semibold text-sm">Admin</TableHead>
                                                        <TableHead className="font-semibold text-sm">Judges</TableHead>
                                                        <TableHead className="font-semibold text-sm">Staff</TableHead>
                                                        <TableHead className="font-semibold text-sm">Venue</TableHead>
                                                        <TableHead className="font-semibold text-sm">Start Date</TableHead>
                                                        <TableHead className="font-semibold text-sm">Status</TableHead>
                                                        <TableHead className="font-semibold text-sm text-center">Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {horseShowProjects
                                                        .filter(project => (project.status || '').toLowerCase() !== 'in progress')
                                                        .map((project) => {
                                                        const details = getProjectDetails(project);
                                                        const peopleData = getPeopleData(project);
                                                        return (
                                                            <TableRow 
                                                                key={project.id}
                                                                className="border-b hover:bg-muted/30 transition-colors"
                                                            >
                                                                <TableCell className="font-semibold py-4">
                                                                    <span className="text-base">{project.project_name || 'Untitled Show'}</span>
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        <Users className="h-4 w-4 text-primary shrink-0" />
                                                                        <span className="font-medium truncate max-w-[120px]">{peopleData.owner}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        <Users className="h-4 w-4 text-primary shrink-0" />
                                                                        <span className="truncate max-w-[120px]">{peopleData.admin}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    <Badge 
                                                                        variant="outline"
                                                                        className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700 rounded-full"
                                                                    >
                                                                        {peopleData.judgesCount} Assigned
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    {peopleData.staffList.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {peopleData.staffList.slice(0, 2).map((name, idx) => (
                                                                                <Badge 
                                                                                    key={idx}
                                                                                    variant="outline"
                                                                                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700 rounded-full"
                                                                                >
                                                                                    {name}
                                                                                </Badge>
                                                                            ))}
                                                                            {peopleData.staffList.length > 2 && (
                                                                                <Badge variant="outline" className="text-xs px-2 py-1 rounded-full">
                                                                                    +{peopleData.staffList.length - 2}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-sm">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    {details.venue ? (
                                                                        <div className="flex items-center gap-2 text-sm">
                                                                            <Building className="h-4 w-4 text-muted-foreground" />
                                                                            <span className="truncate max-w-[150px]">{details.venue}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-sm">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    {details.startDate ? (
                                                                        <div className="flex items-center gap-2 text-sm font-medium">
                                                                            <Calendar className="h-4 w-4 text-primary" />
                                                                            <span>{format(parseLocalDate(details.startDate), "MMM do, yyyy")}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-sm">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    <Badge 
                                                                        variant="secondary"
                                                                        className={cn(
                                                                            'text-xs px-3 py-1.5 font-semibold rounded-full shadow-sm',
                                                                            (project.status || 'Draft') === 'Published'
                                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-300 dark:border-green-700' 
                                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                                                                        )}
                                                                    >
                                                                        {project.status || 'Draft'}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right py-4">
                                                                    <div className="flex items-center gap-2 justify-end">
                                                                        <Button
                                                                            variant="default"
                                                                            size="sm"
                                                                            onClick={() => handleViewProject(project)}
                                                                            className="gap-1.5"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                            View
                                                                            <ChevronRight className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>

            {/* Project Detail Modal */}
            {selectedProject && (
                <ProjectDetailModal
                    open={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedProject(null);
                    }}
                    project={selectedProject}
                />
            )}
        </>
    );
};

export default StaffPortalPage;
