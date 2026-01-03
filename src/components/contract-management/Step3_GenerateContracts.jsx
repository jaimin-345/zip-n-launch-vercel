import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileText, FileSignature, Shield, DollarSign, Clock, FileCheck } from 'lucide-react';

const documentTypes = [
  {
    id: 'employment_contract',
    name: 'Employment Contract',
    description: 'Standard employment agreement with terms and conditions',
    icon: FileSignature,
    category: 'Contract',
  },
  {
    id: 'independent_contractor',
    name: 'Independent Contractor Agreement',
    description: 'Agreement for freelance/contractor relationships',
    icon: FileText,
    category: 'Contract',
  },
  {
    id: 'nda',
    name: 'Non-Disclosure Agreement (NDA)',
    description: 'Confidentiality agreement for sensitive information',
    icon: Shield,
    category: 'Legal',
  },
  {
    id: 'payment_terms',
    name: 'Payment Terms & Schedule',
    description: 'Payment structure, rates, and schedule',
    icon: DollarSign,
    category: 'Financial',
  },
  {
    id: 'schedule_agreement',
    name: 'Schedule & Availability Agreement',
    description: 'Working hours, availability, and scheduling terms',
    icon: Clock,
    category: 'Schedule',
  },
  {
    id: 'liability_waiver',
    name: 'Liability Waiver',
    description: 'Release of liability and assumption of risk',
    icon: FileCheck,
    category: 'Legal',
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
            Step 3: Generate Contracts
          </CardTitle>
          <CardDescription>Please select at least one person in Step 2.</CardDescription>
        </CardHeader>
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
          Step 3: Generate Contracts
        </CardTitle>
        <CardDescription>
          Select document types to generate for {selectedPersonnel.length} selected personnel.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedDocuments.length} document type(s) selected
          </p>
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary hover:underline"
          >
            {selectedDocuments.length === documentTypes.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([category, docs]) => (
            <div key={category} className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {category}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {docs.map((doc) => {
                  const Icon = doc.icon;
                  return (
                    <Card
                      key={doc.id}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedDocuments.includes(doc.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => handleToggleDocument(doc.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={() => handleToggleDocument(doc.id)}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
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

        <div className="p-4 border rounded-lg bg-muted/30">
          <h4 className="font-semibold mb-2">Summary</h4>
          <p className="text-sm text-muted-foreground">
            {selectedDocuments.length} document type(s) will be generated for {selectedPersonnel.length} person(s).
          </p>
          <p className="text-sm font-medium mt-1">
            Total contracts to generate: {selectedDocuments.length * selectedPersonnel.length}
          </p>
        </div>
      </CardContent>
    </motion.div>
  );
};
