import React from 'react';
    import { motion } from 'framer-motion';
    import { cn } from '@/lib/utils';
    import { Check } from 'lucide-react';

    const ShowBuilderSteps = ({ steps, currentStep, completedSteps, setCurrentStep }) => {
      const containerVariants = {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      };

      const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 },
      };

      const canNavigateTo = (stepId) => {
        if (stepId <= currentStep) return true;
        for (let i = 1; i < stepId; i++) {
            if (!completedSteps.has(i)) {
                return false;
            }
        }
        return true;
      };

      return (
        <div className="mb-12">
          <motion.div
            className="grid grid-cols-3 md:grid-cols-6 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {steps.map((step) => {
              const isCompleted = completedSteps.has(step.id);
              const isActive = currentStep === step.id;
              const isNavigable = canNavigateTo(step.id);
              
              return (
                <motion.div
                  key={step.id}
                  variants={itemVariants}
                  className={cn(
                    'flex flex-col items-center text-center space-y-2',
                    isNavigable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                  )}
                  onClick={() => isNavigable && setCurrentStep(step.id)}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all duration-300',
                      isActive
                        ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg'
                        : isCompleted
                        ? 'bg-green-500/20 border-green-500 text-green-600 dark:text-green-400'
                        : 'bg-card border-border text-muted-foreground'
                    )}
                  >
                    {isCompleted && !isActive ? <Check className="w-6 h-6" /> : step.id}
                  </div>
                  <p
                    className={cn(
                      'text-xs font-semibold leading-tight transition-colors duration-300',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {step.name}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      );
    };

    export default ShowBuilderSteps;