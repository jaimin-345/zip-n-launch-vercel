import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, GitMerge, ListPlus, Calendar, UploadCloud, LayoutTemplate, Eye, FileSignature, ShieldCheck, BookCopy, Save, Loader2, Download, Settings2, Share2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Step1_Associations } from '@/components/pbb/Step1_Associations';
import { Step2_ClassesAndDivisions } from '@/components/pbb/Step2_ClassesAndDivisions';
import { Step3_Details } from '@/components/pbb/Step3_Details';
import { Step4_Uploads } from '@/components/pbb/Step4_Uploads';
import { Step6_PatternAndLayout } from '@/components/pbb/Step6_PatternAndLayout';
import { Step_CloseOutAndDelegate } from '@/components/pbb/Step_CloseOutAndDelegate';
import { Step8_Review } from '@/components/pbb/Step8_Review';
import { BuilderSteps } from '@/components/pbb/BuilderSteps';
import { usePatternBookBuilder } from '@/hooks/usePatternBookBuilder';
import { useParams, useNavigate } from 'react-router-dom';
import GenerateBookDialog from '@/components/pbb/GenerateBookDialog';
import { ClassConfiguration } from '@/components/pbb/ClassConfiguration';

const steps = [
    { id: 1, name: 'Book Details', icon: GitMerge },
    { id: 2, name: 'Select Disciplines', icon: ListPlus },
    { id: 3, name: 'Configure Classes', icon: Settings2 },
    { id: 4, name: 'Show Details', icon: Calendar },
    { id: 5, name: 'Pattern & Layout', icon: LayoutTemplate },
    { id: 6, name: 'Uploads & Media', icon: UploadCloud },
    { id: 7, name: 'Review & Finalize', icon: ShieldCheck },
    { id: 8, name: 'Close Out & Delegate', icon: Share2 },
];

const isDisciplineComplete = (pbbDiscipline, isOpenShowMode) => {
    if (!pbbDiscipline) return false;

    const getSelectedDivisionsSet = () => {
        const divisions = new Set();
        if (!pbbDiscipline.divisions) return divisions;

        if (pbbDiscipline.isCustom && isOpenShowMode) {
            const openShowDivs = pbbDiscipline.divisions['open-show'] || {};
            Object.entries(openShowDivs).forEach(([group, levels]) => {
                if (Array.isArray(levels)) {
                    levels.forEach(level => divisions.add(`open-show-${group} - ${level}`));
                }
            });
        } else {
            Object.entries(pbbDiscipline.divisions).forEach(([assocId, divs]) => {
                Object.keys(divs || {}).filter(d => divs[d]).forEach(divisionKey => {
                    divisions.add(`${assocId}-${divisionKey}`);
                });
            });
        }
        return divisions;
    };

    const selectedDivisions = getSelectedDivisionsSet();
    const hasPattern = !(pbbDiscipline.pattern_type === 'none' || pbbDiscipline.pattern_type === 'scoresheet_only' || !pbbDiscipline.pattern);

    if (!hasPattern) {
        return selectedDivisions.size > 0;
    }

    const groupedDivisions = new Set((pbbDiscipline.patternGroups || []).flatMap(g => g.divisions.map(d => d.id)));

    if (selectedDivisions.size === 0) {
        return (pbbDiscipline.patternGroups || []).length > 0 && (pbbDiscipline.patternGroups[0].divisions || []).length === 0;
    }

    return selectedDivisions.size === groupedDivisions.size && [...selectedDivisions].every(d => groupedDivisions.has(d));
};


const PatternBookBuilderPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
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
    } = usePatternBookBuilder(projectId);

    const [isSaving, setIsSaving] = useState(false);
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
    const { toast } = useToast();

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
            // Only navigate if we're creating a new project (no projectId before)
            if (savedProjectId && !projectId) {
                navigate(`/pattern-book-builder/${savedProjectId}`, { replace: true });
            }
            // Don't show duplicate toast - it's already shown in the hook
        } catch (error) {
            // Error toast is handled in the hook
        } finally {
            setIsSaving(false);
        }
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
                return !(formData.disciplines && formData.disciplines.length > 0 && formData.disciplines.every(disc => isDisciplineComplete(disc, isOpenShowMode)));
            case 4:
                return !(formData.showName && formData.startDate && formData.venueAddress);
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
            case 1: return <Step1_Associations formData={formData} setFormData={setFormData} associationsData={associationsData} onShowTypeChange={handleShowTypeChange} isPBB={true} />;
            case 2: return <Step2_ClassesAndDivisions formData={formData} setFormData={setFormData} disciplineLibrary={disciplineLibrary} associationsData={associationsData} />;
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
                        />
                    </CardContent>
                </>
            );
            case 4: return <Step3_Details formData={formData} setFormData={setFormData} />;
            case 5: return <Step6_PatternAndLayout formData={formData} setFormData={setFormData} associationsData={associationsData} />;
            case 6: return <Step4_Uploads formData={formData} setFormData={setFormData} />;
            case 7: return <Step8_Review pbbData={formData} onBack={prevStep} onSubmit={() => setIsGenerateDialogOpen(true)} />;
            case 8: return <Step_CloseOutAndDelegate formData={formData} setFormData={setFormData} />;
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
                                <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                                <div className="flex items-center gap-2">
                                    <Button variant="secondary" onClick={handleSaveProject} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Project
                                    </Button>
                                    {currentStep === steps.length ? (
                                        <Button onClick={() => setIsGenerateDialogOpen(true)} disabled={isNextDisabled}>
                                            <Download className="mr-2 h-4 w-4" /> Generate Book
                                        </Button>
                                    ) : (
                                        <Button onClick={handleNext} disabled={isNextDisabled}>
                                            Next <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
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