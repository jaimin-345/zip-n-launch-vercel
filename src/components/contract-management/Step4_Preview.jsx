import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, FileText, Download, User, CheckCircle, Clock, AlertCircle, Send, Printer, Users, FileSignature } from 'lucide-react';
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
  const { selectedPersonnel = [], selectedDocuments = [], associationJudges = {}, officials = [] } = formData;

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
          Review all documents that will be generated for your officials and staff.
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
                <p className="text-xs text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Pending Signature</p>
              </div>
            </div>
          </Card>
        </div>

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
                        <span className="text-xs text-muted-foreground">{selectedDocuments.length} documents</span>
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
                            Draft
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Eye className="h-4 w-4" />
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
              <Printer className="h-4 w-4 mr-2" />
              Print All
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download as ZIP
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
