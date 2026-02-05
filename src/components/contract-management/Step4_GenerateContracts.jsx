import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  FolderOpen, Users, Info, User, Eye, Copy, RotateCcw, Edit3, Send,
  CheckCircle, Clock, XCircle, Mail, Phone, Shield, DollarSign,
  FileText, Plane, Car, AlertCircle, Upload, Trash2, File,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  DEFAULT_CONTRACT_TEMPLATE,
  PlaceholderToolbar,
  flattenPersonnel,
  calculateMemberFinancials,
  resolvePlaceholders,
  getTravelMethod,
  renderResolvedPreview,
  currency,
  expenseTypeMeta,
} from '@/lib/contractUtils';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const buildDefaultDocuments = (member) => ({
  w9_form: { status: 'pending', note: '', file: null },
  association_member_id: { status: 'pending', value: '', note: '', file: null },
  emergency_contact: {
    status: 'pending',
    file: null,
    primary: {
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
    },
    secondary: { name: '', phone: '', email: '' },
  },
});

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

const countCompleteDocs = (documents) => {
  if (!documents) return 0;
  return Object.values(documents).filter(d => d.status === 'complete').length;
};

const SIGNATURE_LABELS = {
  not_sent: { label: 'Not Sent', className: 'bg-muted text-muted-foreground', icon: Clock },
  sent: { label: 'Sent', className: 'bg-blue-500/10 text-blue-600 border-blue-600/30', icon: Send },
  viewed: { label: 'Viewed', className: 'bg-amber-500/10 text-amber-600 border-amber-600/30', icon: Eye },
  signed: { label: 'Signed', className: 'bg-green-500/10 text-green-600 border-green-600/30', icon: CheckCircle },
  declined: { label: 'Declined', className: 'bg-red-500/10 text-red-600 border-red-600/30', icon: XCircle },
};

