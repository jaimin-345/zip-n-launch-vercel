import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, FileCheck, Send, Archive, AlertCircle, ClipboardCheck } from 'lucide-react';

const closeOutChecklist = [
  { id: 'all_signed', label: 'All contracts have been signed', required: true },
  { id: 'copies_distributed', label: 'Copies distributed to all parties', required: true },
  { id: 'payment_terms_confirmed', label: 'Payment terms confirmed with finance', required: false },
  { id: 'schedule_confirmed', label: 'Schedules confirmed with all personnel', required: false },
  { id: 'emergency_contacts', label: 'Emergency contact information collected', required: false },
  { id: 'archived', label: 'Original documents archived', required: true },
];

export const Step5_CloseOut = ({ formData, setFormData }) => {
  const checkedItems = formData.closeOutChecklist || [];
  const closeOutNotes = formData.closeOutNotes || '';

  const handleToggleItem = (itemId) => {
    setFormData(prev => {
      const current = prev.closeOutChecklist || [];
      if (current.includes(itemId)) {
        return { ...prev, closeOutChecklist: current.filter(id => id !== itemId) };
      } else {
        return { ...prev, closeOutChecklist: [...current, itemId] };
      }
    });
  };

  const handleNotesChange = (value) => {
    setFormData(prev => ({ ...prev, closeOutNotes: value }));
  };

  const requiredItems = closeOutChecklist.filter(item => item.required);
  const allRequiredComplete = requiredItems.every(item => checkedItems.includes(item.id));
  const completionPercentage = Math.round((checkedItems.length / closeOutChecklist.length) * 100);

  return (
    <motion.div
      key="step5"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Step 5: Close Out
        </CardTitle>
        <CardDescription>
          Complete the checklist to finalize the contract management process.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        {/* Progress */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Completion Progress</h4>
            <span className="text-2xl font-bold text-primary">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {checkedItems.length} of {closeOutChecklist.length} items completed
          </p>
        </Card>

        {/* Checklist */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Close Out Checklist
          </h4>
          {closeOutChecklist.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                checkedItems.includes(item.id)
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => handleToggleItem(item.id)}
            >
              <Checkbox
                checked={checkedItems.includes(item.id)}
                onCheckedChange={() => handleToggleItem(item.id)}
              />
              <Label className="flex-1 cursor-pointer">{item.label}</Label>
              {item.required && (
                <Badge variant={checkedItems.includes(item.id) ? 'default' : 'destructive'}>
                  {checkedItems.includes(item.id) ? 'Complete' : 'Required'}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="closeout-notes">Close Out Notes</Label>
          <Textarea
            id="closeout-notes"
            placeholder="Add any notes or comments about the contract process..."
            value={closeOutNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={4}
          />
        </div>

        {/* Status */}
        {!allRequiredComplete && (
          <Card className="p-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                  Required Items Pending
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Please complete all required items before finalizing.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button variant="outline">
            <Send className="h-4 w-4 mr-2" />
            Send Summary Email
          </Button>
          <Button variant="outline">
            <Archive className="h-4 w-4 mr-2" />
            Archive Documents
          </Button>
          <Button disabled={!allRequiredComplete}>
            <FileCheck className="h-4 w-4 mr-2" />
            Complete Close Out
          </Button>
        </div>
      </CardContent>
    </motion.div>
  );
};
