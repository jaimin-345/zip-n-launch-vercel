import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, UploadCloud, BarChart2, PlusCircle, AlertCircle, LogIn, DollarSign, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import Navigation from '@/components/Navigation';
import { supabase } from '@/lib/supabaseClient';

const ContributorPortalPage = () => {
    const { user, loading: authLoading, openAuthModal } = useAuth();
    const { toast } = useToast();
    const [patterns, setPatterns] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState(null);

    const fetchPatterns = useCallback(async () => {
        if (!user) {
            setLoadingData(false);
            return;
        }

        try {
            setLoadingData(true);
            setError(null);
            const { data, error: fetchError } = await supabase
                .from('patterns')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw fetchError;
            }
            
            setPatterns(data || []);
        } catch (err) {
            setError('Failed to fetch your patterns. Please try again later.');
            toast({
                title: 'Error',
                description: err.message || 'Could not load your patterns.',
                variant: 'destructive',
            });
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!authLoading) {
            fetchPatterns();
        }
    }, [user, authLoading, fetchPatterns]);

    const getStatusVariant = (status) => {
        switch (status) {
            case 'approved': return 'success';
            case 'pending': return 'secondary';
            case 'rejected': return 'destructive';
            default: return 'outline';
        }
    };
    
    const LoggedOutView = () => (
        <div className="text-center py-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <h2 className="text-3xl font-bold tracking-tight">Unlock Your Potential as a Pattern Contributor</h2>
                <p className="mt-4 text-lg text-muted-foreground">Join our community of designers to monetize your creativity and shape the future of horse show events.</p>
                <div className="mt-8 flex justify-center gap-4">
                    <Button size="lg" onClick={() => openAuthModal('sign_up')}>
                        <UploadCloud className="mr-2 h-5 w-5" /> Become a Contributor
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => openAuthModal('login')}>
                        <LogIn className="mr-2 h-5 w-5" /> Contributor Login
                    </Button>
                </div>
            </motion.div>
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="text-primary"/>Monetize Your Work</CardTitle></CardHeader>
                    <CardContent>Earn royalties every time your patterns are used in a show. Get detailed analytics on your top-performing designs.</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="text-primary"/>Reach a Wider Audience</CardTitle></CardHeader>
                    <CardContent>Showcase your patterns to thousands of show managers, trainers, and riders across multiple associations.</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="text-primary"/>Simple & Powerful Tools</CardTitle></CardHeader>
                    <CardContent>Our easy-to-use uploader and management dashboard make it simple to license and track your creative assets.</CardContent>
                </Card>
            </div>
        </div>
    );

    const LoggedInView = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Link to="/upload-patterns/new">
                    <Card className="hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Upload New Pattern</CardTitle>
                            <UploadCloud className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-primary">Get Started</div>
                            <p className="text-xs text-muted-foreground">Submit a new pattern set for review.</p>
                        </CardContent>
                    </Card>
                </Link>
                <Card className="hover:shadow-lg transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Analytics</CardTitle>
                        <BarChart2 className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Coming Soon</div>
                        <p className="text-xs text-muted-foreground">Track your patterns' performance.</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">New Pattern Book</CardTitle>
                        <PlusCircle className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Link to="/pattern-book-builder">
                            <div className="text-2xl font-bold text-primary">Build Now</div>
                        </Link>
                        <p className="text-xs text-muted-foreground">Use our guided pattern book builder.</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>My Submitted Patterns</CardTitle>
                    <CardDescription>A history of all the patterns you've submitted.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingData ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-4 text-muted-foreground">Loading your patterns...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10 text-destructive-foreground bg-destructive/20 rounded-lg">
                            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : patterns.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <h3 className="text-lg font-semibold">No patterns found</h3>
                            <p className="text-muted-foreground mt-1 mb-4">You haven't uploaded any patterns yet.</p>
                            <Link to="/upload-patterns/new">
                                <Button><UploadCloud className="mr-2 h-4 w-4" /> Upload Your First Pattern</Button>
                            </Link>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name / Set</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Date Submitted</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patterns.map((pattern) => (
                                    <TableRow key={pattern.id}>
                                        <TableCell className="font-medium">
                                            <div>{pattern.name}</div>
                                            {pattern.pattern_set_name && (
                                                <div className="text-xs text-muted-foreground">{pattern.pattern_set_name}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>{pattern.class_name}</TableCell>
                                        <TableCell>{format(new Date(pattern.created_at), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={getStatusVariant(pattern.review_status)}>
                                                {pattern.review_status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </>
    );

    return (
        <>
            <Helmet>
                <title>Contributor Portal - EquiPatterns</title>
                <meta name="description" content="Manage your submitted patterns, view their status, and access contributor tools." />
            </Helmet>
            <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
                <Navigation />
                <main className="container mx-auto p-4 md:p-8">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.6 }}
                        className="mb-8"
                    >
                        <CardHeader className="text-center px-0">
                            <CardTitle className="text-4xl md:text-5xl font-bold">Contributor Portal</CardTitle>
                            <CardDescription className="text-xl text-muted-foreground">
                                {user ? "Your hub for creating and managing horse show patterns." : "Monetize your creativity. Join the community."}
                            </CardDescription>
                        </CardHeader>
                    </motion.div>
                    
                    {authLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : user ? <LoggedInView /> : <LoggedOutView />}
                </main>
            </div>
        </>
    );
};

export default ContributorPortalPage;