const SignatureBadge = ({ status }) => {
  const cfg = SIGNATURE_LABELS[status] || SIGNATURE_LABELS.not_sent;
  const Icon = cfg.icon;
  return (
    <Badge className={`text-[10px] ${cfg.className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {cfg.label}
    </Badge>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const Step4_GenerateContracts = ({ formData, setFormData }) => {
  const { toast } = useToast();
  const overrideTextareaRef = useRef(null);
  const [editingMemberId, setEditingMemberId] = useState(null);

  const personnel = useMemo(() => flattenPersonnel(formData), [formData.showDetails?.officials]);
  const employeeFolders = formData.employeeFolders || {};

  // Auto-generate / reconcile folders when personnel or template changes
  useEffect(() => {
    if (personnel.length === 0) return;

    const currentFolders = formData.employeeFolders || {};
    const globalTemplate = formData.contractBuilder?.globalTemplate || DEFAULT_CONTRACT_TEMPLATE;
    const overrides = formData.contractBuilder?.employeeOverrides || {};

    const updatedFolders = {};
    let changed = false;

    for (const member of personnel) {
      const template = overrides[member.id] || globalTemplate;
      const resolved = resolvePlaceholders(template, member, formData);
      const existing = currentFolders[member.id];

      if (!existing) {
        changed = true;
        updatedFolders[member.id] = {
          resolvedContract: resolved,
          editedContract: null,
          documents: buildDefaultDocuments(member),
          signatureStatus: 'not_sent',
          signatureSentAt: null,
          signatureCompletedAt: null,
        };
      } else {
        // Update resolved text but keep user edits/docs/signature
        if (existing.resolvedContract !== resolved) changed = true;
        updatedFolders[member.id] = {
          ...existing,
          resolvedContract: resolved,
        };
      }
    }

    if (changed || Object.keys(updatedFolders).length !== Object.keys(currentFolders).length) {
      setFormData(prev => ({ ...prev, employeeFolders: updatedFolders }));
    }
  }, [personnel.length, formData.contractBuilder?.globalTemplate, formData.contractSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Folder Updates ──

  const updateFolder = (memberId, field, value) => {
    setFormData(prev => ({
      ...prev,
      employeeFolders: {
        ...prev.employeeFolders,
        [memberId]: {
          ...prev.employeeFolders?.[memberId],
          [field]: value,
        },
      },
    }));
  };

  const updateDocument = (memberId, docId, field, value) => {
    setFormData(prev => {
      const folder = prev.employeeFolders?.[memberId];
      if (!folder) return prev;
      const currentDoc = folder.documents?.[docId] || {};
      const updatedDoc = { ...currentDoc, [field]: value };

      // Auto-set status when a file is uploaded or removed
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

  const handleSendForSignature = (memberId) => {
    const folder = employeeFolders[memberId];
    if (!folder) return;

    const docsComplete = countCompleteDocs(folder.documents) === 3;
    if (!docsComplete) {
      toast({
        title: 'Documents Incomplete',
        description: 'Complete all required documents before sending for signature.',
        variant: 'destructive',
      });
      return;
    }

    updateFolder(memberId, 'signatureStatus', 'sent');
    setFormData(prev => ({
      ...prev,
      employeeFolders: {
        ...prev.employeeFolders,
        [memberId]: {
          ...prev.employeeFolders[memberId],
          signatureStatus: 'sent',
          signatureSentAt: new Date().toISOString(),
        },
      },
    }));

    const member = personnel.find(m => m.id === memberId);
    toast({
      title: 'Contract Sent',
      description: `Signature request sent to ${member?.name || 'employee'}.`,
    });
  };

  const resetEditedContract = (memberId) => {
    updateFolder(memberId, 'editedContract', null);
    setEditingMemberId(null);
  };

  const insertPlaceholderOverride = (tag) => {
    const textarea = overrideTextareaRef.current;
    if (!textarea || !editingMemberId) return;
    const folder = employeeFolders[editingMemberId];
    const current = folder?.editedContract ?? folder?.resolvedContract ?? '';
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = current.substring(0, start) + tag + current.substring(end);
    updateFolder(editingMemberId, 'editedContract', newText);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  // ── Stats ──

  const stats = useMemo(() => {
    const folders = Object.values(employeeFolders);
    const totalDocs = folders.length * 3;
    const completedDocs = folders.reduce((sum, f) => sum + countCompleteDocs(f.documents), 0);
    return {
      total: folders.length,
      signed: folders.filter(f => f.signatureStatus === 'signed').length,
      sent: folders.filter(f => f.signatureStatus === 'sent' || f.signatureStatus === 'viewed').length,
      totalDocs,
      completedDocs,
      allDocsComplete: folders.filter(f => countCompleteDocs(f.documents) === 3).length,
    };
  }, [employeeFolders]);

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          Step 4: Generate Contracts
        </CardTitle>
        <CardDescription>
          Review and customize individual contracts for each employee. Manage required documents and send for signature.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 space-y-6">
        {/* Stats Bar */}
        {personnel.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Personnel</p>
              <p className="text-lg font-bold mt-1">{stats.total}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Docs Uploaded</p>
              <p className="text-lg font-bold mt-1">{stats.completedDocs}/{stats.totalDocs}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sent</p>
              <p className="text-lg font-bold mt-1">{stats.sent}</p>
            </Card>
            <Card className="p-3 bg-green-500/5 border-green-500/20">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Signed</p>
              <p className="text-lg font-bold text-green-600 mt-1">{stats.signed}/{stats.total}</p>
            </Card>
          </div>
        )}

        {/* No Personnel Warning */}
        {personnel.length === 0 && (
          <Card className="p-4 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-600">No Personnel Available</p>
                <p className="text-sm text-muted-foreground">
                  Go back to Step 2 to add officials & staff, then create a template in Step 3.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Employee Folders */}
        {personnel.length > 0 && (
          <Accordion type="single" collapsible className="space-y-2">
            {personnel.map((member) => {
              const folder = employeeFolders[member.id];
              if (!folder) return null;

              const financials = calculateMemberFinancials(member);
              const travel = getTravelMethod(member);
              const docsComplete = countCompleteDocs(folder.documents);
              const contractText = folder.editedContract ?? folder.resolvedContract ?? '';
              const isEditing = editingMemberId === member.id;

              return (
                <AccordionItem key={member.id} value={member.id} className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center justify-between w-full gap-3">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {member.name || 'Unnamed'}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{member.roleName}</Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <SignatureBadge status={folder.signatureStatus} />
                        <Badge variant="secondary" className="text-[10px]">
                          {docsComplete}/3 docs
                        </Badge>
                        {travel.icon && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <travel.icon className="h-3 w-3" />
                          </span>
                        )}
                        <span className="font-semibold text-sm">
                          {currency(financials.totalCompensation)}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4">
                    <Tabs defaultValue="contract" className="mt-2">
                      <TabsList className="grid w-full grid-cols-3 max-w-md">
                        <TabsTrigger value="contract">Contract</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="send">Send</TabsTrigger>
                      </TabsList>

                      {/* ── Tab 1: Contract ── */}
                      <TabsContent value="contract" className="mt-4 space-y-4">
                        {/* Financial Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 border rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Period</p>
                            <p className="text-xs font-medium mt-1">{financials.employmentDays} day{financials.employmentDays !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="p-3 border rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Day Pay</p>
                            <p className="text-xs font-medium mt-1">{currency(financials.totalDayFee)}</p>
                          </div>
                          <div className="p-3 border rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expenses</p>
                            <p className="text-xs font-medium mt-1">{currency(financials.totalExpenses)}</p>
                          </div>
                          <div className="p-3 border rounded-lg bg-primary/5 border-primary/20">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                            <p className="text-xs font-bold text-primary mt-1">{currency(financials.totalCompensation)}</p>
                          </div>
                        </div>

                        {/* Expense Badges */}
                        {Object.keys(financials.expenseBreakdown).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(financials.expenseBreakdown).map(([expId, amount]) => {
                              const meta = expenseTypeMeta[expId];
                              if (!meta) return null;
                              const Icon = meta.icon;
                              return (
                                <span key={expId} className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-md bg-muted/30">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                  {meta.label}: {currency(amount)}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Contract Editor / Preview */}
                        {isEditing ? (
                          <div className="space-y-3">
                            <PlaceholderToolbar onInsert={insertPlaceholderOverride} />
                            <Textarea
                              ref={overrideTextareaRef}
                              value={contractText}
                              onChange={(e) => updateFolder(member.id, 'editedContract', e.target.value)}
                              className="min-h-[280px] font-mono text-sm leading-relaxed"
                            />
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap font-mono text-xs p-4 bg-muted/30 rounded-lg border max-h-[300px] overflow-y-auto leading-relaxed">
                            {renderResolvedPreview(contractText)}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {isEditing ? (
                            <Button variant="outline" size="sm" onClick={() => setEditingMemberId(null)}>
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Preview
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setEditingMemberId(member.id)}>
                              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(contractText)}
                          >
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy
                          </Button>
                          {folder.editedContract != null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resetEditedContract(member.id)}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                              Reset to Generated
                            </Button>
                          )}
                        </div>
                      </TabsContent>

                      {/* ── Tab 2: Documents ── */}
                      <TabsContent value="documents" className="mt-4 space-y-3">
                        {/* W-9 Form */}
                        <div className={`p-4 border rounded-lg transition-all ${folder.documents?.w9_form?.status === 'complete' ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                                folder.documents?.w9_form?.status === 'complete'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-muted'
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

                        {/* Association Member ID */}
                        <div className={`p-4 border rounded-lg transition-all ${folder.documents?.association_member_id?.status === 'complete' ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                                folder.documents?.association_member_id?.status === 'complete'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-muted'
                              }`}>
                                {folder.documents?.association_member_id?.status === 'complete'
                                  ? <CheckCircle className="h-3.5 w-3.5" />
                                  : <Upload className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                              <div>
                                <span className="font-medium text-sm">Association Member ID</span>
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
                                onChange={(e) =>
                                  updateDocument(member.id, 'association_member_id', 'value', e.target.value)
                                }
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

                        {/* Emergency Contact */}
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

                          {/* Primary Contact */}
                          <div className="ml-10 space-y-2">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Contact (Employee)</h5>
                            <p className="text-xs text-muted-foreground">Auto-filled from employee data. Edit if needed.</p>
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

                          {/* Secondary Contact */}
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

                          {/* Optional: upload a signed emergency contact form */}
                          <div className="ml-10 space-y-2">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upload Signed Form (Optional)</h5>
                            <DocUploadZone
                              file={folder.documents?.emergency_contact?.file}
                              onDrop={(file) => updateDocument(member.id, 'emergency_contact', 'file', file)}
                              onRemove={() => updateDocument(member.id, 'emergency_contact', 'file', null)}
                            />
                          </div>
                        </div>

                        {/* Document Summary */}
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            {docsComplete}/3 documents completed
                          </p>
                        </div>
                      </TabsContent>

                      {/* ── Tab 3: Send ── */}
                      <TabsContent value="send" className="mt-4 space-y-4">
                        <div className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-sm">Signature Status</h5>
                            <SignatureBadge status={folder.signatureStatus} />
                          </div>

                          {folder.signatureSentAt && (
                            <p className="text-xs text-muted-foreground">
                              Sent on {new Date(folder.signatureSentAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}

                          {folder.signatureCompletedAt && (
                            <p className="text-xs text-green-600">
                              Signed on {new Date(folder.signatureCompletedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}

                          {countCompleteDocs(folder.documents) < 3 && (
                            <Card className="p-3 bg-amber-500/10 border-amber-500/30">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                  Complete all 3 required documents before sending for signature.
                                </p>
                              </div>
                            </Card>
                          )}

                          <div className="flex gap-2">
                            {folder.signatureStatus === 'not_sent' ? (
                              <Button
                                size="sm"
                                onClick={() => handleSendForSignature(member.id)}
                                disabled={countCompleteDocs(folder.documents) < 3}
                              >
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                Send for Signature
                              </Button>
                            ) : folder.signatureStatus === 'signed' ? (
                              <p className="text-sm text-green-600 flex items-center gap-1.5">
                                <CheckCircle className="h-4 w-4" />
                                Contract signed successfully
                              </p>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendForSignature(member.id)}
                              >
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                Resend
                              </Button>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </motion.div>
  );
};
