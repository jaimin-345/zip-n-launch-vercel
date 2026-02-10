import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Building2, Users, FileText, Send, FolderOpen, CheckCircle, Save, Loader2, RotateCcw } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

// Step Components
import { Step1_ShowStructure } from '@/components/contract-management/Step1_ShowStructure';
import { Step2_OfficialsStaff } from '@/components/contract-management/Step2_OfficialsStaff';
import { Step3_ContractTemplate } from '@/components/contract-management/Step3_ContractTemplate';
import { Step4_GenerateContracts } from '@/components/contract-management/Step4_GenerateContracts';
import { Step5_PreviewReview } from '@/components/contract-management/Step5_PreviewReview';
import { Step6_CloseOut } from '@/components/contract-management/Step6_CloseOut';

const steps = [
  { id: 1, name: 'Select Association / Affiliation', icon: Building2 },
  { id: 2, name: 'Officials & Staff', icon: Users },
  { id: 3, name: 'Contract Template', icon: FileText },
  { id: 4, name: 'Generate & Send', icon: Send },
  { id: 5, name: 'Track & Documents', icon: FolderOpen },
  { id: 6, name: 'Close Out', icon: CheckCircle },
];

const initialFormData = {
  // Steps 1-2
  selectedShow: null,
  showDetails: null,
  selectedAssociations: [],
  showName: '',
  showNumber: '',
  linkedProjectId: null,
  primaryAffiliates: [],
  customAssociations: [],
  // Step 3: Contract Template
  contractBuilder: {
    globalTemplate: '',
    employeeOverrides: {},
  },
  contractSettings: {
    effectiveDate: '',
    expirationDate: '',
    paymentMethod: 'check',
    signingDeadline: '',
    additionalTerms: '',
  },
  // Step 4: Per-employee folders
  employeeFolders: {},
  // Step 5: Delivery
  deliverySettings: {
    deliveryMethod: 'email',
    emailSubject: 'Contract Documents Ready for Review',
    emailMessage: '',
    sendReminders: true,
    requireSignature: true,
    notifyOnComplete: true,
  },
  // Step 6: Close Out
  closeOutChecklist: [],
  closeOutNotes: '',
  paymentStatus: 'unpaid',
  paymentConfirmedAt: null,
  paymentNotes: '',
  savedToProject: false,
  linkedToPersonnel: false,
};

