import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, FileText, ListChecks, Upload, PenTool, Package, ShieldCheck, Save, Loader2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { BuilderSteps } from '@/components/pbb/BuilderSteps';
import { usePatternUploadWizard } from '@/hooks/usePatternUploadWizard';
import { useParams } from 'react-router-dom';
import PatternPreviewModal from '@/components/pattern-upload/PatternPreviewModal';

import { Step1_NameAndAssociations } from '@/components/pattern-upload-wizard/Step1_NameAndAssociations';
import { Step2_DisciplineAndClass } from '@/components/pattern-upload-wizard/Step2_DisciplineAndClass';
import { Step3_UploadAndOrganize } from '@/components/pattern-upload-wizard/Step3_UploadAndOrganize';
import { Step4_ManeuverAnnotation } from '@/components/pattern-upload-wizard/Step4_ManeuverAnnotation';
import { Step5_EquipmentAndDocs } from '@/components/pattern-upload-wizard/Step5_EquipmentAndDocs';
import { Step6_LicenseAndSubmit } from '@/components/pattern-upload-wizard/Step6_LicenseAndSubmit';

const steps = [
  { id: 1, name: 'Name & Associations', icon: FileText },
  { id: 2, name: 'Discipline & Class', icon: ListChecks },
  { id: 3, name: 'Upload Patterns', icon: Upload },
  { id: 4, name: 'Maneuver Editing', icon: PenTool },
  { id: 5, name: 'Equipment & Docs', icon: Package },
  { id: 6, name: 'License & Submit', icon: ShieldCheck },
];

const PatternUploadWizardPage = () => {
  const { projectId } = useParams();
  const { toast } = useToast();
  const {
    step: currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    formData,
    setFormData,
    completedSteps,
    setCompletedSteps,
    createOrUpdateProject,
    isLoading,
    isNextDisabled,
    associationsData,
    disciplineLibrary,
    divisionsData,
    hasPatterns,
    selectedAssociationIds,
    handleFileDrop,
    handleRemovePattern,
    handlePdfSplit,
    assignStagedPdf,
    removeStagedPdf,
    renameStagedPdf,
    handleAssociationChange,
    handleDifficultyChange,
    handleDivisionChange,
    handleDivisionGroupChange,
    handleBulkDivisionChange,
    handleAddAccessoryDoc,
    handleRemoveAccessoryDoc,
    handleUpdateAccessoryDoc,
  } = usePatternUploadWizard(projectId);

  const [isSaving, setIsSaving] = useState(false);
  const [previewingPattern, setPreviewingPattern] = useState(null);
  const [hoveredPattern, setHoveredPattern] = useState(null);
  const [pinnedPattern, setPinnedPattern] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const handleHover = (item) => {
    if (pinnedPattern) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredPattern(item), 300);
  };

  const handleLeave = () => {
    if (pinnedPattern) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredPattern(null);
  };

  const handlePinPattern = (item) => {
    setPinnedPattern(prev => prev && prev.id === item.id ? null : item);
    setHoveredPattern(null);
  };

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < steps.length) {
      nextStep();
    }
  };

  const handleBack = () => currentStep > 1 && prevStep();

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await createOrUpdateProject();
    } catch (error) {
      // Error toast handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <Step1_NameAndAssociations
            formData={formData}
            setFormData={setFormData}
            associationsData={associationsData}
          />
        );
      case 2:
        return (
          <Step2_DisciplineAndClass
            formData={formData}
            setFormData={setFormData}
            disciplineLibrary={disciplineLibrary}
            associationsData={associationsData}
          />
        );
      case 3:
        return (
          <Step3_UploadAndOrganize
            formData={formData}
            setFormData={setFormData}
            handleFileDrop={handleFileDrop}
            handleRemovePattern={handleRemovePattern}
            handlePdfSplit={handlePdfSplit}
            assignStagedPdf={assignStagedPdf}
            removeStagedPdf={removeStagedPdf}
            renameStagedPdf={renameStagedPdf}
            handleDivisionChange={handleDivisionChange}
            handleDivisionGroupChange={handleDivisionGroupChange}
            handleBulkDivisionChange={handleBulkDivisionChange}
            divisionsData={divisionsData}
            onHover={handleHover}
            onLeave={handleLeave}
            onPreview={setPreviewingPattern}
            hoveredPattern={hoveredPattern}
            pinnedPattern={pinnedPattern}
            handlePinPattern={handlePinPattern}
            selectedAssociationIds={selectedAssociationIds}
          />
        );
      case 4:
        return (
          <Step4_ManeuverAnnotation
            formData={formData}
            setFormData={setFormData}
          />
        );
      case 5:
        return (
          <Step5_EquipmentAndDocs
            formData={formData}
            setFormData={setFormData}
            handleAddAccessoryDoc={handleAddAccessoryDoc}
            handleRemoveAccessoryDoc={handleRemoveAccessoryDoc}
            handleUpdateAccessoryDoc={handleUpdateAccessoryDoc}
          />
        );
      case 6:
        return (
          <Step6_LicenseAndSubmit
            formData={formData}
            setFormData={setFormData}
            associationsData={associationsData}
            onGoToStep={setCurrentStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Upload Patterns - EquiPatterns</title>
        <meta name="description" content="Upload your patterns through our guided wizard." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <main className="container mx-auto px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-4"
          >
            <Upload className="mx-auto h-12 w-12 text-primary mb-2" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Upload Patterns
            </h1>
            <p className="mt-2 max-w-2xl mx-auto text-base text-muted-foreground">
              Share your expertise through our guided pattern upload wizard.
            </p>
          </motion.div>

          <div className="max-w-7xl mx-auto">
            <BuilderSteps
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              setCurrentStep={setCurrentStep}
            />

            <Card className="glass-effect">
              <AnimatePresence mode="wait">
                <CardContent className="p-0 sm:p-6">
                  {renderStepContent()}
                </CardContent>
              </AnimatePresence>

              <CardFooter className="p-4 flex justify-between items-center border-t border-border">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Draft
                  </Button>
                  {currentStep < steps.length ? (
                    <Button onClick={handleNext} disabled={isNextDisabled}>
                      Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={handleNext} disabled={isNextDisabled}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Pay & Submit Patterns
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>
        </main>

        <PatternPreviewModal
          isOpen={!!previewingPattern}
          onClose={() => setPreviewingPattern(null)}
          pattern={previewingPattern}
        />
      </div>
    </>
  );
};

export default PatternUploadWizardPage;
