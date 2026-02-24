import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import ManeuverList from './ManeuverList';
import FreehandAnnotationCanvas from './FreehandAnnotationCanvas';

export const Step4_ManeuverAnnotation = ({ formData, setFormData }) => {
  const { toast } = useToast();

  // Get uploaded patterns
  const uploadedPatterns = useMemo(() => {
    return formData.hierarchyOrder
      .filter(h => formData.patterns[h.id])
      .map(h => ({
        levelId: h.id,
        title: h.title,
        pattern: formData.patterns[h.id],
      }));
  }, [formData.hierarchyOrder, formData.patterns]);

  const [activePatternId, setActivePatternId] = useState(
    uploadedPatterns[0]?.levelId || null
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [pdfImageUrls, setPdfImageUrls] = useState({});

  // Set active pattern when patterns change
  useEffect(() => {
    if (!activePatternId && uploadedPatterns.length > 0) {
      setActivePatternId(uploadedPatterns[0].levelId);
    }
  }, [uploadedPatterns, activePatternId]);

  // Render PDF pages to images for annotation canvas
  useEffect(() => {
    const renderPdfImages = async () => {
      for (const { levelId, pattern } of uploadedPatterns) {
        if (pdfImageUrls[levelId]) continue;
        if (!pattern?.dataUrl) continue;

        try {
          const pdfjs = await import('react-pdf');
          const pdfjsLib = pdfjs.pdfjs;

          // Convert dataUrl to ArrayBuffer
          const binaryStr = atob(pattern.dataUrl.split(',')[1]);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          const loadingTask = pdfjsLib.getDocument({ data: bytes });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          await page.render({ canvasContext: ctx, viewport }).promise;
          const imageUrl = canvas.toDataURL('image/png');

          setPdfImageUrls(prev => ({ ...prev, [levelId]: imageUrl }));
        } catch (error) {
          console.error(`Error rendering PDF for ${levelId}:`, error);
        }
      }
    };

    renderPdfImages();
  }, [uploadedPatterns, pdfImageUrls]);

  // Extract maneuvers from PDF
  const handleExtractManeuvers = useCallback(async (levelId) => {
    const pattern = formData.patterns[levelId];
    if (!pattern?.file) {
      toast({ title: 'No file available', description: 'Pattern file is required for extraction.', variant: 'destructive' });
      return;
    }

    setIsExtracting(true);
    try {
      const { extractPatternSteps } = await import('@/lib/pdfUtils');
      const stepMap = await extractPatternSteps(pattern.file);

      const maneuvers = Object.entries(stepMap).map(([stepNum, instruction]) => ({
        id: uuidv4(),
        stepNumber: parseInt(stepNum),
        instruction,
        isOptional: false,
      }));

      if (maneuvers.length === 0) {
        toast({ title: 'No maneuvers found', description: 'Could not extract numbered steps from this PDF.', variant: 'default' });
        return;
      }

      setFormData(prev => ({
        ...prev,
        patternManeuvers: {
          ...prev.patternManeuvers,
          [levelId]: maneuvers,
        },
      }));

      toast({ title: 'Maneuvers Extracted', description: `Found ${maneuvers.length} maneuver steps.` });
    } catch (error) {
      toast({ title: 'Extraction Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsExtracting(false);
    }
  }, [formData.patterns, setFormData, toast]);

  const handleManeuversChange = useCallback((levelId, maneuvers) => {
    setFormData(prev => ({
      ...prev,
      patternManeuvers: {
        ...prev.patternManeuvers,
        [levelId]: maneuvers,
      },
    }));
  }, [setFormData]);

  const handleAnnotationChange = useCallback((levelId, annotation) => {
    setFormData(prev => ({
      ...prev,
      patternAnnotations: {
        ...prev.patternAnnotations,
        [levelId]: annotation,
      },
    }));
  }, [setFormData]);

  if (uploadedPatterns.length === 0) {
    return (
      <motion.div
        key="step-4"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Step 4: Maneuver Editing & Annotation</CardTitle>
          <CardDescription className="text-sm">
            Extract and edit maneuver lists, and annotate your pattern images.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 rounded-md border border-dashed bg-muted/30">
            <p className="text-sm text-muted-foreground">
              No patterns uploaded yet. Go back to Step 3 to upload patterns first.
            </p>
          </div>
        </CardContent>
      </motion.div>
    );
  }

  const activeManeuvers = formData.patternManeuvers[activePatternId] || [];
  const activeAnnotation = formData.patternAnnotations[activePatternId] || null;

  return (
    <motion.div
      key="step-4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Step 4: Maneuver Editing & Annotation</CardTitle>
        <CardDescription className="text-sm">
          Extract and edit maneuver lists from your patterns, and draw annotations directly on pattern images. This step is optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pattern tabs */}
        {uploadedPatterns.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {uploadedPatterns.map(({ levelId, title }) => (
              <Button
                key={levelId}
                variant={activePatternId === levelId ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePatternId(levelId)}
              >
                {title}
                {formData.patternManeuvers[levelId]?.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {formData.patternManeuvers[levelId].length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        )}

        {activePatternId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Maneuver List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Maneuver List</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExtractManeuvers(activePatternId)}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-3.5 w-3.5" />
                  )}
                  Auto-Extract from PDF
                </Button>
              </div>

              {activeManeuvers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 rounded-md border border-dashed bg-muted/30 gap-2">
                  <p className="text-sm text-muted-foreground">No maneuvers yet</p>
                  <p className="text-xs text-muted-foreground">
                    Click "Auto-Extract from PDF" or add manually below
                  </p>
                </div>
              ) : null}

              <ManeuverList
                maneuvers={activeManeuvers}
                onChange={(maneuvers) => handleManeuversChange(activePatternId, maneuvers)}
              />
            </div>

            {/* Right: Annotation Canvas */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Pattern Annotation</h3>
              <p className="text-xs text-muted-foreground">
                Draw, circle, or highlight areas on the pattern image.
              </p>
              <FreehandAnnotationCanvas
                backgroundImageUrl={pdfImageUrls[activePatternId]}
                onAnnotationChange={(annotation) => handleAnnotationChange(activePatternId, annotation)}
                initialAnnotation={activeAnnotation}
              />
            </div>
          </div>
        )}
      </CardContent>
    </motion.div>
  );
};
