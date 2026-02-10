import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BuilderSteps = ({ steps, currentStep, completedSteps = new Set(), setCurrentStep = () => {}, disabled = false, nextStepId: nextStepIdProp }) => {
    const computedNextStepId = (() => {
        for (const step of steps) {
            if (!completedSteps.has(step.id)) {
                return step.id;
            }
        }
        return steps[steps.length - 1]?.id;
    })();
    const nextStepId = nextStepIdProp ?? computedNextStepId;

    const handleStepClick = (stepId) => {
        if (disabled || !setCurrentStep) return;
        // Only allow navigation to completed steps, current step, or the next available step
        const isCompleted = completedSteps.has(stepId);
        const isCurrent = stepId === currentStep;
        const isNext = stepId === nextStepId;
        if (isCompleted || isCurrent || isNext) {
            setCurrentStep(stepId);
        }
    };

    return (
        <div className="flex items-start mb-4 w-full">
            {steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isActive = currentStep === step.id;
                const isNext = step.id === nextStepId && !isActive;
                return (
                    <React.Fragment key={step.id}>
                        <div
                            className={cn(
                                "flex flex-col items-center text-center flex-1",
                                disabled ? "cursor-default opacity-80" :
                                (isCompleted || isActive || isNext) ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                            )}
                            onClick={() => handleStepClick(step.id)}
                        >
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
                        {index < steps.length - 1 && (<div className={`w-full h-0.5 mt-5 rounded-full transition-colors duration-300 ${completedSteps.has(step.id) && completedSteps.has(steps[index + 1]?.id) ? 'bg-green-600' : (currentStep > steps[index + 1]?.id ? 'bg-primary' : 'bg-border')}`} />)}
                    </React.Fragment>
                )
            })}
        </div>
    );
};