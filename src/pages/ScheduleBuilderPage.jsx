import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useShowBuilder } from '@/hooks/useShowBuilder';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Loader2, Info, LayoutGrid, Layers, CalendarDays, Search, Check, Calendar as CalendarIcon } from 'lucide-react';
import { cn, parseLocalDate } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { LinkToExistingShow } from '@/components/shared/LinkToExistingShow';
import { AssociationSelection } from '@/components/shared/AssociationSelection';

import { Step3_ArenasAndDates } from '@/components/show-builder/Step3_ArenasAndDates';
import { Step2_ShowClasses } from '@/components/show-builder/Step2_ShowClasses';
import { Step5_Schedule } from '@/components/show-builder/Step5_Schedule';
import { Step6_Preview } from '@/components/show-builder/Step6_Preview';

// Combined Show Info step: associations + dates + venue
const ShowInfoStep = ({ formData, setFormData, associationsData, existingProjects }) => {
    const handleUpdate = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };
    const handleDateChange = (field, date) => {
        if (date) handleUpdate(field, format(date, 'yyyy-MM-dd'));
    };

    return (
        <motion.div key="show-info" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <AssociationSelection
                formData={formData}
                setFormData={setFormData}
                associationsData={associationsData}
                existingProjects={existingProjects}
                context="showBuilder"
                stepNumber={1}
            />
            <CardContent className="space-y-4 pt-2 pb-6">
                <h3 className="text-base font-semibold border-t pt-4">Event Dates & Venue</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label>Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn("w-full justify-start text-left font-normal", !formData.startDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.startDate ? format(parseLocalDate(formData.startDate), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={formData.startDate ? parseLocalDate(formData.startDate) : undefined}
                                    onSelect={(date) => handleDateChange('startDate', date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label>End Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn("w-full justify-start text-left font-normal", !formData.endDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.endDate ? format(parseLocalDate(formData.endDate), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={formData.endDate ? parseLocalDate(formData.endDate) : undefined}
                                    onSelect={(date) => handleDateChange('endDate', date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label>Venue Name & Address</Label>
                        <Input
                            value={formData.venueAddress || ''}
                            onChange={(e) => handleUpdate('venueAddress', e.target.value)}
                            placeholder="E.g., Grand Oak Arena, 123 Stable Rd"
                        />
                    </div>
                </div>
            </CardContent>
        </motion.div>
    );
};

const WIZARD_STEPS = [
    { id: 1, name: 'Show Info', icon: Info },
    { id: 2, name: 'Arena Setup', icon: LayoutGrid },
    { id: 3, name: 'Class Builder', icon: Layers },
    { id: 4, name: 'Schedule Builder', icon: CalendarDays },
    { id: 5, name: 'Review', icon: Search },
];

const STEP_COMPONENTS = [
    { id: 1, component: ShowInfoStep },
    { id: 2, component: Step3_ArenasAndDates, props: { stepNumber: 2, stepTitle: 'Arena Setup' } },
    { id: 3, component: Step2_ShowClasses, props: { stepNumber: 3, stepTitle: 'Class Builder' } },
    { id: 4, component: Step5_Schedule, props: { stepNumber: 4, stepTitle: 'Schedule Builder' } },
    { id: 5, component: Step6_Preview, props: { stepNumber: 5, stepTitle: 'Review' } },
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

const ScheduleBuilderPage = () => {
    const { showId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const {
        formData, setFormData, createOrUpdateShow,
        isLoading: isDataLoading, associationsData, divisionsData, existingProjects,
        disciplineLibrary, resetDisciplines,
    } = useShowBuilder(showId);

    const [isSaving, setIsSaving] = useState(false);
    const [currentStep, setCurrentStepState] = useState(1);
    const [completedSteps, setCompletedSteps] = useState(new Set());
    const [autoSaveStatus, setAutoSaveStatus] = useState(null);
    const autoSaveTimer = useRef(null);
    const lastSavedData = useRef(null);

    const performAutoSave = useCallback(async () => {
        if (!formData.id && !showId) return;
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
                navigate(`/horse-show-manager/schedule-builder/${project.id}`, { replace: true });
            }
        } catch {
            // Error handled in hook
        } finally {
            setIsSaving(false);
        }
    };

    const currentStepConfig = STEP_COMPONENTS.find(s => s.id === currentStep);
    const CurrentStepComponent = currentStepConfig?.component;
    const currentStepProps = currentStepConfig?.props || {};

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
                <title>Horse Show Schedule Builder</title>
                <meta name="description" content="Build your horse show schedule step-by-step." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" onClick={() => navigate('/horse-show-manager')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Horse Show Schedule Builder</h1>
                                <p className="text-sm text-muted-foreground">
                                    Step {currentStep} of {WIZARD_STEPS.length} — {WIZARD_STEPS[currentStep - 1]?.name}
                                </p>
                            </div>
                        </div>
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

                    <StepIndicator
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        onStepClick={setCurrentStep}
                    />

                    <LinkToExistingShow
                        existingProjects={existingProjects}
                        linkedProjectId={formData.linkedProjectId || null}
                        onLink={(projectId) => {
                            if (projectId === 'none') {
                                setFormData(prev => ({ ...prev, linkedProjectId: null }));
                            } else {
                                const project = existingProjects.find(p => p.id === projectId);
                                const pd = project?.project_data || {};
                                setFormData(prev => ({
                                    ...prev,
                                    linkedProjectId: projectId,
                                    showName: pd.showName || prev.showName,
                                    showNumber: pd.showNumber || prev.showNumber,
                                    associations: pd.associations || prev.associations,
                                    customAssociations: pd.customAssociations || prev.customAssociations,
                                    disciplines: pd.disciplines || prev.disciplines,
                                    startDate: pd.startDate || prev.startDate,
                                    endDate: pd.endDate || prev.endDate,
                                    venueAddress: pd.venueAddress || prev.venueAddress,
                                    venueName: pd.venueName || prev.venueName,
                                    arenas: pd.arenas || prev.arenas,
                                    officials: pd.officials || prev.officials,
                                    staff: pd.staff || prev.staff,
                                }));
                                toast({ title: 'Show Linked', description: `Data loaded from "${project?.project_name || 'linked show'}".` });
                            }
                        }}
                        onDuplicated={(newProject) => {
                            navigate(`/horse-show-manager/schedule-builder/${newProject.id}`, { replace: true });
                        }}
                        description="Link to an existing show to auto-fill details, or duplicate a previous show."
                    />

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
                                    existingProjects={existingProjects}
                                    disciplineLibrary={disciplineLibrary}
                                    resetDisciplines={resetDisciplines}
                                    {...currentStepProps}
                                />
                            )}
                        </AnimatePresence>
                    </Card>

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
                                            toast({ title: 'Schedule Saved!', description: 'Your show schedule has been saved successfully.' });
                                            if (id) {
                                                navigate(`/horse-show-manager/schedule-builder/${id}`, { replace: true });
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

export default ScheduleBuilderPage;
