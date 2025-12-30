import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { generatePatternBookPdf } from '@/lib/bookGenerator';
import { supabase } from '@/lib/supabaseClient';
import { useAnalytics } from '@/components/AnalyticsProvider';

const GenerateBookDialog = ({ open, onOpenChange, pbbData }) => {
  const [email, setEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { trackPatternEvent, trackBehaviorEvent } = useAnalytics();

  // Function to send notifications to assigned judges
  const sendJudgeNotifications = async () => {
    const projectName = pbbData.showName || 'Pattern Book';
    const projectId = pbbData.id || 'unknown';
    const judges = [];

    // Collect judges from associationJudges
    if (pbbData.associationJudges) {
      Object.entries(pbbData.associationJudges).forEach(([assocId, assocData]) => {
        if (assocData?.judges) {
          assocData.judges.forEach((judge) => {
            if (judge.email && judge.name) {
              judges.push({
                email: judge.email.toLowerCase(),
                name: judge.name,
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
          // Avoid duplicates
          if (!judges.some(j => j.email === official.email.toLowerCase())) {
            judges.push({
              email: official.email.toLowerCase(),
              name: official.name,
            });
          }
        }
      });
    }

    if (judges.length === 0) {
      console.log('No judges to notify');
      return;
    }

    console.log(`Sending notifications to ${judges.length} judges`);

    // Insert notifications for each judge
    const notifications = judges.map(judge => ({
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

      // Track pattern book generation
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

      // Track behavior event for PDF download
      trackBehaviorEvent('pattern_book_download', {
        showName: pbbData.showName,
        fileName,
        email,
      });

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

      // Check if the response contains an error from the edge function
      if (data?.error) {
        const errorMsg = data.error;
        if (errorMsg.includes('testing') || errorMsg.includes('verify a domain')) {
          throw new Error('Email service is in testing mode. Please use the account owner\'s email or verify a custom domain at resend.com/domains');
        }
        throw new Error(errorMsg);
      }

      // Send notifications to assigned judges AFTER successful publish
      await sendJudgeNotifications();

      // Track email sent event
      trackBehaviorEvent('pattern_book_email_sent', {
        showName: pbbData.showName,
        recipientEmail: email,
      });

      toast({
        title: 'Success!',
        description: `Pattern book sent to ${email} and downloaded.`,
      });
      onOpenChange(false);
      setEmail('');

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

      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate & Email Pattern Book</DialogTitle>
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
            <DialogFooter>
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
          </DialogContent>
        </Dialog>
      );
    };
    
    export default GenerateBookDialog;