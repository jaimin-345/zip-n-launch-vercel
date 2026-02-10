import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Users, CheckCircle, Send, FileText, Download, Printer, Clock,
  Mail, Settings, Info, FileSpreadsheet, FolderOpen, User, Shield,
  Upload, Trash2, File,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  flattenPersonnel,
  calculateMemberFinancials,
  currency,
  formatDate,
} from '@/lib/contractUtils';
import { exportBudgetToExcel } from '@/lib/contractBudgetExport';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const REQUIRED_DOC_IDS = ['signed_contract', 'w9_form', 'association_member_id', 'emergency_contact'];

const DOC_LABELS = {
  signed_contract: 'Signed Contract',
  w9_form: 'W-9 Form',
  association_member_id: 'Association Membership',
  emergency_contact: 'Emergency Contact',
};

const countComplete = (docs) => {
  if (!docs) return 0;
  return REQUIRED_DOC_IDS.filter(id => docs[id]?.status === 'complete').length;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DocUploadZone = ({ file, onDrop, onRemove, accept }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      if (accepted.length > 0) onDrop(accepted[0]);
    },
    accept: accept || {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  if (file) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/30 border rounded-lg">
        <File className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} className="shrink-0 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/20'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {isDragActive ? 'Drop file here...' : 'Click or drag to upload'}
      </span>
    </div>
  );
};