const ContractSteps = ({ currentStep, completedSteps, onStepClick }) => {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.has(step.id);
        const isCurrent = currentStep === step.id;
        const isNext = currentStep + 1 === step.id;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => (isCompleted || isNext || isCurrent) && onStepClick(step.id)}
              disabled={!isCompleted && !isNext && !isCurrent}
              className={cn(
                "flex flex-col items-center gap-2 p-2 rounded-lg transition-all min-w-[90px]",
                isCurrent && "bg-primary/10",
                (isCompleted || isNext || isCurrent) ? "cursor-pointer hover:bg-primary/5" : "cursor-not-allowed opacity-50"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  !isCurrent && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "text-xs font-medium text-center",
                isCurrent && "text-primary",
                isCompleted && "text-green-600",
                !isCurrent && !isCompleted && "text-muted-foreground"
              )}>
                {step.name}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2",
                isCompleted ? "bg-green-500" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const ContractManagementPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const sanitizedProjectId = projectId && projectId !== 'undefined' ? projectId : null;

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingProjects, setExistingProjects] = useState([]);
  const [formData, setFormData] = useState(initialFormData);

  // Load existing project or initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, project_name, project_type, project_data, created_at')
          .in('project_type', ['show', 'pattern_book'])
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;
        setExistingProjects(projectsData || []);

        // Load existing project if projectId is present
        if (sanitizedProjectId) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('project_data')
            .eq('id', sanitizedProjectId)
            .single();

          if (projectError) throw projectError;
          if (projectData?.project_data) {
            const saved = projectData.project_data;
            setFormData(prev => ({ ...initialFormData, ...saved, id: sanitizedProjectId }));
            setCurrentStep(saved.currentStep || 1);
            setCompletedSteps(new Set(saved.completedSteps || []));
          }
        }
      } catch (error) {
        toast({
          title: 'Error fetching data',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sanitizedProjectId, toast]);

  // Save project to Supabase
  const saveProject = useCallback(async ({ silent = false } = {}) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to save.', variant: 'destructive' });
      return null;
    }

    setIsSaving(true);
    try {
      const updatedCompleted = new Set(completedSteps);
      updatedCompleted.add(currentStep);
      setCompletedSteps(updatedCompleted);

      const projectToSave = {
        ...formData,
        currentStep,
        completedSteps: Array.from(updatedCompleted),
      };

      const projectPayload = {
        project_name: formData.showName || 'Untitled Contract Project',
        project_type: 'contract',
        project_data: projectToSave,
        status: 'In progress',
        user_id: user.id,
      };

      let currentProjectId = sanitizedProjectId || formData.id;

      if (currentProjectId) {
        const { error } = await supabase
          .from('projects')
          .update(projectPayload)
          .eq('id', currentProjectId);

        if (error) {
          toast({ title: 'Error saving project', description: error.message, variant: 'destructive' });
          return null;
        }
        if (!silent) {
          toast({ title: 'Project Saved!', description: 'Your progress has been successfully saved.' });
        }
        return currentProjectId;
      } else {
        const newId = uuidv4();
        const { data, error } = await supabase
          .from('projects')
          .insert([{ ...projectPayload, id: newId }])
          .select('id')
          .single();

        if (error) {
          toast({ title: 'Error creating project', description: error.message, variant: 'destructive' });
          return null;
        }

        const newProjectId = data.id;
        setFormData(prev => ({ ...prev, id: newProjectId }));
        navigate(`/horse-show-manager/employee-management/contracts/${newProjectId}`, { replace: true });
        if (!silent) {
          toast({ title: 'Project Created & Saved!', description: 'Your new project has been saved.' });
        }
        return newProjectId;
      }
    } catch (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [formData, currentStep, completedSteps, sanitizedProjectId, toast, navigate, user]);

  // Manual save button
  const handleSaveProject = async () => {
    await saveProject();
  };

  // Next with auto-save
  const handleNext = async () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    await saveProject({ silent: true });
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Step navigation with auto-save
  const handleStepClick = async (stepId) => {
    if (stepId !== currentStep) {
      await saveProject({ silent: true });
      setCurrentStep(stepId);
    }
  };

  const handleResetStep = () => {
    setFormData(prev => {
      switch (currentStep) {
        case 1:
          return { ...prev, selectedAssociations: [], showName: '', selectedShow: null, showDetails: null, primaryAffiliates: [], customAssociations: [] };
        case 2:
          return { ...prev };
        case 3:
          return { ...prev, contractBuilder: initialFormData.contractBuilder, contractSettings: initialFormData.contractSettings };
        case 4:
          return { ...prev, employeeFolders: {} };
        case 5:
          return { ...prev, deliverySettings: initialFormData.deliverySettings };
        case 6:
          return { ...prev, closeOutChecklist: [], closeOutNotes: '', paymentStatus: 'unpaid', paymentConfirmedAt: null, paymentNotes: '', savedToProject: false, linkedToPersonnel: false };
        default:
          return prev;
      }
    });
    toast({
      title: 'Step Reset',
      description: `Step ${currentStep} has been reset to default values.`,
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_ShowStructure formData={formData} setFormData={setFormData} existingProjects={existingProjects} />;
      case 2:
        return <Step2_OfficialsStaff formData={formData} setFormData={setFormData} />;
      case 3:
        return <Step3_ContractTemplate formData={formData} setFormData={setFormData} />;
      case 4:
        return <Step4_GenerateContracts formData={formData} setFormData={setFormData} />;
      case 5:
        return <Step5_PreviewReview formData={formData} setFormData={setFormData} />;
      case 6:
        return <Step6_CloseOut formData={formData} setFormData={setFormData} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Contract Management - EquiPatterns</title>
        <meta name="description" content="Manage employee contracts and agreements." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/horse-show-manager/employee-management">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Employee Management
              </Link>
            </Button>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-sky-400">
              Contract Management
            </h1>
            <p className="text-lg text-muted-foreground">
              Generate and manage contracts for show officials and staff.
            </p>
          </motion.div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <ContractSteps
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>

              <div className="flex justify-between mt-8 pt-6 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleResetStep} className="text-muted-foreground hover:text-destructive">
                    <RotateCcw className="mr-1 h-4 w-4" /> Reset Step
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={handleSaveProject} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Project
                  </Button>
                  {currentStep < 6 ? (
                    <Button onClick={handleNext} disabled={isSaving}>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => toast({ title: 'Contracts Finalized!', description: 'All contracts have been processed successfully.' })}
                      disabled={formData.paymentStatus !== 'confirmed'}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Finalize Contracts
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
};

export default ContractManagementPage;
