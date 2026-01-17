import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, FileText, Download, User, Clock, AlertCircle, Send, Printer, Users, FileSignature, Mail, Edit, RefreshCw, Shield } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const documentTypes = {
  employment_contract: 'Employment Contract',
  independent_contractor: 'Independent Contractor Agreement',
  nda: 'Non-Disclosure Agreement (NDA)',
  payment_terms: 'Payment Terms & Schedule',
  expense_reimbursement: 'Expense Reimbursement Policy',
  schedule_agreement: 'Schedule & Availability Agreement',
  liability_waiver: 'Liability Waiver',
};

export const Step4_Preview = ({ formData, setFormData }) => {
  const { selectedPersonnel = [], selectedDocuments = [], associationJudges = {}, officials = [], contractSettings = {} } = formData;
  const [reviewSettings, setReviewSettings] = useState({
    sendReminders: true,
    requireSignature: true,
    notifyOnComplete: true,
    emailSubject: 'Contract Documents Ready for Review',
    emailMessage: '',
    deliveryMethod: 'email',
  });

  // Get all personnel details from Step 2 data
  const allJudges = Object.entries(associationJudges).flatMap(([assocId, data]) => {
    return (data.judges || []).map((judge, index) => ({
      ...judge,
      id: `judge_${assocId}_${index}`,
      role: 'Judge',
      association: assocId,
    }));
  });

  const allPersonnel = [
    ...allJudges,
    ...officials.map((official, index) => ({
      ...official,
      id: official.id || `official_${index}`,
    })),
  ];

  const selectedPersonnelDetails = allPersonnel.filter(p => selectedPersonnel.includes(p.id));
  const totalContracts = selectedPersonnelDetails.length * selectedDocuments.length;

  const handleReviewSettingChange = (field, value) => {
    setReviewSettings(prev => ({ ...prev, [field]: value }));
  };

  if (selectedPersonnel.length === 0 || selectedDocuments.length === 0) {
    return (
      <motion.div
        key="step4"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
      >
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Step 4: Preview & Review
          </CardTitle>
          <CardDescription>Review all documents before generating and sending.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Card className="p-6 border-dashed">
            <div className="flex flex-col items-center justify-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Missing Selections</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please select personnel in Step 2 and document types in Step 3 to preview documents.
                </p>
              </div>
            </div>
          </Card>
        </CardContent>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Step 4: Preview & Review
        </CardTitle>
        <CardDescription>
          Review all generated contracts and configure delivery settings before sending.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedPersonnelDetails.length}</p>
                <p className="text-xs text-muted-foreground">Personnel</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedDocuments.length}</p>
                <p className="text-xs text-muted-foreground">Document Types</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <FileSignature className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalContracts}</p>
                <p className="text-xs text-muted-foreground">Total Contracts</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalContracts}</p>
                <p className="text-xs text-muted-foreground">Awaiting Signature</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Contract Settings Summary */}
        {contractSettings && Object.keys(contractSettings).length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Contract Configuration Summary</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {contractSettings.template && (
                <div>
                  <p className="text-muted-foreground">Template</p>
                  <p className="font-medium capitalize">{contractSettings.template.replace('_', ' ')}</p>
                </div>
              )}
              {contractSettings.effectiveDate && (
                <div>
                  <p className="text-muted-foreground">Effective Date</p>
                  <p className="font-medium">{contractSettings.effectiveDate}</p>
                </div>
              )}
              {contractSettings.expirationDate && (
                <div>
                  <p className="text-muted-foreground">Expiration Date</p>
                  <p className="font-medium">{contractSettings.expirationDate}</p>
                </div>
              )}
              {contractSettings.jurisdiction && (
                <div>
                  <p className="text-muted-foreground">Jurisdiction</p>
                  <p className="font-medium capitalize">{contractSettings.jurisdiction}</p>
                </div>
              )}
              {contractSettings.signingDeadline && (
                <div>
                  <p className="text-muted-foreground">Signing Deadline</p>
                  <p className="font-medium">{contractSettings.signingDeadline}</p>
                </div>
              )}
              {contractSettings.paymentMethod && (
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{contractSettings.paymentMethod.replace('_', ' ')}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Delivery & Notification Settings */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-primary" />
            <h4 className="font-semibold">Delivery & Notification Settings</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryMethod">Delivery Method</Label>
              <Select 
                value={reviewSettings.deliveryMethod}
                onValueChange={(value) => handleReviewSettingChange('deliveryMethod', value)}
              >
                <SelectTrigger id="deliveryMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="portal">Secure Portal Link</SelectItem>
                  <SelectItem value="both">Email + Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailSubject">Email Subject Line</Label>
              <Input
                id="emailSubject"
                value={reviewSettings.emailSubject}
                onChange={(e) => handleReviewSettingChange('emailSubject', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailMessage">Custom Email Message (Optional)</Label>
            <Textarea
              id="emailMessage"
              placeholder="Add a personalized message to include in the email..."
              value={reviewSettings.emailMessage}
              onChange={(e) => handleReviewSettingChange('emailMessage', e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="sendReminders"
                checked={reviewSettings.sendReminders}
                onCheckedChange={(checked) => handleReviewSettingChange('sendReminders', checked)}
              />
              <Label htmlFor="sendReminders" className="text-sm cursor-pointer">Send automatic reminders</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="requireSignature"
                checked={reviewSettings.requireSignature}
                onCheckedChange={(checked) => handleReviewSettingChange('requireSignature', checked)}
              />
              <Label htmlFor="requireSignature" className="text-sm cursor-pointer">Require e-signature</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notifyOnComplete"
                checked={reviewSettings.notifyOnComplete}
                onCheckedChange={(checked) => handleReviewSettingChange('notifyOnComplete', checked)}
              />
              <Label htmlFor="notifyOnComplete" className="text-sm cursor-pointer">Notify when signed</Label>
            </div>
          </div>
        </Card>

        {/* Personnel Documents Accordion */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Documents by Personnel
          </h4>
          <Accordion type="multiple" className="w-full space-y-2">
            {selectedPersonnelDetails.map((person) => (
              <AccordionItem key={person.id} value={person.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium">{person.name || 'Unnamed'}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs">{person.role || 'Staff'}</Badge>
                        <span className="text-xs text-muted-foreground">{selectedDocuments.length} contracts</span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-2">
                    {selectedDocuments.map((docId) => (
                      <div
                        key={docId}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{documentTypes[docId] || docId}</p>
                            <p className="text-xs text-muted-foreground">
                              For: {person.name || 'Unnamed'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-amber-600 border-amber-600/30 bg-amber-500/10">
                            <Clock className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Action Buttons */}
        <Card className="p-4 bg-muted/30">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate All
            </Button>
            <Button variant="outline" className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print All
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download ZIP
            </Button>
            <Button className="flex-1 bg-primary">
              <Send className="h-4 w-4 mr-2" />
              Send for Signature
            </Button>
          </div>
        </Card>
      </CardContent>
    </motion.div>
  );
};
