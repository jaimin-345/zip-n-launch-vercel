import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle, DollarSign, Save, Link2, Download, Send,
  AlertTriangle, ShieldCheck, Archive, CalendarCheck, Users, FolderOpen, FileText,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { flattenPersonnel } from '@/lib/contractUtils';

const REQUIRED_DOC_IDS = ['signed_contract', 'w9_form', 'association_member_id', 'emergency_contact'];

const closeOutItems = [
  { id: 'all_signed', label: 'All contracts signed and approved', required: true, icon: ShieldCheck },
  { id: 'all_docs_collected', label: 'All required documents collected from employees', required: true, icon: FileText },
  { id: 'payment_confirmed', label: 'Payment terms confirmed and payment received/scheduled', required: true, icon: DollarSign },
  { id: 'copies_distributed', label: 'Copies distributed to all parties', required: true, icon: Send },
  { id: 'saved_to_project', label: 'Finalized contracts saved within the Horse Show project', required: true, icon: Save },
  { id: 'linked_to_personnel', label: 'Contracts linked to personnel records', required: true, icon: Link2 },
  { id: 'schedule_confirmed', label: 'Schedules confirmed with all personnel', required: false, icon: CalendarCheck },
  { id: 'archived', label: 'Original documents archived for records', required: false, icon: Archive },
];

const PAYMENT_STATUS_CONFIG = {
  unpaid: { label: 'Unpaid', className: 'bg-red-500/10 text-red-600 border-red-600/30', icon: AlertTriangle },
  partial: { label: 'Partial', className: 'bg-amber-500/10 text-amber-600 border-amber-600/30', icon: DollarSign },
  confirmed: { label: 'Confirmed', className: 'bg-green-500/10 text-green-600 border-green-600/30', icon: ShieldCheck },
};

