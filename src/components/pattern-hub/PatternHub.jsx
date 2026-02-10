import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Info, GitMerge, ListPlus, Layers, LayoutTemplate, UploadCloud, Eye, ArrowLeft, ArrowRight, Save, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { StepContainer } from './StepContainer';
import { Step3_DivisionAndLevel } from './Step3_DivisionAndLevel';
import { usePatternHub } from '@/hooks/usePatternHub';
import { Step1_Associations } from '@/components/pbb/Step1_Associations';
import { Step2_ClassesAndDivisions } from '@/components/pbb/Step2_ClassesAndDivisions';
import { Step4_Uploads } from '@/components/pbb/Step4_Uploads';
import { Step6_PatternAndLayout } from '@/components/pbb/Step6_PatternAndLayout';
import { Step6_Preview } from '@/components/pbb/Step6_Preview';

import { BuilderSteps } from '@/components/pbb/BuilderSteps';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generatePatternBookPdf } from '@/lib/bookGenerator';

// All possible steps — step 3 is conditionally shown for horse_show only
const ALL_STEPS = [
  { id: 0, name: 'Usage Purpose', icon: Info },
  { id: 1, name: 'Book Details', icon: GitMerge },
  { id: 2, name: 'Select Disciplines', icon: ListPlus },
  { id: 3, name: 'Division & Level', icon: Layers, horseShowOnly: true },
  { id: 4, name: 'Pattern Selection', icon: LayoutTemplate },
  { id: 5, name: 'Uploads & Media', icon: UploadCloud },
  { id: 6, name: 'Preview', icon: Eye },
  { id: 7, name: 'Generate', icon: Download },
];

