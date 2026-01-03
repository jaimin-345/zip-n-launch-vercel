import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, FileText, Download, User, CheckCircle, Clock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const documentTypes = {
  employment_contract: 'Employment Contract',
  independent_contractor: 'Independent Contractor Agreement',
  nda: 'Non-Disclosure Agreement (NDA)',
  payment_terms: 'Payment Terms & Schedule',
  schedule_agreement: 'Schedule & Availability Agreement',
  liability_waiver: 'Liability Waiver',
};

export const Step4_Preview = ({ formData, setFormData }) => {
  const { selectedPersonnel = [], selectedDocuments = [], associationJudges = {}, officials = [] } = formData;

  // Get all personnel details
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
            Step 4: Preview
          </CardTitle>
          <CardDescription>
            Please select personnel (Step 2) and document types (Step 3) to preview contracts.
          </CardDescription>
        </CardHeader>
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
          Step 4: Preview Contracts
        </CardTitle>
        <CardDescription>
          Review the contracts that will be generated for each person.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{selectedPersonnelDetails.length}</p>
            <p className="text-sm text-muted-foreground">Personnel</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{selectedDocuments.length}</p>
            <p className="text-sm text-muted-foreground">Document Types</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {selectedPersonnelDetails.length * selectedDocuments.length}
            </p>
            <p className="text-sm text-muted-foreground">Total Contracts</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">0</p>
            <p className="text-sm text-muted-foreground">Pending Signature</p>
          </Card>
        </div>

        <Accordion type="multiple" className="w-full">
          {selectedPersonnelDetails.map((person) => (
            <AccordionItem key={person.id} value={person.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{person.name || 'Unnamed'}</span>
                  <Badge variant="secondary">{person.role || 'Staff'}</Badge>
                  <Badge variant="outline">{selectedDocuments.length} documents</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {selectedDocuments.map((docId) => (
                    <div
                      key={docId}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{documentTypes[docId]}</p>
                          <p className="text-xs text-muted-foreground">
                            For: {person.name || 'Unnamed'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-amber-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Draft
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download All as ZIP
          </Button>
          <Button className="flex-1">
            <CheckCircle className="h-4 w-4 mr-2" />
            Generate & Send for Signature
          </Button>
        </div>
      </CardContent>
    </motion.div>
  );
};
