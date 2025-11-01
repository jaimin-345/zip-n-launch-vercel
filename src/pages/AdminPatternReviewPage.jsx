import React, { useState, useEffect, useCallback } from 'react';
    import { Helmet } from 'react-helmet-async';
    import { motion } from 'framer-motion';
    import { Check, X, Eye, FileText, User, Loader2, ArrowLeft, Download, Trash2, CheckCircle, Mail, ExternalLink } from 'lucide-react';
    import { Link } from 'react-router-dom';
    import Navigation from '@/components/Navigation';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { useToast } from '@/components/ui/use-toast';
    import { Badge } from '@/components/ui/badge';
    import { supabase } from '@/lib/supabaseClient';
    import PatternPreviewModal from '@/components/pattern-upload/PatternPreviewModal';
    import { ConfirmationDialog } from '@/components/ConfirmationDialog';
    import { EmailSenderModal } from '@/components/admin/EmailSenderModal';

    const AdminPatternReviewPage = () => {
        const { toast } = useToast();
        const [pendingPatterns, setPendingPatterns] = useState([]);
        const [approvedPatterns, setApprovedPatterns] = useState([]);
        const [isLoading, setIsLoading] = useState(true);
        const [previewState, setPreviewState] = useState({ isOpen: false, pattern: null });
        const [deleteState, setDeleteState] = useState({ isOpen: false, pattern: null });
        const [emailState, setEmailState] = useState({ isOpen: false, patternSet: null });

        const fetchPatterns = useCallback(async () => {
            setIsLoading(true);
            
            const { data: patternsData, error: patternsError } = await supabase
              .from('patterns')
              .select('*, pattern_associations(*), pattern_divisions(*), projects(id, project_name)')
              .in('review_status', ['pending', 'approved']);
        
            if (patternsError) {
              toast({
                title: 'Error fetching patterns',
                description: patternsError.message,
                variant: 'destructive',
              });
              setIsLoading(false);
              return;
            }
        
            const userIds = [...new Set(patternsData.map(p => p.user_id))];
            if (userIds.length === 0) {
              setPendingPatterns([]);
              setApprovedPatterns([]);
              setIsLoading(false);
              return;
            }
        
            const { data: customersData, error: customersError } = await supabase
              .from('customers')
              .select('user_id, email, full_name')
              .in('user_id', userIds);
        
            if (customersError) {
              toast({
                title: 'Error fetching customer data',
                description: customersError.message,
                variant: 'destructive',
              });
            }
        
            const customerMap = (customersData || []).reduce((acc, customer) => {
              acc[customer.user_id] = customer;
              return acc;
            }, {});
        
            const patternsWithCustomer = patternsData.map(pattern => ({
              ...pattern,
              customer: customerMap[pattern.user_id] || { email: 'Unknown User', full_name: 'Unknown User' },
            }));

            const pending = patternsWithCustomer.filter(p => p.review_status === 'pending');
            const approved = patternsWithCustomer.filter(p => p.review_status === 'approved');

            const groupPatterns = (patterns) => {
                const grouped = patterns.reduce((acc, pattern) => {
                    const setName = pattern.pattern_set_name || 'Individual Pattern';
                    // Use project_id from the first pattern in the set for the link
                    const projectId = pattern.project_id; 
                    if (!acc[setName]) {
                        acc[setName] = {
                            setName,
                            user: pattern.customer,
                            patterns: [],
                            className: pattern.class_name,
                            createdAt: pattern.created_at,
                            projectId: projectId, // Store projectId here
                        };
                    }
                    acc[setName].patterns.push(pattern);
                    return acc;
                }, {});
                return Object.values(grouped).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            };
        
            setPendingPatterns(groupPatterns(pending));
            setApprovedPatterns(groupPatterns(approved));
            setIsLoading(false);
          }, [toast]);

        useEffect(() => {
            fetchPatterns();
        }, [fetchPatterns]);

        const handleReview = async (patternIds, newStatus) => {
            const { error } = await supabase
                .from('patterns')
                .update({ review_status: newStatus })
                .in('id', patternIds);

            if (error) {
                toast({
                    title: `Failed to ${newStatus} set`,
                    description: error.message,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: `Pattern Set ${newStatus}`,
                    description: `The pattern set has been updated successfully.`,
                });
                fetchPatterns();
            }
        };

        const handleDeletePattern = async () => {
            if (!deleteState.pattern) return;

            try {
                if (deleteState.pattern.file_path) {
                    const { error: storageError } = await supabase.storage
                        .from('pattern_files')
                        .remove([deleteState.pattern.file_path]);
                    
                    if (storageError) console.warn('Storage deletion failed:', storageError);
                }

                await supabase.from('pattern_associations').delete().eq('pattern_id', deleteState.pattern.id);
                await supabase.from('pattern_divisions').delete().eq('pattern_id', deleteState.pattern.id);

                const { error } = await supabase.from('patterns').delete().eq('id', deleteState.pattern.id);

                if (error) throw error;

                toast({
                    title: 'Pattern Deleted',
                    description: 'The pattern has been permanently removed.',
                });
                fetchPatterns();
            } catch (error) {
                toast({
                    title: 'Error deleting pattern',
                    description: error.message,
                    variant: 'destructive',
                });
            }

            setDeleteState({ isOpen: false, pattern: null });
        };

        const handlePreviewPattern = (pattern) => {
            setPreviewState({ 
                isOpen: true, 
                pattern: {
                    id: pattern.id,
                    name: pattern.name,
                    file_url: pattern.file_url,
                    fileUrl: pattern.file_url
                }
            });
        };

        const handleDownloadPattern = (pattern) => {
            if (pattern.file_url) {
                const link = document.createElement('a');
                link.href = pattern.file_url;
                link.download = pattern.name || 'pattern.pdf';
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        };

        const handleOpenEmailModal = (patternSet) => {
            setEmailState({ isOpen: true, patternSet });
        };

        const PatternSetCard = ({ set, isPendingReview }) => {
            const patternIds = set.patterns.map(p => p.id);
            const userEmail = set.user?.email || 'Unknown User';
            // Use the projectId stored in the set object
            const projectId = set.projectId; 

            return (
                <Card className="bg-secondary/50">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{set.setName}</CardTitle>
                                <CardDescription>
                                    <span className="flex items-center gap-2 mt-1">
                                        <User className="h-4 w-4" /> {userEmail}
                                        <span className="text-muted-foreground/50">|</span>
                                        Submitted: {new Date(set.createdAt).toLocaleDateString()}
                                    </span>
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="text-base">{set.className}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <p className="font-semibold text-sm mb-2">Patterns in this set:</p>
                            <div className="flex flex-wrap gap-2">
                                {set.patterns.map(pattern => (
                                    <div key={pattern.id} className="flex items-center gap-1 p-2 border rounded-md bg-background/50">
                                        <span className="text-sm font-medium">{pattern.name}</span>
                                        <div className="flex gap-1 ml-2">
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handlePreviewPattern(pattern)}>
                                                <Eye className="h-3 w-3"/>
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDownloadPattern(pattern)}>
                                                <Download className="h-3 w-3"/>
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteState({ isOpen: true, pattern })}>
                                                <Trash2 className="h-3 w-3"/>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-end">
                            <div className="flex gap-2">
                                {projectId && (
                                    <Link to={`/show/${projectId}`} target="_blank">
                                        <Button variant="outline">
                                            <ExternalLink className="mr-2 h-4 w-4" /> Visit Show Page
                                        </Button>
                                    </Link>
                                )}
                                <Button variant="outline" onClick={() => handleOpenEmailModal(set)}>
                                    <Mail className="mr-2 h-4 w-4" /> Send Email
                                </Button>
                                {isPendingReview && (
                                    <>
                                        <Button variant="destructive" onClick={() => handleReview(patternIds, 'rejected')}>
                                            <X className="mr-2 h-4 w-4" /> Reject Set
                                        </Button>
                                        <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleReview(patternIds, 'approved')}>
                                            <Check className="mr-2 h-4 w-4" /> Approve Set
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        };
        
        return (
            <>
                <Helmet>
                    <title>Admin: Pattern Review - EquiPatterns</title>
                    <meta name="description" content="Review and approve pending pattern submissions from contributors." />
                </Helmet>
                <div className="min-h-screen bg-background">
                    <Navigation />
                    <main className="container mx-auto px-4 py-12">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                            <div className="mb-6">
                                <Link to="/admin">
                                    <Button variant="outline">
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                                    </Button>
                                </Link>
                            </div>
                            <CardHeader className="text-center px-0 mb-8">
                                <CardTitle className="text-4xl md:text-5xl font-bold">Pattern Review Queue</CardTitle>
                                <CardDescription className="text-xl text-muted-foreground max-w-3xl mx-auto">
                                    Approve, reject, or delete pattern submissions from the community.
                                </CardDescription>
                            </CardHeader>

                            {isLoading ? (
                                <div className="flex justify-center items-center py-20">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-6">
                                        {pendingPatterns.length > 0 ? (
                                            pendingPatterns.map((set, index) => (
                                                <motion.div
                                                    key={`pending-${set.setName}-${index}`}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                                >
                                                    <PatternSetCard set={set} isPendingReview={true} />
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="text-center py-20 text-muted-foreground">
                                                <FileText className="mx-auto h-12 w-12 mb-4" />
                                                <p className="text-lg">The review queue is empty. Great job!</p>
                                            </div>
                                        )}
                                    </div>

                                    {approvedPatterns.length > 0 && (
                                        <div className="mt-16">
                                            <div className="flex items-center justify-center mb-8">
                                                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                                                <h2 className="text-3xl font-bold text-center">Approved Pattern Sets</h2>
                                            </div>
                                            <div className="space-y-6">
                                                {approvedPatterns.map((set, index) => (
                                                    <motion.div
                                                        key={`approved-${set.setName}-${index}`}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                                    >
                                                        <PatternSetCard set={set} isPendingReview={false} />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </main>
                </div>
                <PatternPreviewModal
                    isOpen={previewState.isOpen}
                    onClose={() => setPreviewState({ isOpen: false, pattern: null })}
                    pattern={previewState.pattern}
                />
                <ConfirmationDialog
                    isOpen={deleteState.isOpen}
                    onClose={() => setDeleteState({ isOpen: false, pattern: null })}
                    onConfirm={handleDeletePattern}
                    title="Delete Pattern Permanently?"
                    description={`This will permanently delete "${deleteState.pattern?.name}" and remove it from storage. This action cannot be undone.`}
                    confirmText="Delete"
                />
                {emailState.patternSet && (
                    <EmailSenderModal
                        isOpen={emailState.isOpen}
                        onClose={() => setEmailState({ isOpen: false, patternSet: null })}
                        patternSet={emailState.patternSet}
                    />
                )}
            </>
        );
    };

    export default AdminPatternReviewPage;