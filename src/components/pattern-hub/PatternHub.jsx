import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Info, Check, GitMerge, ListPlus, Calendar, UploadCloud, Eye, FileSignature, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from "@/lib/utils";
import { StepContainer } from './StepContainer';
import { usePatternHub } from '@/hooks/usePatternHub';
import { Step1_Associations } from '@/components/pbb/Step1_Associations';
import { Step2_ClassesAndDivisions } from '@/components/pbb/Step2_ClassesAndDivisions';
import { Step3_Details } from '@/components/pbb/Step3_Details';
import { Step4_Uploads } from '@/components/pbb/Step4_Uploads';
import { Step6_Preview } from '@/components/pbb/Step6_Preview';
import { Step7_PreviewScoresheets } from '@/components/pbb/Step7_PreviewScoresheets';
import { Step8_Review } from '@/components/pbb/Step8_Review';
import { ClassConfiguration } from '@/components/pbb/ClassConfiguration';
import { BuilderSteps } from '@/components/pbb/BuilderSteps';

const hubSteps = [
  { id: 0, name: 'Usage Purpose', icon: Info },
  { id: 1, name: 'Association', icon: GitMerge },
  { id: 2, name: 'Disciplines', icon: ListPlus },
  { id: 3, name: 'Configure', icon: Calendar },
  { id: 4, name: 'Media', icon: UploadCloud },
  { id: 5, name: 'Preview Patterns', icon: Eye },
  { id: 6, name: 'Preview Scoresheets', icon: FileSignature },
  { id: 7, name: 'Review & Pay', icon: ShieldCheck },
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
    const groupedDivisions = new Set((pbbDiscipline.patternGroups || []).flatMap(g => g.divisions.map(d => d.id)));
    
    if (selectedDivisions.size === 0 && (pbbDiscipline.patternGroups || []).length > 0 && (pbbDiscipline.patternGroups[0].divisions || []).length === 0 ) {
         return true; 
    }
    
    if(selectedDivisions.size === 0) return false;

    return selectedDivisions.size === groupedDivisions.size && [...selectedDivisions].every(d => groupedDivisions.has(d));
};