const SIGNATURE_LABELS = {
  not_sent: { label: 'Not Sent', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-blue-500/10 text-blue-600 border-blue-600/30' },
  viewed: { label: 'Viewed', className: 'bg-amber-500/10 text-amber-600 border-amber-600/30' },
  signed: { label: 'Signed', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-600/30' },
  approved: { label: 'Approved', className: 'bg-green-500/10 text-green-600 border-green-600/30' },
  declined: { label: 'Declined', className: 'bg-red-500/10 text-red-600 border-red-600/30' },
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const Step5_PreviewReview = ({ formData, setFormData }) => {
  const { toast } = useToast();
  const personnel = useMemo(() => flattenPersonnel(formData), [formData.showDetails?.officials]);
  const employeeFolders = formData.employeeFolders || {};
  const contractSettings = formData.contractSettings || {};
  const deliverySettings = formData.deliverySettings || {};

  const stats = useMemo(() => {
    const folders = Object.values(employeeFolders);
    const docsPerPerson = REQUIRED_DOC_IDS.length;
    const totalDocs = folders.length * docsPerPerson;
    const completedDocs = folders.reduce((sum, f) => sum + countComplete(f.documents), 0);
    return {
      total: folders.length,
      signed: folders.filter(f => ['signed', 'approved'].includes(f.signatureStatus)).length,
      sent: folders.filter(f => ['sent', 'viewed'].includes(f.signatureStatus)).length,
      approved: folders.filter(f => f.signatureStatus === 'approved').length,
      totalDocs,
      completedDocs,
      allDocsComplete: folders.length > 0 && completedDocs === totalDocs,
    };
  }, [employeeFolders]);

  // ── Document Management Functions ──

  const updateDocument = (memberId, docId, field, value) => {
    setFormData(prev => {
      const folder = prev.employeeFolders?.[memberId];
      if (!folder) return prev;
      const currentDoc = folder.documents?.[docId] || {};
      const updatedDoc = { ...currentDoc, [field]: value };

      if (field === 'file') {
        updatedDoc.status = value ? 'complete' : 'pending';
      }

      return {
        ...prev,
        employeeFolders: {
          ...prev.employeeFolders,
          [memberId]: {
            ...folder,
            documents: {
              ...folder.documents,
              [docId]: updatedDoc,
            },
          },
        },
      };
    });
  };

  const updateEmergencyContact = (memberId, contactType, field, value) => {
    setFormData(prev => {
      const folder = prev.employeeFolders?.[memberId];
      if (!folder) return prev;
      const ec = folder.documents?.emergency_contact || {};
      return {
        ...prev,
        employeeFolders: {
          ...prev.employeeFolders,
          [memberId]: {
            ...folder,
            documents: {
              ...folder.documents,
              emergency_contact: {
                ...ec,
                [contactType]: {
                  ...ec[contactType],
                  [field]: value,
                },
              },
            },
          },
        },
      };
    });
  };

  const addOtherDocument = (memberId, file) => {
    setFormData(prev => {
      const folder = prev.employeeFolders?.[memberId];
      if (!folder) return prev;
      const others = folder.documents?.other_documents || [];
      return {
        ...prev,
        employeeFolders: {
          ...prev.employeeFolders,
          [memberId]: {
            ...folder,
            documents: {
              ...folder.documents,
              other_documents: [...others, { id: Date.now().toString(), file, name: file.name, uploadedAt: new Date().toISOString() }],
            },
          },
        },
      };
    });
  };

  const removeOtherDocument = (memberId, docId) => {
    setFormData(prev => {
      const folder = prev.employeeFolders?.[memberId];
      if (!folder) return prev;
      const others = folder.documents?.other_documents || [];
      return {
        ...prev,
        employeeFolders: {
          ...prev.employeeFolders,
          [memberId]: {
            ...folder,
            documents: {
              ...folder.documents,
              other_documents: others.filter(d => d.id !== docId),
            },
          },
        },
      };
    });
  };

  // ── Delivery & Bulk Actions ──

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
          updated[memberId] = {
            ...folder,
            signatureStatus: 'sent',
            signatureSentAt: new Date().toISOString(),
          };
          sentCount++;
        }
      }
      return { ...prev, employeeFolders: updated };
    });
    toast({
      title: sentCount > 0 ? 'Contracts Sent' : 'No Contracts to Send',
      description: sentCount > 0
        ? `Sent ${sentCount} contract${sentCount !== 1 ? 's' : ''} for signature.`
        : 'All contracts have already been sent.',
      variant: sentCount > 0 ? 'default' : 'destructive',
    });
  };

  const handleExportBudget = () => {
    const success = exportBudgetToExcel(formData);
    if (success) {
      toast({ title: 'Budget Exported', description: 'Excel budget sheet downloaded successfully.' });
    } else {
      toast({ title: 'No Data', description: 'Add personnel in Step 2 before exporting.', variant: 'destructive' });
    }
  };

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
          <FolderOpen className="h-5 w-5 text-primary" />
          Step 5: Track & Collect Documents
        </CardTitle>
        <CardDescription>
          Track contract status, collect required documents from signed employees, and configure delivery settings.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-2">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Personnel</p>
          </Card>
          <Card className="p-4 text-center">
            <Send className="h-5 w-5 mx-auto text-blue-500" />
            <p className="text-2xl font-bold mt-2">{stats.sent}</p>
            <p className="text-xs text-muted-foreground">Awaiting Signature</p>
          </Card>
          <Card className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-emerald-500" />
            <p className="text-2xl font-bold mt-2">{stats.signed}</p>
            <p className="text-xs text-muted-foreground">Signed</p>
          </Card>
          <Card className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-2">{stats.completedDocs}/{stats.totalDocs}</p>
            <p className="text-xs text-muted-foreground">Docs Collected</p>
          </Card>
          <Card className={`p-4 text-center ${stats.allDocsComplete ? 'bg-green-500/5 border-green-500/20' : ''}`}>
            <FolderOpen className={`h-5 w-5 mx-auto ${stats.allDocsComplete ? 'text-green-500' : 'text-muted-foreground'}`} />
            <p className={`text-2xl font-bold mt-2 ${stats.allDocsComplete ? 'text-green-600' : ''}`}>{stats.approved}/{stats.total}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </Card>
        </div>

        {/* Contract & Document Status Table */}
        {personnel.length > 0 && (
          <Card className="p-5 space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Contract & Document Status
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">Role</th>
                    <th className="text-center px-4 py-2 font-medium text-xs uppercase tracking-wider">Contract</th>
                    <th className="text-center px-4 py-2 font-medium text-xs uppercase tracking-wider">Documents</th>
                    <th className="text-right px-4 py-2 font-medium text-xs uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {personnel.map((member) => {
                    const folder = employeeFolders[member.id];
                    if (!folder) return null;
                    const financials = calculateMemberFinancials(member);
                    const docsComplete = countComplete(folder.documents);
                    const sigCfg = SIGNATURE_LABELS[folder.signatureStatus] || SIGNATURE_LABELS.not_sent;

                    return (
                      <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{member.name || 'Unnamed'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{member.roleName}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={`text-[10px] ${sigCfg.className}`}>{sigCfg.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={docsComplete === REQUIRED_DOC_IDS.length ? 'default' : 'secondary'}
                            className={`text-[10px] ${docsComplete === REQUIRED_DOC_IDS.length ? 'bg-green-500/10 text-green-600 border-green-600/30' : ''}`}
                          >
                            {docsComplete}/{REQUIRED_DOC_IDS.length} {docsComplete === REQUIRED_DOC_IDS.length ? 'Complete' : 'Pending'}
                          </Badge>
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

        {/* ── Document Collection Section ── */}
        {personnel.length > 0 && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                Document Collection
              </h4>
              <Badge variant="secondary" className="text-xs">
                {stats.completedDocs}/{stats.totalDocs} collected
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Collect and manage required documents submitted by employees after contract signing. Upload documents as they are received.
            </p>

            <Accordion type="single" collapsible className="space-y-2">
              {personnel.map((member) => {
                const folder = employeeFolders[member.id];
                if (!folder) return null;
                const docsComplete = countComplete(folder.documents);

                return (
                  <AccordionItem key={member.id} value={member.id} className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">{member.name || 'Unnamed'}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{member.roleName}</Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={docsComplete === REQUIRED_DOC_IDS.length ? 'default' : 'secondary'}
                            className={`text-[10px] ${docsComplete === REQUIRED_DOC_IDS.length ? 'bg-green-500/10 text-green-600 border-green-600/30' : ''}`}
                          >
                            {docsComplete}/{REQUIRED_DOC_IDS.length} docs
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4 space-y-3">
                      {/* Document Status Summary */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {REQUIRED_DOC_IDS.map(docId => {
                          const doc = folder.documents?.[docId];
                          const isComplete = doc?.status === 'complete';
                          return (
                            <div key={docId} className="flex items-center gap-1.5 text-xs">
                              {isComplete
                                ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                : <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              }
                              <span className={isComplete ? 'text-green-600' : 'text-muted-foreground'}>
                                {DOC_LABELS[docId]}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* 1. Signed Contract */}
                      <div className={`p-4 border rounded-lg transition-all ${folder.documents?.signed_contract?.status === 'complete' ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                              folder.documents?.signed_contract?.status === 'complete' ? 'bg-green-500 text-white' : 'bg-muted'
                            }`}>
                              {folder.documents?.signed_contract?.status === 'complete'
                                ? <CheckCircle className="h-3.5 w-3.5" />
                                : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <div>
                              <span className="font-medium text-sm">Signed Contract</span>
                              <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-600/30">Required</Badge>
                            </div>
                          </div>
                          {folder.documents?.signed_contract?.status === 'complete' && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-600/30 text-[10px]">Uploaded</Badge>
                          )}
                        </div>
                        <div className="mt-3 ml-9">
                          <DocUploadZone
                            file={folder.documents?.signed_contract?.file}
                            onDrop={(file) => updateDocument(member.id, 'signed_contract', 'file', file)}
                            onRemove={() => updateDocument(member.id, 'signed_contract', 'file', null)}
                            accept={{ 'application/pdf': ['.pdf'] }}
                          />
                        </div>
                      </div>

                      {/* 2. W-9 Form */}
                      <div className={`p-4 border rounded-lg transition-all ${folder.documents?.w9_form?.status === 'complete' ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                              folder.documents?.w9_form?.status === 'complete' ? 'bg-green-500 text-white' : 'bg-muted'
                            }`}>
                              {folder.documents?.w9_form?.status === 'complete'
                                ? <CheckCircle className="h-3.5 w-3.5" />
                                : <Upload className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <div>
                              <span className="font-medium text-sm">W-9 Form (Tax Information)</span>
                              <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-600/30">Required</Badge>
                            </div>
                          </div>
                          {folder.documents?.w9_form?.status === 'complete' && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-600/30 text-[10px]">Uploaded</Badge>
                          )}
                        </div>
                        <div className="mt-3 ml-9">
                          <DocUploadZone
                            file={folder.documents?.w9_form?.file}
                            onDrop={(file) => updateDocument(member.id, 'w9_form', 'file', file)}
                            onRemove={() => updateDocument(member.id, 'w9_form', 'file', null)}
                            accept={{ 'application/pdf': ['.pdf'] }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 ml-9 flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Required for tax reporting. W-9 data should be stored securely and never shared.
                        </p>
                      </div>

                      {/* 3. Association Member ID */}
                      <div className={`p-4 border rounded-lg transition-all ${folder.documents?.association_member_id?.status === 'complete' ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                              folder.documents?.association_member_id?.status === 'complete' ? 'bg-green-500 text-white' : 'bg-muted'
                            }`}>
                              {folder.documents?.association_member_id?.status === 'complete'
                                ? <CheckCircle className="h-3.5 w-3.5" />
                                : <Upload className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <div>
                              <span className="font-medium text-sm">Association Membership</span>
                              <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-600/30">Required</Badge>
                            </div>
                          </div>
                          {folder.documents?.association_member_id?.status === 'complete' && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-600/30 text-[10px]">Uploaded</Badge>
                          )}
                        </div>
                        <div className="mt-3 ml-9 space-y-3">
                          <div className="max-w-sm">
                            <Label className="text-xs">Membership Number</Label>
                            <Input
                              value={folder.documents?.association_member_id?.value || ''}
                              onChange={(e) => updateDocument(member.id, 'association_member_id', 'value', e.target.value)}
                              placeholder="e.g., AQHA-12345"
                              className="mt-1"
                            />
                          </div>
                          <DocUploadZone
                            file={folder.documents?.association_member_id?.file}
                            onDrop={(file) => updateDocument(member.id, 'association_member_id', 'file', file)}
                            onRemove={() => updateDocument(member.id, 'association_member_id', 'file', null)}
                          />
                        </div>
                      </div>

                      {/* 4. Emergency Contact */}
                      <div className={`p-4 border rounded-lg transition-all space-y-4 ${folder.documents?.emergency_contact?.status === 'complete' ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={folder.documents?.emergency_contact?.status === 'complete'}
                            onCheckedChange={(checked) =>
                              updateDocument(member.id, 'emergency_contact', 'status', checked ? 'complete' : 'pending')
                            }
                          />
                          <div>
                            <span className="font-medium text-sm">Emergency Contact Information</span>
                            <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-600/30">Required</Badge>
                          </div>
                        </div>

                        <div className="ml-10 space-y-2">
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Contact (Employee)</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Name</Label>
                              <Input
                                value={folder.documents?.emergency_contact?.primary?.name || ''}
                                onChange={(e) => updateEmergencyContact(member.id, 'primary', 'name', e.target.value)}
                                placeholder="Employee name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Phone</Label>
                              <Input
                                value={folder.documents?.emergency_contact?.primary?.phone || ''}
                                onChange={(e) => updateEmergencyContact(member.id, 'primary', 'phone', e.target.value)}
                                placeholder="Phone number"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Email</Label>
                              <Input
                                value={folder.documents?.emergency_contact?.primary?.email || ''}
                                onChange={(e) => updateEmergencyContact(member.id, 'primary', 'email', e.target.value)}
                                placeholder="Email address"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="ml-10 space-y-2">
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secondary Emergency Contact</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Name</Label>
                              <Input
                                value={folder.documents?.emergency_contact?.secondary?.name || ''}
                                onChange={(e) => updateEmergencyContact(member.id, 'secondary', 'name', e.target.value)}
                                placeholder="Emergency contact name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Phone</Label>
                              <Input
                                value={folder.documents?.emergency_contact?.secondary?.phone || ''}
                                onChange={(e) => updateEmergencyContact(member.id, 'secondary', 'phone', e.target.value)}
                                placeholder="Phone number"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Email</Label>
                              <Input
                                value={folder.documents?.emergency_contact?.secondary?.email || ''}
                                onChange={(e) => updateEmergencyContact(member.id, 'secondary', 'email', e.target.value)}
                                placeholder="Email (optional)"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="ml-10 space-y-2">
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upload Signed Form (Optional)</h5>
                          <DocUploadZone
                            file={folder.documents?.emergency_contact?.file}
                            onDrop={(file) => updateDocument(member.id, 'emergency_contact', 'file', file)}
                            onRemove={() => updateDocument(member.id, 'emergency_contact', 'file', null)}
                          />
                        </div>
                      </div>

                      {/* 5. Other Documents */}
                      <div className="p-4 border rounded-lg transition-all space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 bg-muted">
                            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="font-medium text-sm">Other Documents</span>
                            <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
                          </div>
                        </div>
                        <div className="ml-9 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Upload any additional documents (insurance, certifications, travel receipts, etc.)
                          </p>
                          {(folder.documents?.other_documents || []).map((doc) => (
                            <div key={doc.id} className="flex items-center gap-3 p-3 bg-muted/30 border rounded-lg">
                              <File className="h-4 w-4 text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(doc.file?.size || 0)}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeOtherDocument(member.id, doc.id)} className="shrink-0 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          <DocUploadZone
                            file={null}
                            onDrop={(file) => addOtherDocument(member.id, file)}
                            onRemove={() => {}}
                          />
                        </div>
                      </div>

                      {/* Document Summary */}
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {docsComplete}/{REQUIRED_DOC_IDS.length} required documents completed
                          </p>
                          {(folder.documents?.other_documents || []).length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              + {folder.documents.other_documents.length} other document{folder.documents.other_documents.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </Card>
        )}

        {/* Contract Settings Summary */}
        <Card className="p-5 space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Contract Configuration
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Effective Date</p>
              <p className="font-medium mt-1">{formatDate(contractSettings.effectiveDate) || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Expiration Date</p>
              <p className="font-medium mt-1">{formatDate(contractSettings.expirationDate) || 'Not set'}</p>
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

          <Card className="p-3 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Contract emails include a "Sign Contract + Upload Required Documents" link. Employees can sign and upload documents (W-9, Membership ID, Emergency Info) in one continuous flow.
              </p>
            </div>
          </Card>

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
                placeholder="Sign Contract + Upload Required Documents"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Email Message</Label>
            <Textarea
              value={deliverySettings.emailMessage || ''}
              onChange={(e) => handleDeliveryChange('emailMessage', e.target.value)}
              placeholder="Add a personal message to include with the contract delivery. The email will automatically include a link for the employee to sign the contract and upload required documents..."
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
              <Label htmlFor="notifyOnComplete" className="text-sm">Notify when signed & docs uploaded</Label>
            </div>
          </div>
        </Card>

        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSendAllUnsigned}>
            <Send className="h-4 w-4 mr-2" />
            Send All Unsigned
          </Button>
          <Button variant="outline" onClick={handleExportBudget}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Budget to Excel
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
