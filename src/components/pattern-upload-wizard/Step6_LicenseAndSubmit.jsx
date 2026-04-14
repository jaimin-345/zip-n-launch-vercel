import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent, Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import LicensingAgreement from '@/components/pattern-upload/LicensingAgreement';
import SubmissionSummary from './SubmissionSummary';

export const Step6_LicenseAndSubmit = ({
  formData,
  setFormData,
  associationsData,
  uploadSlots,
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
          uploadSlots={uploadSlots}
          onGoToStep={onGoToStep}
        />

        {/* Original Pattern Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Original Pattern Usage</CardTitle>
            <CardDescription>
              Should the original uploaded pattern be available in <strong>Choose a Pattern</strong>?
              Selecting <em>Yes</em> tags this submission as an Original Pattern (OP).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.useAsOriginal === null ? '' : formData.useAsOriginal ? 'yes' : 'no'}
              onValueChange={(v) => setFormData(prev => ({ ...prev, useAsOriginal: v === 'yes' }))}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="wiz-use-original-yes" />
                <Label htmlFor="wiz-use-original-yes" className="cursor-pointer">
                  Yes — make available as Original Pattern
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="wiz-use-original-no" />
                <Label htmlFor="wiz-use-original-no" className="cursor-pointer">
                  No — generated version only
                </Label>
              </div>
            </RadioGroup>
            {formData.useAsOriginal === null && (
              <p className="text-xs text-amber-600 mt-2">Please select an option before submitting.</p>
            )}
          </CardContent>
        </Card>

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
