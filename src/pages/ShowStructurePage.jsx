import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useShowBuilder } from '@/hooks/useShowBuilder';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Info, User, DollarSign, Trophy, Search, Check, Shield, ClipboardList, TrendingDown, CalendarDays, Hash, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { AssociationStep } from '@/components/show-structure/AssociationStep';
import { GeneralVenueStep } from '@/components/show-structure/GeneralVenueStep';
import { OfficialsStaffStep } from '@/components/show-structure/OfficialsStaffStep';
import { FeeStructureStep } from '@/components/show-structure/FeeStructureStep';
import { ShowExpensesStep } from '@/components/show-structure/ShowExpensesStep';
import { AwardsSponsorshipStep } from '@/components/show-structure/AwardsSponsorshipStep';
import { EntrySchedulingStep } from '@/components/show-structure/EntrySchedulingStep';
import { ReviewStep } from '@/components/show-structure/ReviewStep';


const WIZARD_STEPS = [
    { id: 1, name: 'Associations', icon: Shield },
    { id: 2, name: 'General & Venue', icon: Info },
    { id: 3, name: 'Officials & Staff', icon: User },
    { id: 4, name: 'Fees & Sponsors', icon: DollarSign },
    { id: 5, name: 'Show Expenses', icon: TrendingDown },
    { id: 6, name: 'Awards', icon: Trophy },
    { id: 7, name: 'Entry & Scheduling', icon: CalendarDays },
    { id: 8, name: 'Review', icon: Search },
];

const ShowInfoSteps = ({ currentStep, completedSteps, setCurrentStep }) => {
    return (
        <div className="flex justify-between items-start mb-8 px-4 overflow-x-auto pb-4">
            {WIZARD_STEPS.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isActive = currentStep === step.id;
                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center text-center w-24 cursor-pointer flex-shrink-0" onClick={() => setCurrentStep(step.id)}>
                            <div className={cn(
                                'w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                                isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-secondary border-border text-muted-foreground',
                                isCompleted && !isActive && 'bg-green-600 border-green-600 text-white'
                            )}>
                                {isCompleted && !isActive ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                            </div>
                            <p className={cn(
                                'mt-2 text-xs font-medium',
                                isActive ? 'text-foreground' : 'text-muted-foreground',
                                isCompleted && !isActive && 'text-green-600'
                            )}>
                                {step.name}
                            </p>
                        </div>
                        {index < WIZARD_STEPS.length - 1 && (<div className={`flex-1 h-1 mt-5 mx-1 rounded-full transition-colors duration-300 ${isCompleted && completedSteps.has(step.id + 1) ? 'bg-green-600' : (currentStep > index + 1 ? 'bg-primary' : 'bg-border')}`} />)}
                    </React.Fragment>
                )
            })}
        </div>
    );
};


const ShowStructurePage = () => {
    const { showId } = useParams();
    const navigate = useNavigate();
    const { formData, setFormData, createOrUpdateShow, isLoading: isDataLoading, associationsData, divisionsData } = useShowBuilder(showId);
    const [isSaving, setIsSaving] = useState(false);
    const [currentStep, setCurrentStepState] = useState(1);
    const [completedSteps, setCompletedSteps] = useState(new Set());

     const setCurrentStep = (stepNumber) => {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setCurrentStepState(stepNumber);
    };

    const steps = [
        { id: 1, component: AssociationStep },
        { id: 2, component: GeneralVenueStep },
        { id: 3, component: OfficialsStaffStep },
        { id: 4, component: FeeStructureStep },
        { id: 5, component: ShowExpensesStep },
        { id: 6, component: AwardsSponsorshipStep },
        { id: 7, component: EntrySchedulingStep },
        { id: 8, component: ReviewStep },
    ];

    const nextStep = () => {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        if (currentStep < steps.length) {
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
            if (project && !showId) {
                navigate(`/horse-show-manager/show-structure/${project.id}`, { replace: true });
            }
        } catch (error) {
            // Error is handled in hook
        } finally {
            setIsSaving(false);
        }
    };

    const CurrentStepComponent = steps.find(s => s.id === currentStep)?.component;

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
                <title>Show Structure & Fees</title>
                <meta name="description" content="Manage all the critical details, fees, and budgeting for your horse show." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="mb-6 flex items-center justify-between">
                        <Button variant="outline" onClick={() => navigate('/horse-show-manager')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Manager
                        </Button>
                        <div className="flex items-center gap-4">
                            {showId && (
                                <Button variant="outline" size="sm" onClick={() => navigate(`/horse-show-manager/financials/${showId}`)}>
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    View Financials
                                </Button>
                            )}
                            <div className="text-right">
                                <h1 className="text-xl font-bold text-foreground">
                                    {formData.showName || 'Untitled Show'}
                                </h1>
                                <div className="flex items-center justify-end gap-2 mt-1">
                                    {formData.showNumber && (
                                        <Badge variant="secondary" className="text-xs">
                                            <Hash className="h-3 w-3 mr-1" />
                                            Show #{formData.showNumber}
                                        </Badge>
                                    )}
                                    {showId && (
                                        <span className="text-xs text-muted-foreground font-mono">
                                            ID: {showId.slice(0, 8)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <ShowInfoSteps
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        setCurrentStep={setCurrentStep}
                    />

                    <Card className="mt-8">
                        <AnimatePresence mode="wait">
                            {CurrentStepComponent && <CurrentStepComponent
                                key={currentStep}
                                formData={formData}
                                setFormData={setFormData}
                                setCurrentStep={setCurrentStep}
                                associationsData={associationsData}
                                divisionsData={divisionsData}
                            />}
                        </AnimatePresence>
                    </Card>

                    <div className="mt-8 flex justify-between items-center">
                        <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <div className="flex items-center gap-3">
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isSaving ? 'Saving...' : 'Save All Details'}
                            </Button>
                            <Button onClick={nextStep} disabled={currentStep === steps.length}>
                                Next
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default ShowStructurePage;
