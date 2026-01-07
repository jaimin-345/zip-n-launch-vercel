import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CreditCard, Mail, Check, ArrowRight, ArrowLeft, DollarSign } from 'lucide-react';
import { generatePatternBookPdf } from '@/lib/bookGenerator';
import { supabase } from '@/lib/supabaseClient';
import { useAnalytics } from '@/components/AnalyticsProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const GenerateBookDialog = ({ open, onOpenChange, pbbData }) => {
  const [email, setEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogStep, setDialogStep] = useState(1); // 1 = Payment, 2 = Generate & Email
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();
  const { trackPatternEvent, trackBehaviorEvent } = useAnalytics();

  // Reset dialog state when closed
  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setDialogStep(1);
      setEmail('');
    }
    onOpenChange(isOpen);
  };

  // Function to send notifications to assigned judges
  const sendJudgeNotifications = async () => {
    const projectName = pbbData.showName || 'Pattern Book';
    const projectId = pbbData.id || 'unknown';
    
    // Step 1: Collect all assigned judge names from disciplines
    const assignedJudgeNames = new Set();
    
    // Collect from groupJudges: { disciplineIndex: { groupIndex: judgeName } }
    if (pbbData.groupJudges) {
      Object.values(pbbData.groupJudges).forEach((groups) => {
        if (groups && typeof groups === 'object') {
          Object.values(groups).forEach((judgeName) => {
            if (judgeName && typeof judgeName === 'string' && judgeName.trim()) {
              assignedJudgeNames.add(judgeName.trim().toLowerCase());
            }
          });
        }
      });
    }
    
    // Collect from judgeSelections: { disciplineIndex: judgeName }
    if (pbbData.judgeSelections) {
      Object.values(pbbData.judgeSelections).forEach((judgeName) => {
        if (judgeName && typeof judgeName === 'string' && judgeName.trim()) {
          assignedJudgeNames.add(judgeName.trim().toLowerCase());
        }
      });
    }
    
    if (assignedJudgeNames.size === 0) {
      console.log('No assigned judges found to notify');
      return;
    }
    
    // Step 2: Build a map of all available judges (name -> { email, name })
    const availableJudgesMap = new Map();
    
    // Collect from associationJudges
    if (pbbData.associationJudges) {
      Object.entries(pbbData.associationJudges).forEach(([assocId, assocData]) => {
        if (assocData?.judges) {
          assocData.judges.forEach((judge) => {
            if (judge.email && judge.name) {
              const normalizedName = judge.name.trim().toLowerCase();
              availableJudgesMap.set(normalizedName, {
                email: judge.email.toLowerCase(),
                name: judge.name.trim(),
              });
            }
          });
        }
      });
    }
    
    // Also collect from officials if they have judge role
    if (pbbData.officials) {
      pbbData.officials.forEach((official) => {
        if (official.email && official.name && official.role?.toLowerCase().includes('judge')) {
          const normalizedName = official.name.trim().toLowerCase();
          if (!availableJudgesMap.has(normalizedName)) {
            availableJudgesMap.set(normalizedName, {
              email: official.email.toLowerCase(),
              name: official.name.trim(),
            });
          }
        }
      });
    }
    
    // Step 3: Match assigned judge names with available judges
    const judgesToNotify = [];
    assignedJudgeNames.forEach((assignedNameNormalized) => {
      const judgeInfo = availableJudgesMap.get(assignedNameNormalized);
      if (judgeInfo) {
        if (!judgesToNotify.some(j => j.email === judgeInfo.email)) {
          judgesToNotify.push(judgeInfo);
        }
      } else {
        console.warn(`Assigned judge "${assignedNameNormalized}" not found in available judges list`);
      }
    });
    
    if (judgesToNotify.length === 0) {
      console.log('No matching judges found to notify');
      return;
    }

    console.log(`Sending notifications to ${judgesToNotify.length} assigned judge(s):`, judgesToNotify.map(j => j.name).join(', '));

    // Step 4: Insert notifications for each assigned judge
    const notifications = judgesToNotify.map(judge => ({
      judge_email: judge.email,
      judge_name: judge.name,
      project_id: projectId,
      project_name: projectName,
      notification_type: 'assignment',
      message: `You have been assigned as a judge for "${projectName}". The pattern book is now published and available for review.`,
      is_read: false,
      created_by: email,
    }));

    try {
      const { error } = await supabase
        .from('judge_notifications')
        .insert(notifications);

      if (error) {
        console.error('Error sending judge notifications:', error);
      } else {
        console.log('Judge notifications sent successfully');
      }
    } catch (err) {
      console.error('Error sending notifications:', err);
    }
  };

  // Dummy payment handler
  const handlePayment = async () => {
    setIsProcessingPayment(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    trackBehaviorEvent('pbb_payment_processed', {
      showName: pbbData.showName,
      amount: '$0.00 (Demo)',
    });
    
    toast({
      title: 'Payment Successful',
      description: 'Demo payment processed. Proceeding to generate your pattern book.',
    });
    
    setIsProcessingPayment(false);
    setDialogStep(2);
  };

  const handleSend = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please enter an email address to send the book to.',
      });
      return;
    }

    setIsGenerating(true);
    const startTime = Date.now();
    
    try {
      toast({
        title: 'Generating PDF...',
        description: 'Your pattern book is being created. This may take a moment.',
      });

      const pdfDataUri = await generatePatternBookPdf(pbbData);

      trackPatternEvent('download', {
        patternId: pbbData.id,
        discipline: pbbData.disciplines?.map(d => d.name).join(', '),
        associationId: Object.keys(pbbData.associations || {}).filter(k => pbbData.associations[k]).join(', '),
        timeSpent: Math.round((Date.now() - startTime) / 1000),
      });

      // Trigger download
      const link = document.createElement('a');
      link.href = pdfDataUri;
      const fileName = (pbbData.showName || 'Pattern-Book').replace(/ /g, '_') + '.pdf';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      trackBehaviorEvent('pattern_book_download', {
        showName: pbbData.showName,
        fileName,
        email,
      });

      // Send notifications to assigned judges immediately after download
      await sendJudgeNotifications();

      toast({
        title: 'Sending Email...',
        description: 'Attaching the PDF and sending it to your inbox.',
      });

      const { data, error } = await supabase.functions.invoke('send-pattern-book', {
        body: JSON.stringify({
          email,
          pdfDataUri,
          bookName: pbbData.showName || 'My Pattern Book',
        }),
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      trackBehaviorEvent('pattern_book_email_sent', {
        showName: pbbData.showName,
        recipientEmail: email,
      });

      toast({
        title: 'Success!',
        description: `Pattern book sent to ${email} and downloaded.`,
      });
      handleOpenChange(false);

    } catch (error) {
      console.error('Failed to generate or send book:', error);
      trackBehaviorEvent('pattern_book_error', {
        showName: pbbData.showName,
        error: error.message,
      });
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'There was a problem generating or sending your book.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate dummy pricing
  const disciplineCount = (pbbData.disciplines || []).length;
  const customClassCount = (pbbData.disciplines || []).filter(d => d.isCustom).length;
  const basePrice = 0; // Demo mode
  const customFee = customClassCount * 50;
  const totalPrice = basePrice + customFee;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className={`flex items-center gap-2 ${dialogStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${dialogStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {dialogStep > 1 ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <span className="text-sm font-medium">Payment</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-2 ${dialogStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${dialogStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              2
            </div>
            <span className="text-sm font-medium">Generate & Email</span>
          </div>
        </div>

        {dialogStep === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Step 1: Payment
              </DialogTitle>
              <DialogDescription>
                Review your order and complete payment to proceed.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Order Summary */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pattern Book</span>
                    <span className="font-medium">{pbbData.showName || 'Untitled'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Disciplines</span>
                    <span>{disciplineCount}</span>
                  </div>
                  {customClassCount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Custom Classes</span>
                      <span>{customClassCount} × $50.00</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">DEMO</Badge>
                      <span className="text-lg font-bold text-primary">
                        ${totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Demo Payment Notice */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <DollarSign className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Demo Mode</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">This is a demonstration. No real payment will be processed.</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                disabled={isProcessingPayment}
              >
                Cancel
              </Button>
              <Button 
                onClick={handlePayment} 
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {dialogStep === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Step 2: Generate & Email Pattern Book
              </DialogTitle>
              <DialogDescription>
                A PDF of your pattern book will be generated, downloaded to your device, and sent to the email address you provide.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="col-span-3"
                  placeholder="recipient@example.com"
                  disabled={isGenerating}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDialogStep(1)}
                disabled={isGenerating}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSend}
                disabled={isGenerating || !email}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Download & Send'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
    
export default GenerateBookDialog;