const UsagePurposeStep = ({ setFormData, usageType, usagePurposes, isLoadingPurposes }) => {
    const getShowName = (type) => {
        if (type === 'horse_show') return 'Horse Show Patterns';
        if (type === 'clinic') return '';
        if (type === 'just_for_fun') return 'Individual Pattern Purchase';
        return 'Individual Pattern Purchase';
    };

    return (
        <StepContainer title="Purpose" description="Select how you intend to use the patterns or score sheets you're looking for.">
            {isLoadingPurposes ? (
                <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-2">
                    <Label htmlFor="usage-type">Purpose</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({ ...prev, usageType: value, showName: getShowName(value) }))} value={usageType}>
                        <SelectTrigger id="usage-type" className="w-full">
                            <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                            {usagePurposes.map(purpose => (
                                <SelectItem key={purpose.id} value={purpose.id}>{purpose.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </StepContainer>
    );
};

const GenerateStep = ({ isGenerated }) => (
    <motion.div key="step-generate" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <CardHeader className="pb-3">
            <CardTitle className="text-xl">{isGenerated ? 'Generation Complete' : 'Generate Pattern'}</CardTitle>
            <CardDescription className="text-sm">
                {isGenerated
                    ? 'Your pattern has been generated, downloaded, and saved to your projects.'
                    : 'Your pattern is ready to generate. Click the button below to create and download your PDF.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <Download className="h-16 w-16 text-muted-foreground" />
                <p className="text-lg font-medium">{isGenerated ? 'Done!' : 'Ready to Generate'}</p>
                <p className="text-sm text-muted-foreground max-w-md">
                    {isGenerated
                        ? 'Your pattern PDF was downloaded and saved to My Projects. You can close this page.'
                        : 'Click "Generate Pattern" to create your pattern PDF. It will be downloaded automatically and saved to your projects.'}
                </p>
            </div>
        </CardContent>
    </motion.div>
);

export const PatternHub = ({ projectId }) => {
    const { toast } = useToast();
    const {
        currentStep, setCurrentStep,
        formData, setFormData,
        isLoading,
        disciplineLibrary,
        associationsData,
        divisionsData,
        usagePurposes,
        resetDisciplines,
        highestStepReached,
        setHighestStepReached,
    } = usePatternHub(projectId);

    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);

    const isHorseShow = formData.usageType === 'horse_show';
    const isClinic = formData.usageType === 'clinic';

    // Filter steps based on usage type
    const hubSteps = useMemo(() => {
        return ALL_STEPS
            .filter(s => !s.horseShowOnly || isHorseShow)
            .map((s, i) => ({ ...s, displayNumber: i }));
    }, [isHorseShow]);

    // Map step ID to 1-indexed display number for content titles
    const getDisplayStepNumber = (stepId) => {
        const step = hubSteps.find(s => s.id === stepId);
        return step ? step.displayNumber + 1 : stepId + 1;
    };

    // Find the max step ID in the current flow
    const maxStepId = hubSteps[hubSteps.length - 1]?.id ?? 5;

    const handleNext = () => {
        let nextStep = currentStep + 1;
        // Skip Division & Level step for non-horse-show
        if (nextStep === 3 && !isHorseShow) nextStep = 4;
        if (nextStep <= maxStepId) {
            setCurrentStep(nextStep);
            if (nextStep > highestStepReached) {
                setHighestStepReached(nextStep);
            }
        }
    };

    const handleBack = () => {
        let prevStep = currentStep - 1;
        // Skip Division & Level step for non-horse-show
        if (prevStep === 3 && !isHorseShow) prevStep = 2;
        if (prevStep >= 0) setCurrentStep(prevStep);
    };

    const handleSaveProject = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Authentication Required",
                    description: "Please log in to save your project.",
                    variant: "destructive",
                });
                return;
            }

            // Check if all steps are complete
            const isStep0Complete = !!formData.usageType;
            const isStep1Complete = Object.values(formData.associations || {}).some(val => val);
            const isStep2Complete = formData.disciplines.length > 0;
            const isStep3Complete = !isHorseShow || Object.keys(formData.selectedLevels || {}).some(assocId =>
                Object.values(formData.selectedLevels[assocId] || {}).some(levels => levels.length > 0)
            );
            const isStep4Complete = (() => {
                const patternDisciplines = formData.disciplines.filter(d => d.pattern);
                if (patternDisciplines.length === 0) return true;
                return patternDisciplines.every(pbbDiscipline => {
                    const groups = pbbDiscipline.patternGroups || [];
                    if (groups.length === 0) return true;
                    return groups.some(group =>
                        !!formData.patternSelections?.[pbbDiscipline.id]?.[group.id]?.patternId
                    );
                });
            })();

            const allStepsComplete = isStep0Complete && isStep1Complete && isStep2Complete &&
                                     isStep3Complete && isStep4Complete;

            const status = allStepsComplete ? 'Draft' : 'In progress';

            const { id: formDataId, ...formDataToSave } = formData;

            const projectData = {
                project_name: isClinic
                    ? (formData.showName || 'Untitled Clinic')
                    : (formData.showName || 'Untitled Pattern Hub Project'),
                project_type: 'pattern_hub',
                project_data: {
                    ...formDataToSave,
                    currentStep: currentStep,
                    completedSteps: Array.from(completedSteps),
                },
                user_id: user.id,
                status: status,
            };

            if (projectId && projectId !== 'undefined') {
                projectData.id = projectId;
            } else if (formDataId) {
                projectData.id = formDataId;
            }

            const { error } = await supabase
                .from('projects')
                .upsert(projectData, { onConflict: 'id' })
                .select();

            if (error) throw error;

            toast({
                title: "Project Saved",
                description: `Your project has been saved with status: ${status === 'Draft' ? 'Draft' : 'In Progress'}.`,
            });
        } catch (error) {
            toast({
                title: "Error Saving",
                description: error.message || "Failed to save project. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDirectGenerate = async () => {
        setIsGenerating(true);
        try {
            toast({ title: 'Generating PDF...', description: 'Your pattern is being created.' });

            const pdfDataUri = await generatePatternBookPdf(formData);

            // Auto-download
            const link = document.createElement('a');
            link.href = pdfDataUri;
            link.download = (formData.showName || 'Pattern').replace(/ /g, '_') + '.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Auto-save to projects
            await handleSaveProject();

            setIsGenerated(true);
            toast({ title: 'Success!', description: 'Your pattern has been generated and downloaded.' });
        } catch (error) {
            console.error('Failed to generate pattern:', error);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: error.message || 'There was a problem generating your pattern.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const renderStepContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            );
        }

        switch (currentStep) {
            case 0:
                return <UsagePurposeStep setFormData={setFormData} usageType={formData.usageType} usagePurposes={usagePurposes} isLoadingPurposes={isLoading} />;
            case 1:
                return (
                    <Step1_Associations
                      formData={formData}
                      setFormData={setFormData}
                      associationsData={associationsData}
                      onShowTypeChange={resetDisciplines}
                      isHub={true}
                      stepNumber={getDisplayStepNumber(1)}
                      selectedPurposeName={usagePurposes.find(p => p.id === formData.usageType)?.name || 'Pattern'}
                    />
                );
            case 2:
                return (
                    <Step2_ClassesAndDivisions formData={formData} setFormData={setFormData} disciplineLibrary={disciplineLibrary} associationsData={associationsData} stepNumber={getDisplayStepNumber(2)} />
                );
            case 3:
                return (
                    <Step3_DivisionAndLevel
                      formData={formData}
                      setFormData={setFormData}
                      divisionsData={divisionsData}
                      associationsData={associationsData}
                      stepNumber={getDisplayStepNumber(3)}
                    />
                );
            case 4:
                return (
                    <Step6_PatternAndLayout formData={formData} setFormData={setFormData} associationsData={associationsData} stepNumber={getDisplayStepNumber(4)} isClinicMode={formData.usageType === 'clinic'} />
                );
            case 5:
                return (
                    <Step4_Uploads formData={formData} setFormData={setFormData} isClinicMode={isClinic} isEducationMode={false} stepNumber={getDisplayStepNumber(5)} purposeName={usagePurposes.find(p => p.id === formData.usageType)?.name || 'Pattern'} />
                );
            case 6:
                return (
                    <Step6_Preview formData={formData} setFormData={setFormData} isEducationMode={false} stepNumber={getDisplayStepNumber(6)} purposeName={isClinic ? 'Clinic Materials' : null} />
                );
            case 7:
                return <GenerateStep isGenerated={isGenerated} />;
            default:
                return null;
        }
    };

    // Check if current step requirements are met
    const isCurrentStepComplete = useMemo(() => {
        switch (currentStep) {
            case 0:
                return !!formData.usageType;
            case 1: {
                const hasAssociation = Object.values(formData.associations || {}).some(val => val);
                // Clinic requires Clinic Number (stored in showName)
                if (isClinic) return hasAssociation && !!formData.showName?.trim();
                return hasAssociation;
            }
            case 2:
                return formData.disciplines.length > 0;
            case 3: {
                // Division & Level (horse show only)
                if (!isHorseShow) return true;
                return Object.keys(formData.selectedLevels || {}).some(assocId =>
                    Object.values(formData.selectedLevels[assocId] || {}).some(levels => levels.length > 0)
                );
            }
            case 4: {
                const patternDisciplines = formData.disciplines.filter(d => d.pattern);
                if (patternDisciplines.length === 0) return true;
                return patternDisciplines.every(pbbDiscipline => {
                    const groups = pbbDiscipline.patternGroups || [];
                    if (groups.length === 0) return true;
                    return groups.some(group =>
                        !!formData.patternSelections?.[pbbDiscipline.id]?.[group.id]?.patternId
                    );
                });
            }
            case 5:
                return true; // Uploads optional
            case 6:
                return true; // Preview always completable
            case 7:
                return true; // Generate step
            default:
                return false;
        }
    }, [currentStep, formData, isHorseShow]);

    // Steps are completed only if they've been passed through
    const completedSteps = useMemo(() => {
        const completed = new Set();
        for (let i = 0; i < highestStepReached; i++) {
            // Skip step 3 in completed set for non-horse-show
            if (i === 3 && !isHorseShow) continue;
            completed.add(i);
        }
        return completed;
    }, [highestStepReached, isHorseShow]);

    const getNextStepId = () => {
        for (let i = 0; i < hubSteps.length; i++) {
            if (!completedSteps.has(hubSteps[i].id)) {
                return hubSteps[i].id;
            }
        }
        return hubSteps[hubSteps.length - 1].id;
    };
    const nextStepId = getNextStepId();

    const isFinalStep = currentStep === maxStepId;

    return (
        <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Choose A Pattern</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Your central resource for individual patterns and score sheets. Find exactly what you need.
                    </p>
                </div>
            </motion.div>

            <BuilderSteps
              steps={hubSteps}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              completedSteps={completedSteps}
              nextStepId={nextStepId}
            />

            <Card className="w-full">
              <AnimatePresence mode="wait">
                <CardContent className="p-0 sm:p-6">
                    {renderStepContent()}
                </CardContent>
              </AnimatePresence>
               <div className="p-6 flex justify-between items-center border-t border-border">
                    <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <div className="flex items-center gap-2">
                        {!isClinic && (
                            <Button variant="secondary" onClick={handleSaveProject} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Project
                            </Button>
                        )}
                        {isFinalStep ? (
                            <Button onClick={handleDirectGenerate} disabled={isGenerating || isGenerated}>
                                {isGenerating ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                                ) : isGenerated ? (
                                    <><Download className="mr-2 h-4 w-4" /> Generated</>
                                ) : (
                                    <><Download className="mr-2 h-4 w-4" /> Generate Pattern</>
                                )}
                            </Button>
                        ) : (
                            <Button onClick={handleNext} disabled={isFinalStep || !isCurrentStepComplete}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
              </div>
            </Card>
        </div>
    );
};
