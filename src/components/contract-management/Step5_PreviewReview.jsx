import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Eye, Users, CheckCircle, Send, FileText, Download, Printer, Clock,
  XCircle, Mail, DollarSign, Settings, Info,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  flattenPersonnel,
  calculateMemberFinancials,
  currency,
  formatDate,
} from '@/lib/contractUtils';

const SIGNATURE_LABELS = {
  not_sent: { label: 'Not Sent', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-blue-500/10 text-blue-600 border-blue-600/30' },
  viewed: { label: 'Viewed', className: 'bg-amber-500/10 text-amber-600 border-amber-600/30' },
  signed: { label: 'Signed', className: 'bg-green-500/10 text-green-600 border-green-600/30' },
  declined: { label: 'Declined', className: 'bg-red-500/10 text-red-600 border-red-600/30' },
};

export const Step5_PreviewReview = ({ formData, setFormData }) => {
  const { toast } = useToast();
  const personnel = useMemo(() => flattenPersonnel(formData), [formData.showDetails?.officials]);
  const employeeFolders = formData.employeeFolders || {};
  const contractSettings = formData.contractSettings || {};
  const deliverySettings = formData.deliverySettings || {};

  const stats = useMemo(() => {
    const folders = Object.values(employeeFolders);
    const totalDocs = folders.length * 3;
    const completedDocs = folders.reduce((sum, f) => {
      const docs = f.documents || {};
      return sum + Object.values(docs).filter(d => d.status === 'complete').length;
    }, 0);
    return {
      total: folders.length,
      signed: folders.filter(f => f.signatureStatus === 'signed').length,
      sent: folders.filter(f => ['sent', 'viewed'].includes(f.signatureStatus)).length,
      totalDocs,
      completedDocs,
    };
  }, [employeeFolders]);

  const handleDeliveryChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      deliverySettings: { ...prev.deliverySettings, [field]: value },
    }));
  };

  const handleSendAllUnsigned = () => {
    let sentCount = 0;
    setFormData(prev => {
      const updated = { ...prev.employeeFolders };
      for (const [memberId, folder] of Object.entries(updated)) {
        if (folder.signatureStatus === 'not_sent') {
          const docsOk = Object.values(folder.documents || {}).every(d => d.status === 'complete');
          if (docsOk) {
            updated[memberId] = {
              ...folder,
              signatureStatus: 'sent',
              signatureSentAt: new Date().toISOString(),
            };
            sentCount++;
          }
        }
      }
      return { ...prev, employeeFolders: updated };
    });
    toast({
      title: sentCount > 0 ? 'Contracts Sent' : 'No Contracts Sent',
      description: sentCount > 0
        ? `Sent ${sentCount} contract${sentCount !== 1 ? 's' : ''} for signature.`
        : 'Each employee needs all 3 documents uploaded (W-9, Association Member ID, Emergency Contact) before sending.',
      variant: sentCount > 0 ? 'default' : 'destructive',
    });
  };

  const jurisdictionMap = { texas: 'Texas', california: 'California', florida: 'Florida', oklahoma: 'Oklahoma', colorado: 'Colorado' };
  const paymentMethodMap = { check: 'Check', direct_deposit: 'Direct Deposit', wire: 'Wire Transfer', paypal: 'PayPal' };

  return (
    <motion.div
      key="step5"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Step 5: Preview & Review
        </CardTitle>
        <CardDescription>
          Review all contracts, check completion status, and configure delivery settings.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-2">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Personnel</p>
          </Card>
          <Card className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-2">{stats.completedDocs}/{stats.totalDocs}</p>
            <p className="text-xs text-muted-foreground">Docs Uploaded</p>
          </Card>
          <Card className="p-4 text-center">
            <Send className="h-5 w-5 mx-auto text-blue-500" />
            <p className="text-2xl font-bold mt-2">{stats.sent}</p>
            <p className="text-xs text-muted-foreground">Awaiting Signature</p>
          </Card>
          <Card className="p-4 text-center bg-green-500/5 border-green-500/20">
            <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
            <p className="text-2xl font-bold text-green-600 mt-2">{stats.signed}</p>
            <p className="text-xs text-muted-foreground">Signed</p>
          </Card>
        </div>

        {/* Contract Status Table */}
        {personnel.length > 0 && (
          <Card className="p-5 space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Contract Status
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">Role</th>
                    <th className="text-center px-4 py-2 font-medium text-xs uppercase tracking-wider">Docs</th>
                    <th className="text-center px-4 py-2 font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-2 font-medium text-xs uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {personnel.map((member) => {
                    const folder = employeeFolders[member.id];
                    if (!folder) return null;
                    const financials = calculateMemberFinancials(member);
                    const docsComplete = Object.values(folder.documents || {}).filter(d => d.status === 'complete').length;
                    const sigCfg = SIGNATURE_LABELS[folder.signatureStatus] || SIGNATURE_LABELS.not_sent;

                    return (
                      <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{member.name || 'Unnamed'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{member.roleName}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={docsComplete === 3 ? 'default' : 'secondary'} className="text-[10px]">
                            {docsComplete}/3
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={`text-[10px] ${sigCfg.className}`}>{sigCfg.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{currency(financials.totalCompensation)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Contract Settings Summary */}
        <Card className="p-5 space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Contract Configuration
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Effective Date</p>
              <p className="font-medium mt-1">{formatDate(contractSettings.effectiveDate) || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Expiration Date</p>
              <p className="font-medium mt-1">{formatDate(contractSettings.expirationDate) || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Jurisdiction</p>
              <p className="font-medium mt-1">{jurisdictionMap[contractSettings.jurisdiction] || contractSettings.jurisdiction || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Payment Method</p>
              <p className="font-medium mt-1">{paymentMethodMap[contractSettings.paymentMethod] || contractSettings.paymentMethod || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Signing Deadline</p>
              <p className="font-medium mt-1">{formatDate(contractSettings.signingDeadline) || 'Not set'}</p>
            </div>
          </div>
          {contractSettings.additionalTerms && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Additional Terms</p>
              <p className="text-sm whitespace-pre-wrap">{contractSettings.additionalTerms}</p>
            </div>
          )}
        </Card>

        {/* Delivery & Notification Settings */}
        <Card className="p-5 space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Delivery & Notification Settings
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Delivery Method</Label>
              <Select
                value={deliverySettings.deliveryMethod || 'email'}
                onValueChange={(value) => handleDeliveryChange('deliveryMethod', value)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="portal">Secure Portal</SelectItem>
                  <SelectItem value="both">Email + Secure Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email Subject Line</Label>
              <Input
                value={deliverySettings.emailSubject || ''}
                onChange={(e) => handleDeliveryChange('emailSubject', e.target.value)}
                placeholder="Contract Documents Ready for Review"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Email Message</Label>
            <Textarea
              value={deliverySettings.emailMessage || ''}
              onChange={(e) => handleDeliveryChange('emailMessage', e.target.value)}
              placeholder="Add a personal message to include with the contract delivery..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="sendReminders"
                checked={deliverySettings.sendReminders ?? true}
                onCheckedChange={(checked) => handleDeliveryChange('sendReminders', checked)}
              />
              <Label htmlFor="sendReminders" className="text-sm">Send automatic reminders</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="requireSignature"
                checked={deliverySettings.requireSignature ?? true}
                onCheckedChange={(checked) => handleDeliveryChange('requireSignature', checked)}
              />
              <Label htmlFor="requireSignature" className="text-sm">Require e-signature</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notifyOnComplete"
                checked={deliverySettings.notifyOnComplete ?? true}
                onCheckedChange={(checked) => handleDeliveryChange('notifyOnComplete', checked)}
              />
              <Label htmlFor="notifyOnComplete" className="text-sm">Notify when signed</Label>
            </div>
          </div>
        </Card>

        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSendAllUnsigned}>
            <Send className="h-4 w-4 mr-2" />
            Send All Unsigned
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download All as ZIP
          </Button>
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print All
          </Button>
        </div>
      </CardContent>
    </motion.div>
  );
};