export const Step6_CloseOut = ({ formData, setFormData }) => {
  const { toast } = useToast();
  const checkedItems = formData.closeOutChecklist || [];
  const paymentStatus = formData.paymentStatus || 'unpaid';
  const isPaymentConfirmed = paymentStatus === 'confirmed';

  // Approval & document status from employee folders
  const approvalStats = useMemo(() => {
    const personnel = flattenPersonnel(formData);
    const folders = formData.employeeFolders || {};
    const total = personnel.length;
    const approved = personnel.filter(m => folders[m.id]?.signatureStatus === 'approved').length;
    const docsCollected = personnel.filter(m => {
      const docs = folders[m.id]?.documents;
      if (!docs) return false;
      return REQUIRED_DOC_IDS.every(id => docs[id]?.status === 'complete');
    }).length;
    return {
      total,
      approved,
      allApproved: total > 0 && approved === total,
      docsCollected,
      allDocsCollected: total > 0 && docsCollected === total,
    };
  }, [formData.showDetails?.officials, formData.employeeFolders]);

  const requiredItems = closeOutItems.filter(i => i.required);
  const allRequiredComplete = requiredItems.every(i => checkedItems.includes(i.id));
  const progress = closeOutItems.length > 0 ? (checkedItems.length / closeOutItems.length) * 100 : 0;

  // Auto-check all_signed when all contracts are approved
  useEffect(() => {
    if (approvalStats.allApproved && !checkedItems.includes('all_signed')) {
      setFormData(prev => ({
        ...prev,
        closeOutChecklist: [...(prev.closeOutChecklist || []), 'all_signed'],
      }));
    }
    if (!approvalStats.allApproved && checkedItems.includes('all_signed')) {
      setFormData(prev => ({
        ...prev,
        closeOutChecklist: (prev.closeOutChecklist || []).filter(id => id !== 'all_signed'),
      }));
    }
  }, [approvalStats.allApproved]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-check all_docs_collected when all documents are collected
  useEffect(() => {
    if (approvalStats.allDocsCollected && !checkedItems.includes('all_docs_collected')) {
      setFormData(prev => ({
        ...prev,
        closeOutChecklist: [...(prev.closeOutChecklist || []), 'all_docs_collected'],
      }));
    }
    if (!approvalStats.allDocsCollected && checkedItems.includes('all_docs_collected')) {
      setFormData(prev => ({
        ...prev,
        closeOutChecklist: (prev.closeOutChecklist || []).filter(id => id !== 'all_docs_collected'),
      }));
    }
  }, [approvalStats.allDocsCollected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-check payment_confirmed when payment status changes
  useEffect(() => {
    if (isPaymentConfirmed && !checkedItems.includes('payment_confirmed')) {
      setFormData(prev => ({
        ...prev,
        closeOutChecklist: [...(prev.closeOutChecklist || []), 'payment_confirmed'],
      }));
    }
    if (!isPaymentConfirmed && checkedItems.includes('payment_confirmed')) {
      setFormData(prev => ({
        ...prev,
        closeOutChecklist: (prev.closeOutChecklist || []).filter(id => id !== 'payment_confirmed'),
      }));
    }
  }, [isPaymentConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleItem = (itemId) => {
    // Don't allow manual toggle for auto-managed items
    if (itemId === 'all_signed' || itemId === 'all_docs_collected' || itemId === 'payment_confirmed' || itemId === 'saved_to_project' || itemId === 'linked_to_personnel') return;

    setFormData(prev => {
      const current = prev.closeOutChecklist || [];
      if (current.includes(itemId)) {
        return { ...prev, closeOutChecklist: current.filter(id => id !== itemId) };
      }
      return { ...prev, closeOutChecklist: [...current, itemId] };
    });
  };

  const handlePaymentStatusChange = (newStatus) => {
    if (newStatus === 'confirmed' && !approvalStats.allApproved) {
      toast({
        title: 'Cannot Confirm Payment',
        description: 'All contracts must be approved before confirming payment.',
        variant: 'destructive',
      });
      return;
    }
    setFormData(prev => ({
      ...prev,
      paymentStatus: newStatus,
      paymentConfirmedAt: newStatus === 'confirmed' ? new Date().toISOString() : prev.paymentConfirmedAt,
    }));
  };

  const handleSaveToProject = () => {
    setFormData(prev => {
      const newChecklist = prev.closeOutChecklist || [];
      return {
        ...prev,
        savedToProject: true,
        closeOutChecklist: newChecklist.includes('saved_to_project')
          ? newChecklist
          : [...newChecklist, 'saved_to_project'],
      };
    });
    toast({ title: 'Contracts Saved', description: 'Finalized contracts saved to the Horse Show project.' });
  };

  const handleLinkToPersonnel = () => {
    setFormData(prev => {
      const newChecklist = prev.closeOutChecklist || [];
      return {
        ...prev,
        linkedToPersonnel: true,
        closeOutChecklist: newChecklist.includes('linked_to_personnel')
          ? newChecklist
          : [...newChecklist, 'linked_to_personnel'],
      };
    });
    toast({ title: 'Contracts Linked', description: 'Contracts linked to personnel records.' });
  };

  const handleCompleteCloseOut = () => {
    toast({ title: 'Close Out Complete', description: 'All contracts have been finalized and closed out successfully.' });
  };

  const paymentCfg = PAYMENT_STATUS_CONFIG[paymentStatus] || PAYMENT_STATUS_CONFIG.unpaid;
  const PaymentIcon = paymentCfg.icon;

  return (
    <motion.div
      key="step6"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Step 6: Close Out
        </CardTitle>
        <CardDescription>
          Confirm payment, finalize contracts, and complete the close out process.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 space-y-6">
        {/* Approval & Document Status Banners */}
        <div className="space-y-3">
          <Card className={`p-4 ${approvalStats.allApproved ? 'bg-green-500/5 border-green-500/30' : 'bg-amber-500/5 border-amber-500/30'}`}>
            <div className="flex items-center gap-3">
              {approvalStats.allApproved ? (
                <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${approvalStats.allApproved ? 'text-green-600' : 'text-amber-600'}`}>
                  {approvalStats.allApproved
                    ? 'All Contracts Approved — Eligible for Payment'
                    : `${approvalStats.approved} of ${approvalStats.total} Contracts Approved`}
                </p>
                {!approvalStats.allApproved && (
                  <p className="text-sm text-muted-foreground">
                    All contracts must be approved in Step 4 before confirming payment.
                  </p>
                )}
              </div>
              <Badge className={approvalStats.allApproved
                ? 'bg-green-500/10 text-green-600 border-green-600/30'
                : 'bg-amber-500/10 text-amber-600 border-amber-600/30'}>
                {approvalStats.approved}/{approvalStats.total}
              </Badge>
            </div>
          </Card>

          <Card className={`p-4 ${approvalStats.allDocsCollected ? 'bg-green-500/5 border-green-500/30' : 'bg-blue-500/5 border-blue-500/30'}`}>
            <div className="flex items-center gap-3">
              {approvalStats.allDocsCollected ? (
                <FolderOpen className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <FolderOpen className="h-5 w-5 text-blue-500 shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${approvalStats.allDocsCollected ? 'text-green-600' : 'text-blue-600'}`}>
                  {approvalStats.allDocsCollected
                    ? 'All Documents Collected'
                    : `${approvalStats.docsCollected} of ${approvalStats.total} Personnel — Documents Complete`}
                </p>
                {!approvalStats.allDocsCollected && (
                  <p className="text-sm text-muted-foreground">
                    Collect remaining documents in Step 5 (Track & Documents).
                  </p>
                )}
              </div>
              <Badge className={approvalStats.allDocsCollected
                ? 'bg-green-500/10 text-green-600 border-green-600/30'
                : 'bg-blue-500/10 text-blue-600 border-blue-600/30'}>
                {approvalStats.docsCollected}/{approvalStats.total}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Payment Status */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Payment Status</h4>
            </div>
            <Badge className={`${paymentCfg.className}`}>
              <PaymentIcon className="h-3 w-3 mr-1" />
              {paymentCfg.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={handlePaymentStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial Payment</SelectItem>
                  <SelectItem value="confirmed" disabled={!approvalStats.allApproved}>
                    Payment Confirmed {!approvalStats.allApproved ? '(requires approval)' : ''}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Notes</Label>
              <Textarea
                value={formData.paymentNotes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentNotes: e.target.value }))}
                placeholder="Add payment notes or reference numbers..."
                className="min-h-[60px]"
              />
            </div>
          </div>

          {formData.paymentConfirmedAt && isPaymentConfirmed && (
            <p className="text-xs text-green-600">
              Payment confirmed on {new Date(formData.paymentConfirmedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}

          {!isPaymentConfirmed && (
            <Card className="p-3 bg-amber-500/10 border-amber-500/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {!approvalStats.allApproved
                    ? 'All contracts must be approved before payment can be confirmed. Go to Step 4 to approve contracts.'
                    : 'Download and sending features require payment confirmation. Update the payment status above to enable these actions.'}
                </p>
              </div>
            </Card>
          )}
        </Card>

        {/* Progress Bar */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Close Out Progress</h4>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {checkedItems.length} of {closeOutItems.length} items completed
          </p>
        </Card>

        {/* Checklist */}
        <Card className="p-5 space-y-3">
          <h4 className="font-semibold mb-2">Close Out Checklist</h4>
          <div className="space-y-2">
            {closeOutItems.map((item) => {
              const isChecked = checkedItems.includes(item.id);
              const isAutoManaged = ['all_signed', 'all_docs_collected', 'payment_confirmed', 'saved_to_project', 'linked_to_personnel'].includes(item.id);
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => !isAutoManaged && handleToggleItem(item.id)}
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                    isAutoManaged ? 'cursor-default' : 'cursor-pointer hover:bg-muted/30'
                  } ${isChecked ? 'border-green-500/50 bg-green-500/5' : ''}`}
                >
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    isChecked ? 'bg-green-500 text-white' : 'bg-muted'
                  }`}>
                    {isChecked ? <CheckCircle className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.required && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-600/30">Required</Badge>
                    )}
                    {isAutoManaged && (
                      <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Close Out Notes */}
        <Card className="p-5 space-y-3">
          <h4 className="font-semibold">Close Out Notes</h4>
          <Textarea
            value={formData.closeOutNotes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, closeOutNotes: e.target.value }))}
            placeholder="Add any final notes or comments about this contract cycle..."
            className="min-h-[80px]"
          />
        </Card>

        {/* Status Warning */}
        {!allRequiredComplete && (
          <Card className="p-4 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-medium text-amber-600">Required Items Incomplete</p>
                <p className="text-sm text-muted-foreground">
                  Complete all required checklist items to finalize the close out.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleSaveToProject}
            disabled={formData.savedToProject}
          >
            <Save className="h-4 w-4 mr-2" />
            {formData.savedToProject ? 'Saved to Project' : 'Save to Project'}
          </Button>
          <Button
            variant="outline"
            onClick={handleLinkToPersonnel}
            disabled={formData.linkedToPersonnel}
          >
            <Link2 className="h-4 w-4 mr-2" />
            {formData.linkedToPersonnel ? 'Linked to Personnel' : 'Link to Personnel'}
          </Button>
          <Button
            variant="outline"
            disabled={!isPaymentConfirmed}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Final Package
          </Button>
          <Button
            variant="outline"
            disabled={!isPaymentConfirmed}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Final Copies
          </Button>
          <Button
            onClick={handleCompleteCloseOut}
            disabled={!allRequiredComplete}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Close Out
          </Button>
        </div>
      </CardContent>
    </motion.div>
  );
};