const UsagePurposeStep = ({ setFormData, usageType, usagePurposes, isLoadingPurposes }) => {
    
    const getShowName = (type) => {
        if (type === 'clinic') return 'Clinic Materials';
        if (type === 'educational') return 'Educational Materials';
        return 'Individual Pattern Purchase';
    };

    return (
        <StepContainer title="Pattern Used For" description="Select how you intend to use the patterns or score sheets you're looking for.">
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
    const { 
        currentStep, setCurrentStep,
        formData, setFormData,
        isLoading,
        disciplineLibrary,
        associationsData,
        divisionsData,
        usagePurposes,
        handlePurchase,
        resetDisciplines,
    } = usePatternHub();

    const isClinicMode = formData.usageType === 'clinic';
    const isEducationMode = formData.usageType === 'educational';

    const handleNext = () => currentStep < hubSteps.length -1 && setCurrentStep(currentStep + 1);
    const handleBack = () => currentStep > 0 && setCurrentStep(currentStep - 1);

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
                    />
                );
            case 2:
                return (
                    <StepContainer 
                        title={isClinicMode ? "What disciplines are you teaching at your clinic?" : isEducationMode ? "Select Learning Topics" : "Select Disciplines"} 
                        description={isClinicMode ? "Choose the disciplines you'll be teaching." : isEducationMode ? "Choose the disciplines or maneuvers you are focusing on." : "Choose the disciplines for which you need patterns or score sheets."}
                    >
                        <Step2_ClassesAndDivisions formData={formData} setFormData={setFormData} disciplineLibrary={disciplineLibrary} associationsData={associationsData} />
                    </StepContainer>
                );
            case 3:
                 return (
                    <StepContainer title="Configure Your Selections" description="Configure divisions and patterns for your selected disciplines.">
                        <ClassConfiguration 
                            formData={formData} 
                            setFormData={setFormData} 
                            isOpenShowMode={isOpenShowMode}
                            associationsData={associationsData}
                            divisionsData={divisionsData}
                        />
                    </StepContainer>
                );
            case 4:
                return (
                    <Step4_Uploads formData={formData} setFormData={setFormData} isClinicMode={isClinicMode} isEducationMode={isEducationMode}/>
                );
            case 5:
                return (
                    <Step6_Preview formData={formData} setFormData={setFormData} isEducationMode={isEducationMode} />
                );
            case 6:
                return (
                    <Step7_PreviewScoresheets formData={formData} setFormData={setFormData} />
                );
            case 7:
                 return (
                    <Step8_Review pbbData={formData} onSubmit={() => handlePurchase(mockPricing)} />
                );
            default:
                return null;
        }
    };
    
    const mockPricing = useMemo(() => {
        const patternCount = formData.disciplines.filter(c => c.pattern).length;
        const scoresheetCount = formData.disciplines.filter(c => c.scoresheet && !c.pattern).length; // only count if no pattern
        const price = (patternCount * 500) + (scoresheetCount * 200);
        return { type: 'Individual Patterns/Scoresheets', price, id: 'prod_individual_items' };
    }, [formData.disciplines]);
    
    const completedSteps = useMemo(() => {
        const completed = new Set();
        if (formData.usageType) completed.add(0);

        const hasAssociations = Object.values(formData.associations || {}).some(val => val);
        if (hasAssociations) completed.add(1);

        if (formData.disciplines.length > 0) completed.add(2);

        const isOpenShowMode = formData.showType === 'open-unaffiliated' || !!formData.associations['open-show'];
        if (formData.disciplines.length > 0 && formData.disciplines.every(disc => isDisciplineComplete(disc, isOpenShowMode))) {
            completed.add(3);
        }
        
        if (formData.coverPageOption) completed.add(4);

        const patternDisciplines = formData.disciplines.filter(d => d.pattern);
        if (patternDisciplines.length === 0) {
            completed.add(5);
        } else {
            const allPatternsSelected = patternDisciplines.every(pbbDiscipline => {
                const disciplineIndex = formData.disciplines.findIndex(c => c.id === pbbDiscipline.id);
                return (pbbDiscipline.patternGroups || []).every((_, groupIndex) => 
                    !!formData.patternSelections?.[disciplineIndex]?.[groupIndex]
                );
            });
            if (allPatternsSelected) completed.add(5);
        }

        const scoresheetDisciplines = formData.disciplines.filter(d => d.scoresheet);
        if (scoresheetDisciplines.length === 0) {
            completed.add(6);
        } else {
            const allScoresheetsSelected = scoresheetDisciplines.every(pbbDiscipline => {
                const disciplineIndex = formData.disciplines.findIndex(c => c.id === pbbDiscipline.id);
                return !!formData.scoresheetSelections?.[disciplineIndex];
            });
            if (allScoresheetsSelected) completed.add(6);
        }

        return completed;
    }, [formData]);

    const getNextStepId = () => {
        for (let i = 0; i < hubSteps.length; i++) {
            if (!completedSteps.has(hubSteps[i].id)) {
                return hubSteps[i].id;
            }
        }
        return hubSteps[hubSteps.length -1].id;
    };
    const nextStepId = getNextStepId();

    const isNextDisabled = useMemo(() => {
        if (isLoading) return true;
        if (!completedSteps.has(currentStep)) return true;
        if (currentStep === hubSteps.length - 1) return true;
        return false;
    }, [currentStep, completedSteps, isLoading]);

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
            
            <div className="flex justify-center items-start mb-4 px-4">
              {/* Usage Purpose Step - First step */}
              {(() => {
                const usageStep = hubSteps[0];
                const isCompleted = completedSteps.has(usageStep.id);
                const isActive = currentStep === usageStep.id;
                const isNext = usageStep.id === nextStepId && !isActive;
                return (
                  <>
                    <div className="flex flex-col items-center text-center w-20 cursor-pointer" onClick={() => setCurrentStep(usageStep.id)}>
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                        isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-secondary border-border text-muted-foreground',
                        isCompleted && !isActive && 'bg-green-600 border-green-600 text-white',
                        isNext && 'highlight-next-step'
                      )}>
                        {isCompleted ? <Check className="h-4 w-4"/> : <usageStep.icon className="h-4 w-4"/>}
                      </div>
                      <p className={cn(
                        'mt-1.5 text-xs font-medium',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                        isCompleted && !isActive && 'text-green-600'
                      )}>
                        {usageStep.name}
                      </p>
                    </div>
                    {/* Connector line after Usage Purpose */}
                    <div className={cn(
                      'flex-1 h-1 mt-5 mx-2 rounded-full transition-colors duration-300',
                      isCompleted && completedSteps.has(1) ? 'bg-green-600' : 
                      currentStep > 0 ? 'bg-primary' : 'bg-border'
                    )} />
                  </>
                );
              })()}

              {/* Steps 1-7 using same BuilderSteps style */}
              {hubSteps.slice(1).map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isActive = currentStep === step.id;
                const isNext = step.id === nextStepId && !isActive;
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center text-center w-20 cursor-pointer" onClick={() => setCurrentStep(step.id)}>
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                        isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-secondary border-border text-muted-foreground',
                        isCompleted && !isActive && 'bg-green-600 border-green-600 text-white',
                        isNext && 'highlight-next-step'
                      )}>
                        {isCompleted ? <Check className="h-4 w-4"/> : <step.icon className="h-4 w-4"/>}
                      </div>
                      <p className={cn(
                        'mt-1.5 text-xs font-medium',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                        isCompleted && !isActive && 'text-green-600'
                      )}>
                        {step.name}
                      </p>
                    </div>
                    {index < hubSteps.length - 2 && (
                      <div className={cn(
                        'flex-1 h-1 mt-5 mx-2 rounded-full transition-colors duration-300',
                        isCompleted && completedSteps.has(hubSteps[index + 2]?.id) ? 'bg-green-600' : 
                        currentStep > step.id ? 'bg-primary' : 'bg-border'
                      )} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <Card className="max-w-5xl mx-auto">
              <AnimatePresence mode="wait">
                <CardContent className="p-0 sm:p-6">
                    {renderStepContent()}
                </CardContent>
              </AnimatePresence>
               <div className="p-6 flex justify-between items-center border-t border-border">
                    <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <Button onClick={handleNext} disabled={isNextDisabled}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </Card>
        </div>
    );
};