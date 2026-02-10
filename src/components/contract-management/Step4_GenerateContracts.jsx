import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Info, User, Eye, Copy, RotateCcw, Edit3, Send,
  CheckCircle, Clock, XCircle, ShieldCheck,
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
  signed_contract: { status: 'pending', note: '', file: null },
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
  other_documents: [],
});

const SIGNATURE_LABELS = {
  not_sent: { label: 'Not Sent', className: 'bg-muted text-muted-foreground', icon: Clock },
  sent: { label: 'Sent', className: 'bg-blue-500/10 text-blue-600 border-blue-600/30', icon: Send },
  viewed: { label: 'Viewed', className: 'bg-amber-500/10 text-amber-600 border-amber-600/30', icon: Eye },
  signed: { label: 'Signed', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-600/30', icon: CheckCircle },
  approved: { label: 'Approved', className: 'bg-green-500/10 text-green-600 border-green-600/30', icon: ShieldCheck },
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

  const handleSendForSignature = (memberId) => {
    const folder = employeeFolders[memberId];
    if (!folder) return;

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
      description: `Contract sent to ${member?.name || 'employee'} for signature. Document upload link included.`,
    });
  };

  const handleMarkSigned = (memberId) => {
    setFormData(prev => ({
      ...prev,
      employeeFolders: {
        ...prev.employeeFolders,
        [memberId]: {
          ...prev.employeeFolders[memberId],
          signatureStatus: 'signed',
          signatureCompletedAt: new Date().toISOString(),
        },
      },
    }));
    const member = personnel.find(m => m.id === memberId);
    toast({
      title: 'Contract Signed',
      description: `${member?.name || 'Employee'} contract marked as signed.`,
    });
  };

  const handleApprove = (memberId) => {
    setFormData(prev => ({
      ...prev,
      employeeFolders: {
        ...prev.employeeFolders,
        [memberId]: {
          ...prev.employeeFolders[memberId],
          signatureStatus: 'approved',
          approvedAt: new Date().toISOString(),
        },
      },
    }));
    const member = personnel.find(m => m.id === memberId);
    toast({
      title: 'Contract Approved',
      description: `${member?.name || 'Employee'} contract approved. Collect remaining documents in Step 5.`,
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
    return {
      total: folders.length,
      signed: folders.filter(f => f.signatureStatus === 'signed' || f.signatureStatus === 'approved').length,
      sent: folders.filter(f => f.signatureStatus === 'sent' || f.signatureStatus === 'viewed').length,
      approved: folders.filter(f => f.signatureStatus === 'approved').length,
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
          <Send className="h-5 w-5 text-primary" />
          Step 4: Generate & Send Contracts
        </CardTitle>
        <CardDescription>
          Review and customize individual contracts, then send for signature. Documents will be collected after signing in Step 5.
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
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sent</p>
              <p className="text-lg font-bold mt-1">{stats.sent}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Signed</p>
              <p className="text-lg font-bold mt-1">{stats.signed}</p>
            </Card>
            <Card className="p-3 bg-green-500/5 border-green-500/20">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Approved</p>
              <p className="text-lg font-bold text-green-600 mt-1">{stats.approved}/{stats.total}</p>
            </Card>
          </div>
        )}

        {/* Flow Info Banner */}
        {personnel.length > 0 && (
          <Card className="p-3 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Contract Flow:</strong> Send contract → Employee signs → Employee uploads documents (W-9, Membership, Emergency Info) → Admin collects & tracks documents in Step 5.
              </p>
            </div>
          </Card>
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
                      <TabsList className="grid w-full grid-cols-2 max-w-sm">
                        <TabsTrigger value="contract">Contract</TabsTrigger>
                        <TabsTrigger value="send">Send & Track</TabsTrigger>
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

                      {/* ── Tab 2: Send & Track ── */}
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

                          <div className="flex flex-wrap gap-2">
                            {/* Send */}
                            {folder.signatureStatus === 'not_sent' && (
                              <Button size="sm" onClick={() => handleSendForSignature(member.id)}>
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                Send for Signature
                              </Button>
                            )}

                            {/* Resend + Mark Signed */}
                            {(folder.signatureStatus === 'sent' || folder.signatureStatus === 'viewed') && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleSendForSignature(member.id)}>
                                  <Send className="h-3.5 w-3.5 mr-1.5" />
                                  Resend
                                </Button>
                                <Button size="sm" onClick={() => handleMarkSigned(member.id)}>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                  Mark as Signed
                                </Button>
                              </>
                            )}

                            {/* Approve (no document requirement) */}
                            {folder.signatureStatus === 'signed' && (
                              <Button size="sm" onClick={() => handleApprove(member.id)}>
                                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                                Approve
                              </Button>
                            )}

                            {/* Approved */}
                            {folder.signatureStatus === 'approved' && (
                              <p className="text-sm text-green-600 flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4" />
                                Approved — eligible for payment
                              </p>
                            )}

                            {/* Declined */}
                            {folder.signatureStatus === 'declined' && (
                              <Button variant="outline" size="sm" onClick={() => handleSendForSignature(member.id)}>
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                Resend
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Post-signing info */}
                        {folder.signatureStatus !== 'not_sent' && (
                          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
                            <div className="flex items-center gap-2">
                              <Info className="h-4 w-4 text-blue-500 shrink-0" />
                              <p className="text-xs text-muted-foreground">
                                The signing email includes a link for the employee to upload required documents (W-9, Membership ID, Emergency Info). Track and manage uploaded documents in <strong>Step 5</strong>.
                              </p>
                            </div>
                          </Card>
                        )}
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
