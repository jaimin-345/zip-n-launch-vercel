import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, GitMerge, ListPlus, Calendar, UploadCloud, LayoutTemplate, Eye, FileSignature, ShieldCheck, BookCopy, Save, Loader2, Download, Settings2, Share2, RotateCcw, Lock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Step1_Associations } from '@/components/pbb/Step1_Associations';
import { Step2_ClassesAndDivisions } from '@/components/pbb/Step2_ClassesAndDivisions';
import { Step3_Details } from '@/components/pbb/Step3_Details';
import { Step4_Uploads } from '@/components/pbb/Step4_Uploads';
import { Step6_PatternAndLayout } from '@/components/pbb/Step6_PatternAndLayout';
import { Step_CloseOutAndDelegate } from '@/components/pbb/Step_CloseOutAndDelegate';
import { Step6_Preview } from '@/components/pbb/Step6_Preview';

import { BuilderSteps } from '@/components/pbb/BuilderSteps';
import { usePatternBookBuilder } from '@/hooks/usePatternBookBuilder';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import GenerateBookDialog from '@/components/pbb/GenerateBookDialog';
import { ClassConfiguration } from '@/components/pbb/ClassConfiguration';
import { useAnalytics } from '@/components/AnalyticsProvider';

const steps = [
    { id: 1, name: 'Book Details', icon: GitMerge },
    { id: 2, name: 'Select Disciplines', icon: ListPlus },
    { id: 3, name: 'Configure Classes', icon: Settings2 },
    { id: 4, name: 'Show Details', icon: Calendar },
    { id: 5, name: 'Pattern Selection', icon: LayoutTemplate },
    { id: 6, name: 'Uploads & Media', icon: UploadCloud },
    { id: 7, name: 'Preview', icon: Eye },
    { id: 8, name: 'Close Out & Review', icon: ShieldCheck },
];

const isDisciplineComplete = (pbbDiscipline, isOpenShowMode, allDisciplines = null) => {
    if (!pbbDiscipline) return false;

    // Get all merged disciplines with the same name (if provided)
    const disciplinesToCheck = allDisciplines || [pbbDiscipline];
    
    // Check if this is a scoresheet-only discipline (no pattern requirement)
    const isScoresheetOnly = disciplinesToCheck.some(disc => 
        disc && (disc.pattern_type === 'scoresheet_only' || (!disc.pattern && disc.scoresheet))
    );
    
    // Aggregate all selected divisions and grouped divisions across merged disciplines
    const allSelectedDivisions = new Set();
    const allGroupedDivisions = new Set();
    
    disciplinesToCheck.forEach(disc => {
        if (!disc) return;
        
        // Use divisionOrder as the definitive list of selected divisions
        if (disc.divisionOrder && disc.divisionOrder.length > 0) {
            disc.divisionOrder.forEach(divId => allSelectedDivisions.add(divId));
        }
        
        // Get grouped divisions for this discipline
        const groups = disc.patternGroups || [];
        groups.forEach(g => {
            (g.divisions || []).forEach(d => allGroupedDivisions.add(d.id));
        });
    });
    
    // If no divisions selected, not complete
    if (allSelectedDivisions.size === 0) {
        return false;
    }
    
    // For scoresheet-only disciplines: complete if divisions are selected (no grouping required)
    if (isScoresheetOnly) {
        return true; // Scoresheet-only disciplines are complete when divisions are selected
    }
    
    // For pattern disciplines: All selected divisions must be grouped
    return allSelectedDivisions.size === allGroupedDivisions.size && 
           [...allSelectedDivisions].every(d => allGroupedDivisions.has(d));
};


const PatternBookBuilderPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const isPreviewMode = searchParams.get('mode') === 'preview';
    const isJudgeViewMode = searchParams.get('mode') === 'judgeView';
    
    const {
        step: currentStep,
        setCurrentStep,
        nextStep,
        prevStep,
        formData,
        setFormData,
        completedSteps,
        setCompletedSteps,
        createOrUpdateProject,
        isLoading,
        disciplineLibrary,
        associationsData,
        divisionsData,
        handleShowTypeChange,
        resetCurrentStep,
    } = usePatternBookBuilder(projectId);

    // Determine user's access phase based on their delegation settings
    const userAccessInfo = useMemo(() => {
        if (!user?.email || !formData) return { canEdit: true, accessPhase: null, isStaffMember: false };
        
        const userEmail = user.email.toLowerCase();
        const delegations = formData.delegations || {};
        
        // Find the user in officials or judges
        let staffId = null;
        let staffRole = null;
        
        // Check officials
        const officials = formData.officials || [];
        const matchedOfficial = officials.find(o => o.email?.toLowerCase() === userEmail);
        if (matchedOfficial) {
            staffId = matchedOfficial.id;
            staffRole = matchedOfficial.role;
        }
        
        // Check association judges
        if (!staffId) {
            const associationJudges = formData.associationJudges || {};
            for (const assocId in associationJudges) {
                const assocData = associationJudges[assocId];
                const judgesList = assocData?.judges || (Array.isArray(assocData) ? assocData : []);
                if (Array.isArray(judgesList)) {
                    const matchedJudge = judgesList.find(j => j.email?.toLowerCase() === userEmail);
                    if (matchedJudge) {
                        staffId = matchedJudge.id;
                        staffRole = 'Judge';
                        break;
                    }
                }
            }
        }
        
        // If user is not a staff member, they have full access (project owner)
        if (!staffId) return { canEdit: true, accessPhase: null, isStaffMember: false };
        
        // Get delegation for this staff member
        const delegation = delegations[staffId];
        const accessPhase = delegation?.accessPhase || [];
        
        // Determine if user can edit based on access phase
        // 'draft' = "Draft, Build, Review" -> Can edit
        // 'approval' = "Approval and Locked" -> Read only
        // 'publication' = "Publication" -> Read only
        const hasDraftAccess = accessPhase.includes('draft');
        const hasApprovalOrPublication = accessPhase.includes('approval') || accessPhase.includes('publication');
        
        // If no access phases set, default to view-only for staff members
        if (accessPhase.length === 0) {
            return { canEdit: false, accessPhase: [], isStaffMember: true, staffRole };
        }
        
        // If has draft access, can edit; otherwise read-only
        const canEdit = hasDraftAccess && !hasApprovalOrPublication;
        
        return { canEdit, accessPhase, isStaffMember: true, staffRole };
    }, [user?.email, formData]);

    // Combine all read-only conditions
    const isReadOnly = isPreviewMode || isJudgeViewMode || (userAccessInfo.isStaffMember && !userAccessInfo.canEdit);
    const readOnlyReason = isPreviewMode ? 'Preview Mode' : 
                          isJudgeViewMode ? 'Judge View' :
                          (userAccessInfo.isStaffMember && !userAccessInfo.canEdit) ? 
                            (userAccessInfo.accessPhase?.includes('approval') ? 'Approval & Locked' : 
                             userAccessInfo.accessPhase?.includes('publication') ? 'Published' : 'No Edit Access') : null;

    const [isSaving, setIsSaving] = useState(false);
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
    const { toast } = useToast();
    const { trackBehaviorEvent, trackPatternEvent } = useAnalytics();
    const sessionStartRef = React.useRef(Date.now());

    // Track when user enters PBB with time tracking
    useEffect(() => {
        sessionStartRef.current = Date.now();
        
        trackBehaviorEvent('pbb_session_start', {
            projectId: projectId || 'new',
            isPreviewMode,
            isJudgeViewMode,
        });

        // Track time spent when leaving PBB
        return () => {
            const timeSpent = Math.round((Date.now() - sessionStartRef.current) / 1000);
            if (timeSpent > 0) {
                trackPatternEvent('pbb_session_end', {
                    patternId: projectId || 'new',
                    timeSpent: timeSpent,
                    discipline: formData.disciplines?.map(d => d.name).join(', '),
                    associationId: Object.keys(formData.associations || {}).filter(k => formData.associations[k]).join(', '),
                });
            }
        };
    }, [projectId, isPreviewMode, isJudgeViewMode]);

    // Track step changes
    useEffect(() => {
        trackBehaviorEvent('pbb_step_change', {
            step: currentStep,
            stepName: steps[currentStep - 1]?.name,
            projectId: projectId || 'new',
        });
    }, [currentStep, projectId]);

    const handleNext = () => {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        if (currentStep < steps.length) {
            nextStep();
        }
    };
    const handleBack = () => currentStep > 1 && prevStep();

    const handleSaveProject = async () => {
        setIsSaving(true);
        try {
            const savedProjectId = await createOrUpdateProject();
            
            // Calculate time spent since session start
            const timeSpent = Math.round((Date.now() - sessionStartRef.current) / 1000);
            
            // Track save event with time spent
            trackPatternEvent('save', {
                patternId: savedProjectId || projectId,
                associationId: Object.keys(formData.associations || {}).filter(k => formData.associations[k]).join(', '),
                discipline: formData.disciplines?.map(d => d.name).join(', '),
                timeSpent: timeSpent,
            });
            
            trackBehaviorEvent('pbb_project_saved', {
                projectId: savedProjectId || projectId,
                step: currentStep,
                showName: formData.showName,
            });
            
            // Only navigate if we're creating a new project (no projectId before)
            if (savedProjectId && !projectId) {
                navigate(`/pattern-book-builder/${savedProjectId}`, { replace: true });
            }
            // Don't show duplicate toast - it's already shown in the hook
        } catch (error) {
            trackBehaviorEvent('pbb_save_error', {
                projectId: projectId || 'new',
                error: error?.message,
            });
            // Error toast is handled in the hook
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetStep = () => {
        resetCurrentStep(currentStep);
        toast({
            title: 'Step Reset',
            description: `Step ${currentStep} has been reset to default values.`,
        });
    };

    const isNextDisabled = useMemo(() => {
        if (isLoading) return true;
        switch (currentStep) {
            case 1:
                return !formData.showName || !formData.associations || Object.keys(formData.associations).filter(key => formData.associations[key]).length === 0;
            case 2:
                return !(formData.disciplines && formData.disciplines.length > 0);
            case 3:
                const isOpenShowMode = formData.showType === 'open-unaffiliated' || !!formData.associations['open-show'];
                if (!formData.disciplines || formData.disciplines.length === 0) return true;
                
                // Group disciplines by name (same as ClassConfiguration) to handle merged disciplines
                const disciplineGroups = {};
                formData.disciplines.forEach(disc => {
                    const name = disc.name;
                    if (!disciplineGroups[name]) {
                        disciplineGroups[name] = [];
                    }
                    disciplineGroups[name].push(disc);
                });
                
                // Check if all discipline groups are complete
                const allComplete = Object.values(disciplineGroups).every(mergedDisciplines => {
                    const primaryDiscipline = mergedDisciplines[0];
                    return isDisciplineComplete(primaryDiscipline, isOpenShowMode, mergedDisciplines);
                });
                
                return !allComplete;
            case 4:
                return !(formData.showName && formData.startDate);
            case 5:
                return false; // Pattern & Layout validation if needed
            case 6:
                return false; // Uploads & Media is now optional
            case 7:
            case 8:
                return false;
            default:
                return !completedSteps.has(currentStep);
        }
    }, [currentStep, formData, isLoading, completedSteps]);

    const renderStepContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            );
        }
        const isOpenShowMode = formData.showType === 'open-unaffiliated' || !!formData.associations['open-show'];

        switch (currentStep) {
            case 1: return <Step1_Associations formData={formData} setFormData={setFormData} associationsData={associationsData} onShowTypeChange={handleShowTypeChange} isPBB={true} isReadOnly={isReadOnly} />;
            case 2: return <Step2_ClassesAndDivisions formData={formData} setFormData={setFormData} disciplineLibrary={disciplineLibrary} associationsData={associationsData} isReadOnly={isReadOnly} />;
            case 3: return (
                <>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xl">Step 3: Configure Classes</CardTitle>
                        <CardDescription className="text-sm">Drag to reorder, expand to configure divisions, and group patterns for each class.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ClassConfiguration
                            formData={formData}
                            setFormData={setFormData}
                            isOpenShowMode={isOpenShowMode}
                            associationsData={associationsData}
                            divisionsData={divisionsData}
                            isReadOnly={isReadOnly}
                        />
                    </CardContent>
                </>
            );
            case 4: return <Step3_Details formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />;
            case 5: return <Step6_PatternAndLayout formData={formData} setFormData={setFormData} associationsData={associationsData} isReadOnly={isReadOnly} />;
            case 6: return <Step4_Uploads formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />;
            case 7: return <Step6_Preview formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} onGoToStep={setCurrentStep} />;
            case 8: return <Step_CloseOutAndDelegate formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />;
            default: return null;
        }
    };

    return (
        <>
            <Helmet>
                <title>Pattern Book Builder - EquiPatterns</title>
                <meta name="description" content="Generate a compliant, auto-filled pattern book for your show in minutes." />
            </Helmet>
            <div className="min-h-screen bg-background text-foreground">
                <Navigation />
                <main className="container mx-auto px-4 py-4">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-4">
                        <BookCopy className="mx-auto h-12 w-12 text-primary mb-2" />
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Pattern Book Builder</h1>
                        <p className="mt-2 max-w-2xl mx-auto text-base text-muted-foreground">Generate a compliant, auto-filled pattern book for your show in minutes.</p>
                    </motion.div>
                    <div className="max-w-7xl mx-auto">
                        <BuilderSteps steps={steps} currentStep={currentStep} completedSteps={completedSteps} setCurrentStep={setCurrentStep} />
                        <Card className="glass-effect">
                            <AnimatePresence mode="wait">
                                {currentStep !== 3 ? (
                                    <CardContent className="p-0 sm:p-6">
                                        {renderStepContent()}
                                    </CardContent>
                                ) : (
                                    renderStepContent()
                                )}
                            </AnimatePresence>
                            <CardFooter className="p-4 flex justify-between items-center border-t border-border">
                            {isReadOnly ? (
                                    <>
                                        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="px-3 py-1">
                                                {userAccessInfo.isStaffMember && !userAccessInfo.canEdit ? (
                                                    <><Lock className="mr-2 h-4 w-4" /> {readOnlyReason} (Read Only)</>
                                                ) : (
                                                    <><Eye className="mr-2 h-4 w-4" /> {isJudgeViewMode ? 'Judge View' : 'Preview Mode'} (Read Only)</>
                                                )}
                                            </Badge>
                                            {currentStep < steps.length && (
                                                <Button onClick={handleNext}>
                                                    Next <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                                            {(currentStep <= 5 || currentStep === 8) && (
                                                <Button variant="ghost" size="sm" onClick={handleResetStep} className="text-muted-foreground hover:text-destructive">
                                                    <RotateCcw className="mr-1 h-4 w-4" /> Reset Step
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="secondary" onClick={handleSaveProject} disabled={isSaving}>
                                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                Save Project
                                            </Button>
                                            {currentStep === steps.length ? (
                                                <Button onClick={() => setIsGenerateDialogOpen(true)} disabled={isNextDisabled}>
                                                    <Download className="mr-2 h-4 w-4" /> Pay & Publish Pattern Book Folder
                                                </Button>
                                            ) : (
                                                <Button onClick={handleNext} disabled={isNextDisabled}>
                                                    Next <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                </main>
                <GenerateBookDialog
                    open={isGenerateDialogOpen}
                    onOpenChange={setIsGenerateDialogOpen}
                    pbbData={formData}
                />
            </div>
        </>
    );
};

export default PatternBookBuilderPage;