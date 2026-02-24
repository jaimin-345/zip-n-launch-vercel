import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import PatternUploader from '@/components/pattern-upload/PatternUploader';
import CommonDivisionsSelector from '@/components/pattern-upload/CommonDivisionsSelector';

export const Step3_UploadAndOrganize = ({
  formData,
  setFormData,
  handleFileDrop,
  handleRemovePattern,
  handlePdfSplit,
  assignStagedPdf,
  removeStagedPdf,
  renameStagedPdf,
  handleDivisionChange,
  handleDivisionGroupChange,
  handleBulkDivisionChange,
  divisionsData,
  onHover,
  onLeave,
  onPreview,
  hoveredPattern,
  pinnedPattern,
  handlePinPattern,
  selectedAssociationIds,
}) => {
  // Filter divisionsData to only selected associations
  const filteredDivisionsData = useMemo(() => {
    if (!divisionsData) return {};
    const filtered = {};
    selectedAssociationIds.forEach(assocId => {
      if (divisionsData[assocId]) {
        filtered[assocId] = divisionsData[assocId];
      }
    });
    return filtered;
  }, [divisionsData, selectedAssociationIds]);

  const hasPatterns = Object.values(formData.patterns).some(p => p);
  const hasDivisions = Object.keys(filteredDivisionsData).length > 0;

  return (
    <motion.div
      key="step-3"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Step 3: Upload & Organize Patterns</CardTitle>
        <CardDescription className="text-sm">
          Upload PDF patterns and assign them to skill level slots. Multi-page PDFs will be split automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PatternUploader
          hierarchyOrder={formData.hierarchyOrder}
          setHierarchyOrder={(val) =>
            setFormData(prev => ({
              ...prev,
              hierarchyOrder: typeof val === 'function' ? val(prev.hierarchyOrder) : val,
            }))
          }
          patterns={formData.patterns}
          handleFileDrop={handleFileDrop}
          handleRemovePattern={handleRemovePattern}
          onHover={onHover}
          onLeave={onLeave}
          onPreview={onPreview}
          hoveredPattern={hoveredPattern}
          stagedPdfs={formData.stagedPdfs}
          handlePdfSplit={handlePdfSplit}
          assignStagedPdf={assignStagedPdf}
          removeStagedPdf={removeStagedPdf}
          renameStagedPdf={renameStagedPdf}
          pinnedPattern={pinnedPattern}
          handlePinPattern={handlePinPattern}
        />

        {hasDivisions && hasPatterns && (
          <CommonDivisionsSelector
            divisionsByAssociation={filteredDivisionsData}
            onBulkDivisionChange={handleBulkDivisionChange}
            patternDivisions={formData.patternDivisions}
            hierarchyOrder={formData.hierarchyOrder}
            patterns={formData.patterns}
          />
        )}
      </CardContent>
    </motion.div>
  );
};
