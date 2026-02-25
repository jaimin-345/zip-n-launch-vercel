import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import LicensingAgreement from '@/components/pattern-upload/LicensingAgreement';
import SubmissionSummary from './SubmissionSummary';

export const Step6_LicenseAndSubmit = ({
  formData,
  setFormData,
  associationsData,
  onGoToStep,
}) => {
  const hasPatterns = Object.values(formData.patterns).some(p => p);

  return (
    <motion.div
      key="step-6"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Step 6: License Agreement & Submit</CardTitle>
        <CardDescription className="text-sm">
          Review your submission, agree to the licensing terms, and submit your pattern set.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Submission Summary */}
        <SubmissionSummary
          formData={formData}
          associationsData={associationsData}
          onGoToStep={onGoToStep}
        />

        {/* License Agreement */}
        <LicensingAgreement
          agreedToTerms={formData.agreedToTerms}
          setAgreedToTerms={(val) => setFormData(prev => ({ ...prev, agreedToTerms: val }))}
        />

        {/* Status indicators */}
        {!hasPatterns && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              You must upload at least one pattern before submitting.
            </p>
          </div>
        )}
      </CardContent>
    </motion.div>
  );
};
