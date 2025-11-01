import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useShowBuilder } from '@/hooks/useShowBuilder';
import ShowBuilderSteps from '@/components/show-builder/ShowBuilderSteps';
import { Step1_ShowAssociations } from '@/components/show-builder/Step1_ShowAssociations';
import { Step2_ShowClasses } from '@/components/show-builder/Step2_ShowClasses';
import { Step3_ConfigureDivisions } from '@/components/show-builder/Step3_ConfigureDivisions';
import { Step4_ShowDetails } from '@/components/show-builder/Step4_ShowDetails';
import { Step5_Schedule } from '@/components/show-builder/Step5_Schedule';
import { Step6_Preview } from '@/components/show-builder/Step6_Preview';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Loader2, BookCopy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const CreateShowPage = () => {
    const { showId } = useParams();
    const { step: currentStep, setCurrentStep, nextStep, prevStep, formData, setFormData, completedSteps, createOrUpdateShow, isLoading, disciplineLibrary, associationsData, divisionsData, resetDisciplines } = useShowBuilder(showId);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSave = async () => {
        try {
            const project = await createOrUpdateShow();
            if (project && (!showId || showId !== project.id)) {
                navigate(`/horse-show-manager/edit/${project.id}`, { replace: true });
            }
             toast({
                title: 'Progress Saved!',
                description: 'Your show information has been successfully saved.',
            });
        } catch (error) {
             toast({
                title: 'Save Failed',
                description: 'Could not save show information. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const steps = [
        { id: 1, name: 'Show Structure', component: Step1_ShowAssociations },
        { id: 2, name: 'Select Disciplines', component: Step2_ShowClasses },
        { id: 3, name: 'Configure Classes', component: Step3_ConfigureDivisions },
        { id: 4, name: 'Details & Staff', component: Step4_ShowDetails },
        { id: 5, name: 'Build Schedule', component: Step5_Schedule },
        { id: 6, name: 'Preview & Finalize', component: Step6_Preview },
    ];

    const CurrentStepComponent = steps.find(s => s.id === currentStep)?.component;

    return (
        <>
            <Helmet>
                <title>{showId ? 'Edit' : 'Create'} Show - Horse Show Manager</title>
                <meta name="description" content="Build your horse show schedule and details step-by-step." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-8">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-8">
                        <BookCopy className="mx-auto h-16 w-16 text-primary mb-4" />
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                            {showId ? 'Edit Show' : 'Create a New Show'}
                        </h1>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                            Effortlessly build your complete horse show from start to finish.
                        </p>
                    </motion.div>
                    
                    <div className="max-w-7xl mx-auto">
                        <ShowBuilderSteps
                            currentStep={currentStep}
                            completedSteps={completedSteps}
                            setCurrentStep={setCurrentStep}
                            steps={steps}
                        />
                        <Card className="mt-8 glass-effect">
                            <AnimatePresence mode="wait">
                                { isLoading ? (
                                    <CardContent className="flex items-center justify-center p-16">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    </CardContent>
                                ) : CurrentStepComponent ? (
                                    <CurrentStepComponent 
                                        key={currentStep} 
                                        formData={formData} 
                                        setFormData={setFormData} 
                                        disciplineLibrary={disciplineLibrary}
                                        associationsData={associationsData}
                                        divisionsData={divisionsData}
                                        resetDisciplines={resetDisciplines}
                                    />
                                ) : (
                                    <CardContent className="flex items-center justify-center p-16">
                                        <p>Step not found.</p>
                                    </CardContent>
                                )}
                            </AnimatePresence>
                            <CardFooter className="p-6 flex justify-between items-center border-t border-border">
                                <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button variant="secondary" onClick={handleSave} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Progress
                                    </Button>
                                    {currentStep === steps.length ? (
                                         <Button onClick={() => alert("Finalize!")} >Finalize Show</Button>
                                    ) : (
                                        <Button onClick={nextStep}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                </main>
            </div>
        </>
    );
};

export default CreateShowPage;