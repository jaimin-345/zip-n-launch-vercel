import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useShowBuilder } from '@/hooks/useShowBuilder';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Loader2, Shield, DollarSign, HeartHandshake, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

import { AssociationStep } from '@/components/show-structure/AssociationStep';
import { FeeStructureStep } from '@/components/show-structure/FeeStructureStep';
import { SponsorsStep } from '@/components/show-structure/SponsorsStep';
import { ReviewStep } from '@/components/show-structure/ReviewStep';

const WIZARD_STEPS = [
    { id: 1, name: 'Association', icon: Shield },
    { id: 2, name: 'Fee Structure', icon: DollarSign },
    { id: 3, name: 'Sponsors', icon: HeartHandshake },
    { id: 4, name: 'Review', icon: Search },
];

const STEP_COMPONENTS = [
    { id: 1, component: AssociationStep },
    { id: 2, component: FeeStructureStep },
    { id: 3, component: SponsorsStep },
    { id: 4, component: ReviewStep },
];

const StepIndicator = ({ currentStep, completedSteps, onStepClick }) => (
    <div className="flex justify-center items-start mb-8 px-4 overflow-x-auto pb-4">
        {WIZARD_STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isActive = currentStep === step.id;
            return (
                <React.Fragment key={step.id}>
                    <button
                        type="button"
                        className="flex flex-col items-center text-center w-28 cursor-pointer flex-shrink-0 bg-transparent border-none"
                        onClick={() => onStepClick(step.id)}
                    >
                        <div className={cn(
                            'w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                            isActive && 'bg-primary border-primary text-primary-foreground shadow-lg scale-110',
                            !isActive && !isCompleted && 'bg-secondary border-border text-muted-foreground',
                            isCompleted && !isActive && 'bg-green-600 border-green-600 text-white'
                        )}>
                            {isCompleted && !isActive
                                ? <Check className="h-5 w-5" />
                                : <step.icon className="h-5 w-5" />
                            }
                        </div>
                        <p className={cn(
                            'mt-2 text-xs font-medium transition-colors',
                            isActive && 'text-foreground font-semibold',
                            !isActive && !isCompleted && 'text-muted-foreground',
                            isCompleted && !isActive && 'text-green-600'
                        )}>
                            {step.name}
                        </p>
                    </button>
                    {index < WIZARD_STEPS.length - 1 && (
                        <div className={cn(
                            'flex-1 h-1 mt-5 mx-1 rounded-full transition-colors duration-300 min-w-[2rem]',
                            isCompleted && completedSteps.has(WIZARD_STEPS[index + 1]?.id)
                                ? 'bg-green-600'
                                : currentStep > step.id
                                    ? 'bg-primary'
                                    : 'bg-border'
                        )} />
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

const AUTO_SAVE_DELAY = 3000;

const CreateHorseShowWizardPage = () => {
    const { showId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const {
        formData, setFormData, createOrUpdateShow,
        isLoading: isDataLoading, associationsData, divisionsData,
    } = useShowBuilder(showId);

    const [isSaving, setIsSaving] = useState(false);
    const [currentStep, setCurrentStepState] = useState(1);
    const [completedSteps, setCompletedSteps] = useState(new Set());
    const [autoSaveStatus, setAutoSaveStatus] = useState(null);
    const autoSaveTimer = useRef(null);
    const lastSavedData = useRef(null);

    // Auto-save: debounce formData changes
    const performAutoSave = useCallback(async () => {
        if (!formData.id && !showId) return; // Don't auto-save brand new unsaved shows
        setAutoSaveStatus('saving');
        try {
            await createOrUpdateShow();
            lastSavedData.current = JSON.stringify(formData);
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus(null), 2000);
        } catch {
            setAutoSaveStatus('error');
            setTimeout(() => setAutoSaveStatus(null), 3000);
        }
    }, [createOrUpdateShow, formData, showId]);

    useEffect(() => {
        const currentData = JSON.stringify(formData);
        if (lastSavedData.current === currentData) return;
        if (!formData.id && !showId) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(performAutoSave, AUTO_SAVE_DELAY);

        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, [formData, performAutoSave, showId]);

    const setCurrentStep = (stepNumber) => {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setCurrentStepState(stepNumber);
    };

    const nextStep = () => {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        if (currentStep < STEP_COMPONENTS.length) {
            setCurrentStepState(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStepState(prev => prev - 1);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const project = await createOrUpdateShow();
            lastSavedData.current = JSON.stringify(formData);
            if (project && !showId) {
                navigate(`/horse-show-manager/create-show/${project.id}`, { replace: true });
            }
        } catch {
            // Error handled in hook
        } finally {
            setIsSaving(false);
        }
    };

    const CurrentStepComponent = STEP_COMPONENTS.find(s => s.id === currentStep)?.component;

    if (isDataLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Create Horse Show</title>
                <meta name="description" content="Create a new horse show with our step-by-step wizard." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" onClick={() => navigate('/horse-show-manager')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Create Horse Show</h1>
                                <p className="text-sm text-muted-foreground">
                                    Step {currentStep} of {WIZARD_STEPS.length} — {WIZARD_STEPS[currentStep - 1]?.name}
                                </p>
                            </div>
                        </div>
                        {/* Auto-save indicator */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {autoSaveStatus === 'saving' && (
                                <span className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                                </span>
                            )}
                            {autoSaveStatus === 'saved' && (
                                <span className="flex items-center gap-1 text-green-600">
                                    <Check className="h-3 w-3" /> Saved
                                </span>
                            )}
                            {autoSaveStatus === 'error' && (
                                <span className="text-destructive">Auto-save failed</span>
                            )}
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <StepIndicator
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        onStepClick={setCurrentStep}
                    />

                    {/* Step Content */}
                    <Card className="mt-4">
                        <AnimatePresence mode="wait">
                            {CurrentStepComponent && (
                                <CurrentStepComponent
                                    key={currentStep}
                                    formData={formData}
                                    setFormData={setFormData}
                                    setCurrentStep={setCurrentStep}
                                    associationsData={associationsData}
                                    divisionsData={divisionsData}
                                />
                            )}
                        </AnimatePresence>
                    </Card>

                    {/* Navigation Footer */}
                    <div className="mt-8 flex justify-between items-center">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            disabled={currentStep === 1}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Previous
                        </Button>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                                {isSaving
                                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    : <Save className="mr-2 h-4 w-4" />
                                }
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                            {currentStep < STEP_COMPONENTS.length ? (
                                <Button onClick={nextStep}>
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={async () => {
                                        setIsSaving(true);
                                        try {
                                            const project = await createOrUpdateShow();
                                            lastSavedData.current = JSON.stringify(formData);
                                            const id = project?.id || showId || formData.id;
                                            toast({ title: 'Show Created!', description: 'Redirecting to Show Structure...' });
                                            if (id) {
                                                navigate(`/horse-show-manager/show-structure/${id}`, { replace: true });
                                            }
                                        } catch {
                                            // Error handled in hook
                                        } finally {
                                            setIsSaving(false);
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={isSaving}
                                >
                                    {isSaving
                                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        : <Check className="mr-2 h-4 w-4" />
                                    }
                                    Finish & Save
                                </Button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default CreateHorseShowWizardPage;
