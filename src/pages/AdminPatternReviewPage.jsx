import React, { useState, useEffect, useCallback, useMemo } from 'react';
    import { Helmet } from 'react-helmet-async';
    import { motion } from 'framer-motion';
    import { Check, X, Eye, FileText, User, Loader2, ArrowLeft, Download, Trash2, CheckCircle, Mail, ExternalLink, Filter, CheckSquare, Square } from 'lucide-react';
    import { Link } from 'react-router-dom';
    import Navigation from '@/components/Navigation';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { useToast } from '@/components/ui/use-toast';
    import { Badge } from '@/components/ui/badge';
    import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { Checkbox } from '@/components/ui/checkbox';
    import { supabase } from '@/lib/supabaseClient';
    import PatternPreviewModal from '@/components/pattern-upload/PatternPreviewModal';
    import { ConfirmationDialog } from '@/components/ConfirmationDialog';
    import { EmailSenderModal } from '@/components/admin/EmailSenderModal';
    import { generateNextPatternNumber, assignPatternNumber } from '@/lib/patternNumbering';

    const AdminPatternReviewPage = () => {
        const { toast } = useToast();
        const [pendingPatterns, setPendingPatterns] = useState([]);
        const [approvedPatterns, setApprovedPatterns] = useState([]);
        const [rejectedPatterns, setRejectedPatterns] = useState([]);
        const [isLoading, setIsLoading] = useState(true);
        const [previewState, setPreviewState] = useState({ isOpen: false, pattern: null });
        const [deleteState, setDeleteState] = useState({ isOpen: false, pattern: null });
        const [emailState, setEmailState] = useState({ isOpen: false, patternSet: null });
        const [activeFilter, setActiveFilter] = useState('pending');
        const [selectedSets, setSelectedSets] = useState(new Set());
        const [sidePreview, setSidePreview] = useState(null);

        const fetchPatterns = useCallback(async () => {
            setIsLoading(true);
            
            const { data: patternsData, error: patternsError } = await supabase
              .from('patterns')
              .select('*, pattern_associations(*), pattern_divisions(*), projects(id, project_name)')
              .in('review_status', ['pending', 'approved', 'rejected']);
        
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
            const rejected = patternsWithCustomer.filter(p => p.review_status === 'rejected');

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
            setRejectedPatterns(groupPatterns(rejected));
            setSelectedSets(new Set());
            setIsLoading(false);
          }, [toast]);

        useEffect(() => {
            fetchPatterns();
        }, [fetchPatterns]);

        const handleReview = async (patternIds, newStatus, discipline) => {
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
                // Auto-assign pattern numbers on approval
                if (newStatus === 'approved') {
                    for (const patternId of patternIds) {
                        try {
                            const number = await generateNextPatternNumber(discipline || 'unknown');
                            await assignPatternNumber(patternId, number);
                        } catch (e) {
                            console.warn('Failed to assign pattern number:', e);
                        }
                    }
                }
                toast({
                    title: `Pattern Set ${newStatus}`,
                    description: `The pattern set has been updated successfully.${newStatus === 'approved' ? ' Pattern numbers assigned.' : ''}`,
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

        // Filtered data based on active tab
        const filteredSets = useMemo(() => {
            switch (activeFilter) {
                case 'pending': return pendingPatterns;
                case 'approved': return approvedPatterns;
                case 'rejected': return rejectedPatterns;
                case 'all': return [...pendingPatterns, ...approvedPatterns, ...rejectedPatterns];
                default: return pendingPatterns;
            }
        }, [activeFilter, pendingPatterns, approvedPatterns, rejectedPatterns]);

        const toggleSetSelection = (setKey) => {
            setSelectedSets(prev => {
                const next = new Set(prev);
                if (next.has(setKey)) next.delete(setKey);
                else next.add(setKey);
                return next;
            });
        };

        const toggleSelectAll = () => {
            if (selectedSets.size === filteredSets.length) {
                setSelectedSets(new Set());
            } else {
                setSelectedSets(new Set(filteredSets.map((s, i) => `${s.setName}-${i}`)));
            }
        };

        const handleBulkAction = async (newStatus) => {
            const selectedPatternSets = filteredSets.filter((s, i) => selectedSets.has(`${s.setName}-${i}`));
            const allPatternIds = selectedPatternSets.flatMap(s => s.patterns.map(p => p.id));
            if (allPatternIds.length === 0) return;

            const { error } = await supabase
                .from('patterns')
                .update({ review_status: newStatus })
                .in('id', allPatternIds);

            if (error) {
                toast({ title: `Bulk ${newStatus} failed`, description: error.message, variant: 'destructive' });
            } else {
                toast({ title: `Bulk ${newStatus} complete`, description: `${selectedPatternSets.length} set(s) updated.` });
                fetchPatterns();
            }
        };

        const PatternSetCard = ({ set, isPendingReview, setKey }) => {
            const patternIds = set.patterns.map(p => p.id);
            const userEmail = set.user?.email || 'Unknown User';
            // Use the projectId stored in the set object
            const projectId = set.projectId; 

            const isSelected = selectedSets.has(setKey);

            return (
                <Card className={`bg-secondary/50 transition-colors ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSetSelection(setKey)}
                                    className="mt-1"
                                />
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
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={isPendingReview ? 'default' : set.patterns[0]?.review_status === 'rejected' ? 'destructive' : 'secondary'}>
                                    {isPendingReview ? 'Pending' : set.patterns[0]?.review_status || 'approved'}
                                </Badge>
                                <Badge variant="secondary" className="text-base">{set.className}</Badge>
                            </div>
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
                                        <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleReview(patternIds, 'approved', set.className)}>
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
                                    {/* Filter Tabs */}
                                    <Tabs value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setSelectedSets(new Set()); }} className="mb-6">
                                        <TabsList className="grid w-full grid-cols-4">
                                            <TabsTrigger value="all" className="flex items-center gap-2">
                                                All <Badge variant="secondary" className="ml-1">{pendingPatterns.length + approvedPatterns.length + rejectedPatterns.length}</Badge>
                                            </TabsTrigger>
                                            <TabsTrigger value="pending" className="flex items-center gap-2">
                                                Pending <Badge variant="default" className="ml-1">{pendingPatterns.length}</Badge>
                                            </TabsTrigger>
                                            <TabsTrigger value="approved" className="flex items-center gap-2">
                                                Approved <Badge variant="secondary" className="ml-1">{approvedPatterns.length}</Badge>
                                            </TabsTrigger>
                                            <TabsTrigger value="rejected" className="flex items-center gap-2">
                                                Rejected <Badge variant="destructive" className="ml-1">{rejectedPatterns.length}</Badge>
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>

                                    {/* Bulk Actions Bar */}
                                    {filteredSets.length > 0 && (
                                        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/50 border">
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={selectedSets.size === filteredSets.length && filteredSets.length > 0}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    {selectedSets.size > 0 ? `${selectedSets.size} of ${filteredSets.length} selected` : `${filteredSets.length} set(s)`}
                                                </span>
                                            </div>
                                            {selectedSets.size > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleBulkAction('approved')}>
                                                        <Check className="mr-1 h-3 w-3" /> Approve Selected
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleBulkAction('rejected')}>
                                                        <X className="mr-1 h-3 w-3" /> Reject Selected
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Filtered Pattern Sets */}
                                    <div className="space-y-6">
                                        {filteredSets.length > 0 ? (
                                            filteredSets.map((set, index) => (
                                                <motion.div
                                                    key={`${activeFilter}-${set.setName}-${index}`}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                                >
                                                    <PatternSetCard
                                                        set={set}
                                                        isPendingReview={set.patterns[0]?.review_status === 'pending'}
                                                        setKey={`${set.setName}-${index}`}
                                                    />
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="text-center py-20 text-muted-foreground">
                                                <FileText className="mx-auto h-12 w-12 mb-4" />
                                                <p className="text-lg">
                                                    {activeFilter === 'pending' ? 'No pending patterns. Great job!' :
                                                     activeFilter === 'approved' ? 'No approved patterns yet.' :
                                                     activeFilter === 'rejected' ? 'No rejected patterns.' :
                                                     'No patterns found.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
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