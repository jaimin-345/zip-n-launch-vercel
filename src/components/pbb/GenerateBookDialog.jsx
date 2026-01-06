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
              // Store with original name but use normalized key for lookup
              availableJudgesMap.set(normalizedName, {
                email: judge.email.toLowerCase(),
                name: judge.name.trim(), // Keep original name
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
          // Only add if not already in map (avoid duplicates)
          if (!availableJudgesMap.has(normalizedName)) {
            availableJudgesMap.set(normalizedName, {
              email: official.email.toLowerCase(),
              name: official.name.trim(), // Keep original name
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
        // Avoid duplicates by email
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

      // Check if the response contains an error from the edge function
      if (data?.error) {
        throw new Error(data.error);
      }

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