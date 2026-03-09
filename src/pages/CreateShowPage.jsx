import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useShowBuilder } from '@/hooks/useShowBuilder';
import ShowBuilderSteps from '@/components/show-builder/ShowBuilderSteps';
import { Step1_ShowAssociations } from '@/components/show-builder/Step1_ShowAssociations';
import { Step2_ClassesAndDivisions } from '@/components/pbb/Step2_ClassesAndDivisions';
import { ClassConfiguration } from '@/components/pbb/ClassConfiguration';
import { Step3_ArenasAndDates } from '@/components/show-builder/Step3_ArenasAndDates';
import { Step3_ConfigureDivisions } from '@/components/show-builder/Step3_ConfigureDivisions';
import { Step4_ShowDetails } from '@/components/show-builder/Step4_ShowDetails';
import { Step6_Preview } from '@/components/show-builder/Step6_Preview';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Loader2, BookCopy } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const CreateShowPage = () => {
    const { showId } = useParams();
    const { step: currentStep, setCurrentStep, nextStep, prevStep, formData, setFormData, completedSteps, setCompletedSteps, createOrUpdateShow, isLoading, disciplineLibrary, associationsData, divisionsData, resetDisciplines, refreshDisciplineLibrary } = useShowBuilder(showId);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSave = async () => {
        try {
            const project = await createOrUpdateShow();
            if (!project) return; // validation failed (name required, duplicate, etc.)
            if (!showId || showId !== project.id) {
                navigate(`/horse-show-manager/edit/${project.id}`, { replace: true });
            }
        } catch (error) {
             toast({
                title: 'Save Failed',
                description: 'Could not save show information. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleNext = () => {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        nextStep();
    };

    const steps = [
        { id: 1, name: 'Show Structure', component: Step1_ShowAssociations },
        { id: 2, name: 'Select Disciplines', component: Step2_ClassesAndDivisions },
        { id: 3, name: 'Configure Classes', component: 'ClassConfiguration' },
        { id: 4, name: 'Show Details', component: Step4_ShowDetails },
        { id: 5, name: 'Arenas & Dates', component: Step3_ArenasAndDates },
        { id: 6, name: 'Organize Schedule', component: Step3_ConfigureDivisions },
        { id: 7, name: 'Save & Manage', component: Step6_Preview },
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
                    <PageHeader title={showId ? 'Edit Show' : 'Create a New Show'} />
                    
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
                                ) : CurrentStepComponent === 'ClassConfiguration' ? (
                                    <div key={currentStep}>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-xl">Step 3: Configure Classes</CardTitle>
                                            <CardDescription className="text-sm">Drag to reorder, expand to configure divisions, and group patterns for each class.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ClassConfiguration
                                                formData={formData}
                                                setFormData={setFormData}
                                                isOpenShowMode={formData.showType === 'open-unaffiliated' || !!formData.associations?.['open-show']}
                                                associationsData={associationsData}
                                                divisionsData={divisionsData}
                                            />
                                        </CardContent>
                                    </div>
                                ) : CurrentStepComponent ? (
                                    <CurrentStepComponent
                                        key={currentStep}
                                        formData={formData}
                                        setFormData={setFormData}
                                        disciplineLibrary={disciplineLibrary}
                                        associationsData={associationsData}
                                        divisionsData={divisionsData}
                                        resetDisciplines={resetDisciplines}
                                        createOrUpdateShow={createOrUpdateShow}
                                        onRefreshDisciplines={refreshDisciplineLibrary}
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
                                        <Button onClick={handleNext}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
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