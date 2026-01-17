import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText, FileSignature, Shield, DollarSign, Clock, FileCheck, Users, AlertCircle } from 'lucide-react';

const documentTypes = [
  {
    id: 'employment_contract',
    name: 'Employment Contract',
    description: 'Standard employment agreement with terms, responsibilities, and conditions',
    icon: FileSignature,
    category: 'Contracts',
  },
  {
    id: 'independent_contractor',
    name: 'Independent Contractor Agreement',
    description: 'Agreement for freelance/contractor relationships with deliverables',
    icon: FileText,
    category: 'Contracts',
  },
  {
    id: 'nda',
    name: 'Non-Disclosure Agreement (NDA)',
    description: 'Confidentiality agreement for sensitive show information',
    icon: Shield,
    category: 'Legal Documents',
  },
  {
    id: 'liability_waiver',
    name: 'Liability Waiver',
    description: 'Release of liability and assumption of risk for show events',
    icon: FileCheck,
    category: 'Legal Documents',
  },
  {
    id: 'payment_terms',
    name: 'Payment Terms & Schedule',
    description: 'Compensation structure, day fees, rates, and payment schedule',
    icon: DollarSign,
    category: 'Financial',
  },
  {
    id: 'expense_reimbursement',
    name: 'Expense Reimbursement Policy',
    description: 'Travel, lodging, per diem, and reimbursable expense terms',
    icon: DollarSign,
    category: 'Financial',
  },
  {
    id: 'schedule_agreement',
    name: 'Schedule & Availability Agreement',
    description: 'Working hours, show dates, and scheduling terms',
    icon: Clock,
    category: 'Schedule',
  },
];

export const Step3_GenerateContracts = ({ formData, setFormData }) => {
  const selectedDocuments = formData.selectedDocuments || [];
  const selectedPersonnel = formData.selectedPersonnel || [];

  const handleToggleDocument = (docId) => {
    setFormData(prev => {
      const current = prev.selectedDocuments || [];
      if (current.includes(docId)) {
        return { ...prev, selectedDocuments: current.filter(id => id !== docId) };
      } else {
        return { ...prev, selectedDocuments: [...current, docId] };
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === documentTypes.length) {
      setFormData(prev => ({ ...prev, selectedDocuments: [] }));
    } else {
      setFormData(prev => ({ ...prev, selectedDocuments: documentTypes.map(d => d.id) }));
    }
  };

  // Group documents by category
  const groupedDocuments = documentTypes.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {});

  if (selectedPersonnel.length === 0) {
    return (
      <motion.div
        key="step3"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
      >
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Step 3: Select Documents
          </CardTitle>
          <CardDescription>Choose document types to generate for selected officials and staff.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Card className="p-6 border-dashed">
            <div className="flex flex-col items-center justify-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No Personnel Selected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please go back to Step 2 and select at least one official or staff member to generate documents for.
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
      key="step3"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Step 3: Select Documents
        </CardTitle>
        <CardDescription>
          Choose the document types to generate for your selected officials and staff.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        {/* Personnel Summary */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{selectedPersonnel.length} Personnel Selected</p>
              <p className="text-sm text-muted-foreground">
                Documents will be generated for each selected person
              </p>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedDocuments.length} selected</Badge>
            <span className="text-sm text-muted-foreground">of {documentTypes.length} document types</span>
          </div>
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary hover:underline font-medium"
          >
            {selectedDocuments.length === documentTypes.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([category, docs]) => (
            <div key={category} className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                {category}
                <Badge variant="outline" className="text-xs">{docs.length}</Badge>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {docs.map((doc) => {
                  const Icon = doc.icon;
                  const isSelected = selectedDocuments.includes(doc.id);
                  return (
                    <Card
                      key={doc.id}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'hover:border-muted-foreground/50 hover:bg-muted/30'
                      }`}
                      onClick={() => handleToggleDocument(doc.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleDocument(doc.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                            <Label className="font-medium cursor-pointer">{doc.name}</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">{doc.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <Card className="p-4 border-2 border-dashed">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Generation Summary</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedDocuments.length} document type(s) × {selectedPersonnel.length} person(s)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {selectedDocuments.length * selectedPersonnel.length}
              </p>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </div>
          </div>
        </Card>
      </CardContent>
    </motion.div>
  );
};
