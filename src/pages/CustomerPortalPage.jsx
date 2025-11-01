import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, BookCopy, CalendarDays, PlusCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const ProjectCard = ({ project }) => {
    const navigate = useNavigate();
    const isPatternBook = project.project_type === 'pattern_book';
    const editPath = isPatternBook
        ? `/pattern-book-builder/${project.id}`
        : `/horse-show-manager/edit/${project.id}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
            className="flex flex-col h-full"
        >
            <Card className="flex flex-col flex-grow glass-effect">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            {isPatternBook ? <BookCopy className="h-6 w-6 text-primary" /> : <CalendarDays className="h-6 w-6 text-primary" />}
                        </div>
                        <div>
                            <CardTitle className="leading-tight">{project.project_name || 'Untitled Project'}</CardTitle>
                            <CardDescription>{isPatternBook ? 'Pattern Book' : 'Horse Show'}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">
                        Last saved: {format(new Date(project.updated_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Status: <span className="capitalize font-medium text-foreground">{project.status || 'Draft'}</span></p>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => navigate(editPath)} className="w-full">
                        Continue Editing <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
};

const CustomerPortalPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            if (!user) return;
            setIsLoading(true);
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching projects:', error);
            } else {
                setProjects(data);
            }
            setIsLoading(false);
        };

        fetchProjects();
    }, [user]);

    const patternBookProjects = projects.filter(p => p.project_type === 'pattern_book');
    const showManagerProjects = projects.filter(p => p.project_type !== 'pattern_book');

    const renderProjectList = (projectList, title, description, newProjectPath, newProjectLabel) => (
        <div className="mb-16">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground mt-1">{description}</p>
                </div>
                <Button onClick={() => navigate(newProjectPath)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> {newProjectLabel}
                </Button>
            </div>
            {projectList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projectList.map(project => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">You haven't created any projects here yet.</p>
                </div>
            )}
        </div>
    );

    return (
        <>
            <Helmet>
                <title>Customer Portal - EquiPatterns</title>
                <meta name="description" content="Manage your horse show projects, pattern books, and access exclusive customer tools." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-8">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                            Welcome to Your Portal
                        </h1>
                        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                            This is your command center for all your projects. Manage your pattern books, build show schedules, and access your assets.
                        </p>
                    </motion.div>

                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div>
                            {renderProjectList(
                                patternBookProjects,
                                "Pattern Books",
                                "Create and manage your professional pattern books.",
                                "/pattern-book-builder",
                                "New Pattern Book"
                            )}
                            {renderProjectList(
                                showManagerProjects,
                                "Horse Shows",
                                "Build and organize your complete horse show schedules.",
                                "/horse-show-manager/create",
                                "New Horse Show"
                            )}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default CustomerPortalPage;