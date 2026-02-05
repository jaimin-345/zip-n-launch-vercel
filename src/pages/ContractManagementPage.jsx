import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Building2, Users, FileText, FolderOpen, Eye, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

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
  { id: 4, name: 'Generate Contracts', icon: FolderOpen },
  { id: 5, name: 'Preview & Review', icon: Eye },
  { id: 6, name: 'Close Out', icon: CheckCircle },
];

const ContractSteps = ({ currentStep, completedSteps, setCurrentStep }) => {
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
              onClick={() => (isCompleted || isNext || isCurrent) && setCurrentStep(step.id)}
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
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [shows, setShows] = useState([]);
  const [formData, setFormData] = useState({
    // Steps 1-2
    selectedShow: null,
    showDetails: null,
    selectedAssociations: [],
    showName: '',
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
      jurisdiction: 'texas',
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
  });

  useEffect(() => {
    const fetchShows = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('project_type', 'show')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setShows(data || []);
      } catch (error) {
        toast({
          title: 'Error fetching shows',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchShows();
  }, [toast]);

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_ShowStructure formData={formData} setFormData={setFormData} shows={shows} isLoading={isLoading} />;
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
                setCurrentStep={setCurrentStep}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>

              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                {currentStep < 6 ? (
                  <Button onClick={handleNext}>
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
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
};

export default ContractManagementPage;
