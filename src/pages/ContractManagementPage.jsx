import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Building2, Users, FileText, Send, FolderOpen, CheckCircle, Save, Loader2, RotateCcw, FileSignature } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { v4 as uuidv4 } from 'uuid';
import { BuilderSteps } from '@/components/pbb/BuilderSteps';
import { applyLinkedProjectData, isBudgetFrozen } from '@/lib/contractUtils';

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
  associations: {},
  selectedAssociations: [],
  subAssociationSelections: {},
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
  const [associationsData, setAssociationsData] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const skipReloadRef = useRef(false);
  const formDataRef = useRef(formData);
  const saveProjectRef = useRef(null);

  // Sync selectedAssociations (array) from associations (object) for Step 2 compatibility
  useEffect(() => {
    const assocObj = formData.associations || {};
    const derived = Object.keys(assocObj).filter(key => assocObj[key]);
    const current = formData.selectedAssociations || [];
    // Only update if they differ to avoid infinite loops
    if (JSON.stringify(derived.sort()) !== JSON.stringify([...current].sort())) {
      setFormData(prev => ({ ...prev, selectedAssociations: derived }));
    }
  }, [formData.associations]);

  // Keep formData ref in sync for auto-save on unmount
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  // Auto-save when user navigates away from the page
  useEffect(() => {
    return () => {
      if (saveProjectRef.current) {
        saveProjectRef.current({ silent: true });
      }
    };
  }, []);

  // Load existing project or initial data
  useEffect(() => {
    // Skip reload when we just created the project (navigate changed the URL)
    if (skipReloadRef.current) {
      skipReloadRef.current = false;
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [projectsRes, associationsRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, project_name, project_type, project_data, created_at')
            .in('project_type', ['show', 'pattern_book', 'contract'])
            .order('created_at', { ascending: false }),
          supabase
            .from('associations')
            .select('*')
            .order('position')
            .order('name'),
        ]);

        if (projectsRes.error) throw projectsRes.error;
        if (associationsRes.error) throw associationsRes.error;

        setExistingProjects(projectsRes.data || []);
        setAssociationsData(associationsRes.data || []);

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
            // Migrate legacy data: convert selectedAssociations array to associations object
            if (saved.selectedAssociations?.length > 0 && (!saved.associations || Object.keys(saved.associations).length === 0)) {
              saved.associations = {};
              saved.selectedAssociations.forEach(id => { saved.associations[id] = true; });
            }

            let restoredData = { ...initialFormData, ...saved, id: sanitizedProjectId };

            // Sync from linked project: if contract has a linkedProjectId,
            // re-apply auto-fill from the linked project to pick up any
            // fields that weren't populated when the contract was first created.
            if (saved.linkedProjectId && projectsRes.data) {
              const linkedProject = projectsRes.data.find(p => p.id === saved.linkedProjectId);
              if (linkedProject) {
                const officials = saved.showDetails?.officials;
                const hasOfficials = officials && Object.keys(officials).length > 0;
                if (!hasOfficials) {
                  restoredData = applyLinkedProjectData(restoredData, linkedProject);
                  restoredData.id = sanitizedProjectId;
                }
              }
            }

            setFormData(restoredData);
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
  const saveProject = useCallback(async ({ silent = false, stepOverride = null } = {}) => {
    if (!user) {
      if (!silent) toast({ title: 'Authentication Error', description: 'You must be logged in to save.', variant: 'destructive' });
      return null;
    }

    if (!formData.showName?.trim()) {
      if (!silent) toast({ title: 'Project Name Required', description: 'Please enter a show/project name before saving.', variant: 'destructive' });
      return null;
    }

    setIsSaving(true);
    try {
      const trimmedName = formData.showName.trim();
      let currentProjectId = sanitizedProjectId || formData.id;

      // Check for duplicate project name (skip when linked to an existing project)
      if (!formData.linkedProjectId) {
        const { data: existing } = await supabase
          .from('projects')
          .select('id')
          .eq('project_type', 'contract')
          .eq('project_name', trimmedName)
          .eq('user_id', user.id);

        const isDuplicate = existing?.some(p => p.id !== currentProjectId);
        if (isDuplicate) {
          if (!silent) toast({ title: 'Duplicate Name', description: `A contract project named "${trimmedName}" already exists. Please use a different name.`, variant: 'destructive' });
          setIsSaving(false);
          return null;
        }
      }

      const stepToSave = stepOverride ?? currentStep;
      const updatedCompleted = new Set(completedSteps);
      updatedCompleted.add(currentStep);
      setCompletedSteps(updatedCompleted);

      const projectToSave = {
        ...formData,
        currentStep: stepToSave,
        completedSteps: Array.from(updatedCompleted),
      };

      const projectPayload = {
        project_name: trimmedName,
        project_type: 'contract',
        project_data: projectToSave,
        status: 'In progress',
        user_id: user.id,
      };

      if (currentProjectId) {
        const { error } = await supabase
          .from('projects')
          .update(projectPayload)
          .eq('id', currentProjectId);

        if (error) {
          if (!silent) toast({ title: 'Error saving project', description: error.message, variant: 'destructive' });
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
          if (!silent) toast({ title: 'Error creating project', description: error.message, variant: 'destructive' });
          return null;
        }

        const newProjectId = data.id;
        setFormData(prev => ({ ...prev, id: newProjectId }));
        skipReloadRef.current = true;
        navigate(`/horse-show-manager/employee-management/contracts/${newProjectId}`, { replace: true });
        if (!silent) {
          toast({ title: 'Project Created & Saved!', description: 'Your new project has been saved.' });
        }
        return newProjectId;
      }
    } catch (error) {
      if (!silent) toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [formData, currentStep, completedSteps, sanitizedProjectId, toast, navigate, user]);

  // Keep saveProject ref in sync for auto-save on unmount
  useEffect(() => { saveProjectRef.current = saveProject; }, [saveProject]);

  // Manual save button
  const handleSaveProject = async () => {
    await saveProject();
  };

  // Next with auto-save
  const handleNext = async () => {
    const nextStep = Math.min(currentStep + 1, 6);
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    await saveProject({ silent: true, stepOverride: nextStep });
    setCurrentStep(nextStep);
  };

  const handlePrev = async () => {
    await saveProject({ silent: true });
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
    if (currentStep === 2 && isBudgetFrozen(formData)) {
      toast({
        title: 'Staff Partially Locked',
        description: 'Step 2 cannot be reset because one or more contracts have been sent. Staff with sent contracts are locked.',
        variant: 'destructive',
      });
      return;
    }
    setFormData(prev => {
      switch (currentStep) {
        case 1:
          return { ...prev, associations: {}, selectedAssociations: [], subAssociationSelections: {}, showName: '', showNumber: '', selectedShow: null, showDetails: null, primaryAffiliates: [], customAssociations: [] };
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
        return <Step1_ShowStructure formData={formData} setFormData={setFormData} associationsData={associationsData} existingProjects={existingProjects} />;
      case 2:
        return <Step2_OfficialsStaff formData={formData} setFormData={setFormData} />;
      case 3:
        return <Step3_ContractTemplate formData={formData} setFormData={setFormData} />;
      case 4:
        return <Step4_GenerateContracts formData={formData} setFormData={setFormData} onSave={saveProject} isSaving={isSaving} />;
      case 5:
        return <Step5_PreviewReview formData={formData} setFormData={setFormData} />;
      case 6:
        return <Step6_CloseOut formData={formData} setFormData={setFormData} onSave={saveProject} isSaving={isSaving} />;
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
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <main className="container mx-auto px-4 py-4">
          <PageHeader title="Contract Management" />
          <div className="max-w-7xl mx-auto">
            <BuilderSteps steps={steps} currentStep={currentStep} completedSteps={completedSteps} setCurrentStep={handleStepClick} />
            <Card className="glass-effect">
              <CardContent className="p-0 sm:p-6">
                <AnimatePresence mode="wait">
                  {renderStep()}
                </AnimatePresence>
              </CardContent>
              <CardFooter className="p-4 flex justify-between items-center border-t border-border">
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
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
                      Next <ArrowRight className="ml-2 h-4 w-4" />
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
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
};

export default ContractManagementPage;
