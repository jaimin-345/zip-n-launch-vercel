import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import LicensingAgreement from '@/components/pattern-upload/LicensingAgreement';
import SubmissionSummary from './SubmissionSummary';
import { submitPatternSet } from '@/lib/patternUploadUtils';

export const Step6_LicenseAndSubmit = ({
  formData,
  setFormData,
  associationsData,
  onGoToStep,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { createCheckoutSession, checkoutLoading } = useSubscription();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasPatterns = Object.values(formData.patterns).some(p => p);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to submit.', variant: 'destructive' });
      return;
    }
    if (!formData.agreedToTerms) {
      toast({ title: 'Terms Required', description: 'Please agree to the licensing terms.', variant: 'destructive' });
      return;
    }
    if (!hasPatterns) {
      toast({ title: 'No Patterns', description: 'Please upload at least one pattern.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit pattern data first
      await submitPatternSet(formData, user);

      toast({ title: 'Patterns Submitted!', description: 'Your pattern set has been submitted for review.' });

      // Redirect to Stripe Checkout for payment
      try {
        await createCheckoutSession('pattern_upload_submission', {
          pattern_set_name: formData.showName,
          user_id: user.id,
        });
      } catch (stripeError) {
        // If Stripe fails (e.g. no price configured yet), patterns are still submitted
        console.warn('Stripe checkout error:', stripeError);
        toast({
          title: 'Patterns Submitted',
          description: 'Your patterns were submitted successfully. Payment processing will be available soon.',
        });
      }
    } catch (error) {
      toast({ title: 'Submission Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
