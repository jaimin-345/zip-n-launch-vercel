import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Info, GitMerge, ListPlus, Calendar, LayoutTemplate, UploadCloud, Eye, ShieldCheck, ArrowLeft, ArrowRight, Save, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { StepContainer } from './StepContainer';
import { usePatternHub } from '@/hooks/usePatternHub';
import { Step1_Associations } from '@/components/pbb/Step1_Associations';
import { Step2_ClassesAndDivisions } from '@/components/pbb/Step2_ClassesAndDivisions';
import { Step3_Details } from '@/components/pbb/Step3_Details';
import { Step4_Uploads } from '@/components/pbb/Step4_Uploads';
import { Step6_Preview } from '@/components/pbb/Step6_Preview';
import { Step6_PatternAndLayout } from '@/components/pbb/Step6_PatternAndLayout';
import { Step_CloseOutAndDelegate } from '@/components/pbb/Step_CloseOutAndDelegate';
import { BuilderSteps } from '@/components/pbb/BuilderSteps';
import { useToast } from '@/components/ui/use-toast';
import GenerateBookDialog from '@/components/pbb/GenerateBookDialog';
import { supabase } from '@/integrations/supabase/client';

// Base steps - step 3 name will be dynamic based on purpose
const getHubSteps = (purposeName) => [
  { id: 0, name: 'Usage Purpose', icon: Info, displayNumber: 0 },
  { id: 1, name: 'Book Details', icon: GitMerge, displayNumber: 1 },
  { id: 2, name: 'Select Disciplines', icon: ListPlus, displayNumber: 2 },
  { id: 3, name: `${purposeName || 'Show'} Details`, icon: Calendar, displayNumber: 3 },
  { id: 4, name: 'Pattern Selection', icon: LayoutTemplate, displayNumber: 4 },
  { id: 5, name: 'Uploads & Media', icon: UploadCloud, displayNumber: 5 },
  { id: 6, name: 'Preview', icon: Eye, displayNumber: 6 },
  { id: 7, name: 'Close Out & Review', icon: ShieldCheck, displayNumber: 7 },
];

const UsagePurposeStep = ({ setFormData, usageType, usagePurposes, isLoadingPurposes }) => {
    
    const getShowName = (type) => {
        if (type === 'clinic') return 'Clinic Materials';
        if (type === 'educational') return 'Educational Materials';
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

export const PatternHub = () => {
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
    } = usePatternHub();

    const [isSaving, setIsSaving] = useState(false);
    const [highestStepReached, setHighestStepReached] = useState(0);
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

    const isClinicMode = formData.usageType === 'clinic';
    const isEducationMode = formData.usageType === 'educational';

    // Get selected purpose name for dynamic step naming
    const selectedPurpose = usagePurposes.find(p => p.id === formData.usageType);
    const purposeName = selectedPurpose?.name?.replace(' Materials', '').replace(' Purchase', '') || 'Show';
    const hubSteps = useMemo(() => getHubSteps(purposeName), [purposeName]);

    const handleNext = () => {
        if (currentStep < hubSteps.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            if (nextStep > highestStepReached) {
                setHighestStepReached(nextStep);
            }
        }
    };
    const handleBack = () => currentStep > 0 && setCurrentStep(currentStep - 1);

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

            const projectData = {
                project_name: formData.showName || 'Untitled Pattern Hub Project',
                project_type: 'pattern_hub',
                project_data: formData,
                user_id: user.id,
                status: 'draft',
            };

            const { error } = await supabase
                .from('projects')
                .upsert(projectData, { onConflict: 'id' });

            if (error) throw error;

            toast({
                title: "Project Saved",
                description: "Your pattern selection has been saved successfully.",
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
                const selectedPurpose = usagePurposes.find(p => p.id === formData.usageType);
                return (
                    <Step1_Associations 
                      formData={formData} 
                      setFormData={setFormData} 
                      associationsData={associationsData}
                      onShowTypeChange={resetDisciplines}
                      isHub={true}
                      selectedPurposeName={selectedPurpose?.name || 'Pattern'}
                    />
                );
            case 2:
                return (
                    <Step2_ClassesAndDivisions formData={formData} setFormData={setFormData} disciplineLibrary={disciplineLibrary} associationsData={associationsData} />
                );
            case 3:
                return (
                    <Step3_Details formData={formData} setFormData={setFormData} purposeName={purposeName} stepNumber={3} />
                );
            case 4:
                return (
                    <Step6_PatternAndLayout formData={formData} setFormData={setFormData} associationsData={associationsData} stepNumber={4} />
                );
            case 5:
                return (
                    <Step4_Uploads formData={formData} setFormData={setFormData} isClinicMode={isClinicMode} isEducationMode={isEducationMode} stepNumber={5} purposeName={purposeName} />
                );
            case 6:
                return (
                    <Step6_Preview formData={formData} setFormData={setFormData} isEducationMode={isEducationMode} stepNumber={6} />
                );
            case 7:
                 return (
                    <Step_CloseOutAndDelegate formData={formData} setFormData={setFormData} stepNumber={7} />
                );
            default:
                return null;
        }
    };

    // Check if current step requirements are met (for enabling Next button)
    const isCurrentStepComplete = useMemo(() => {
        switch (currentStep) {
            case 0:
                return !!formData.usageType;
            case 1:
                return Object.values(formData.associations || {}).some(val => val);
            case 2:
                return formData.disciplines.length > 0;
            case 3:
                return formData.showName && formData.startDate;
            case 4:
                const patternDisciplines = formData.disciplines.filter(d => d.pattern);
                if (patternDisciplines.length === 0) return true;
                return patternDisciplines.every(pbbDiscipline => {
                    const disciplineIndex = formData.disciplines.findIndex(c => c.id === pbbDiscipline.id);
                    return (pbbDiscipline.patternGroups || []).every((_, groupIndex) => 
                        !!formData.patternSelections?.[disciplineIndex]?.[groupIndex]
                    );
                });
            case 5:
                return true; // Uploads optional
            case 6:
                return true; // Preview always completable
            case 7:
                return true;
            default:
                return false;
        }
    }, [currentStep, formData]);
    
    // Steps are completed only if they've been passed through (reached via Next button)
    const completedSteps = useMemo(() => {
        const completed = new Set();
        
        // Only mark steps as completed if we've reached beyond them
        for (let i = 0; i < highestStepReached; i++) {
            completed.add(i);
        }
        
        return completed;
    }, [highestStepReached]);

    const getNextStepId = () => {
        for (let i = 0; i < hubSteps.length; i++) {
            if (!completedSteps.has(hubSteps[i].id)) {
                return hubSteps[i].id;
            }
        }
        return hubSteps[hubSteps.length -1].id;
    };
    const nextStepId = getNextStepId();

    // Enable Next button for all steps in PatternHub
    const isNextDisabled = currentStep === hubSteps.length - 1;

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
                        <Button variant="secondary" onClick={handleSaveProject} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Project
                        </Button>
                        {currentStep === hubSteps.length - 1 ? (
                            <Button onClick={() => setIsGenerateDialogOpen(true)}>
                                <Download className="mr-2 h-4 w-4" /> Generate Book
                            </Button>
                        ) : (
                            <Button onClick={handleNext} disabled={isNextDisabled}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                        )}
                    </div>
              </div>
            </Card>
            <GenerateBookDialog
                open={isGenerateDialogOpen}
                onOpenChange={setIsGenerateDialogOpen}
                pbbData={formData}
            />
        </div>
    );
};
