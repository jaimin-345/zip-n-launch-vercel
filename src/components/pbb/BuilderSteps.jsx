import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BuilderSteps = ({ steps, currentStep, completedSteps = new Set(), setCurrentStep = () => {} }) => {
    const getNextStepId = () => {
        for (let i = 1; i <= steps.length; i++) {
            if (!completedSteps.has(i)) {
                return i;
            }
        }
        return steps.length;
    };
    const nextStepId = getNextStepId();

    const handleStepClick = (stepId) => {
        if (setCurrentStep) {
            setCurrentStep(stepId);
        }
    };

    return (
        <div className="flex justify-between items-start mb-8 px-4">
            {steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isActive = currentStep === step.id;
                const isNext = step.id === nextStepId && !isActive;
                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center text-center w-24 cursor-pointer" onClick={() => handleStepClick(step.id)}>
                            <div className={cn(
                                'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                                isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-secondary border-border text-muted-foreground',
                                isCompleted && !isActive && 'bg-green-600 border-green-600 text-white',
                                isNext && 'highlight-next-step'
                            )}>
                                {isCompleted ? <Check /> : <step.icon />}
                            </div>
                            <p className={cn(
                                'mt-2 text-xs font-medium',
                                isActive ? 'text-foreground' : 'text-muted-foreground',
                                isCompleted && !isActive && 'text-green-600'
                            )}>
                                {step.name}
                            </p>
                        </div>
                        {index < steps.length - 1 && (<div className={`flex-1 h-1 mt-6 mx-2 rounded-full transition-colors duration-300 ${completedSteps.has(step.id) && completedSteps.has(step.id + 1) ? 'bg-green-600' : (currentStep > index + 1 ? 'bg-primary' : 'bg-border')}`} />)}
                    </React.Fragment>
                )
            })}
        </div>
    );
};