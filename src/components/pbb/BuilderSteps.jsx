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
        <div className="flex justify-between items-start mb-4 px-2">
            {steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isActive = currentStep === step.id;
                const isNext = step.id === nextStepId && !isActive;
                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center text-center min-w-[70px] max-w-[90px] cursor-pointer" onClick={() => handleStepClick(step.id)}>
                            <div className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                                isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-secondary border-border text-muted-foreground',
                                isCompleted && !isActive && 'bg-green-600 border-green-600 text-white',
                                isNext && 'highlight-next-step'
                            )}>
                                {isCompleted ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                            </div>
                            <p className={cn(
                                'mt-2 text-xs font-medium leading-tight',
                                isActive ? 'text-foreground' : 'text-muted-foreground',
                                isCompleted && !isActive && 'text-green-600'
                            )}>
                                {step.name}
                            </p>
                        </div>
                        {index < steps.length - 1 && (<div className={`flex-1 h-0.5 mt-5 mx-1 rounded-full transition-colors duration-300 ${completedSteps.has(step.id) && completedSteps.has(step.id + 1) ? 'bg-green-600' : (currentStep > index + 1 ? 'bg-primary' : 'bg-border')}`} />)}
                    </React.Fragment>
                )
            })}
        </div>
    );
};