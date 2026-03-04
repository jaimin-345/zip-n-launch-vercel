import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, Maximize, Info, Check, ChevronDown, ChevronUp, Pencil, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import ManeuverList from './ManeuverList';
import FreehandAnnotationCanvas from './FreehandAnnotationCanvas';
import FocusMode from './FocusMode';

// Reconstruct a File from a data URL (for saved projects where .file is stripped)
const dataUrlToFile = (dataUrl, fileName = 'pattern.pdf') => {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/pdf';
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
};

// Get the File object from a pattern, reconstructing from dataUrl if needed
const getPatternFile = (pattern) => {
  if (!pattern) return null;
  if (pattern.file) return pattern.file;
  if (pattern.dataUrl) return dataUrlToFile(pattern.dataUrl, pattern.name || 'pattern.pdf');
  return null;
};

export const Step4_ManeuverAnnotation = ({ formData, setFormData, uploadSlots }) => {
  const { toast } = useToast();

  // Get uploaded patterns (uses uploadSlots which adapts to discipline/hierarchy mode)
  const slots = uploadSlots || formData.hierarchyOrder;
  const uploadedPatterns = useMemo(() => {
    return slots
      .filter(h => formData.patterns[h.id])
      .map(h => ({
        levelId: h.id,
        title: h.title,
        pattern: formData.patterns[h.id],
      }));
  }, [slots, formData.patterns]);

  const [activePatternId, setActivePatternId] = useState(
    uploadedPatterns[0]?.levelId || null
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(null);
  const [pdfImageUrls, setPdfImageUrls] = useState({});
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  // Text extraction pipeline state
  const [extractedVerbiage, setExtractedVerbiage] = useState(null); // { raw, steps, warnings }
  const [isEditingRaw, setIsEditingRaw] = useState(false);
  const [editableRawText, setEditableRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);

  // Set active pattern when patterns change
  useEffect(() => {
    if (!activePatternId && uploadedPatterns.length > 0) {
      setActivePatternId(uploadedPatterns[0].levelId);
    }
  }, [uploadedPatterns, activePatternId]);

  // Clear extraction state when switching patterns
  useEffect(() => {
    setExtractedVerbiage(null);
    setIsEditingRaw(false);
    setShowRawText(false);
  }, [activePatternId]);

  // Render PDF pages to images for annotation canvas
  useEffect(() => {
    const renderPdfImages = async () => {
      for (const { levelId, pattern } of uploadedPatterns) {
        if (pdfImageUrls[levelId]) continue;
        if (!pattern?.dataUrl) continue;

        try {
          const pdfjs = await import('react-pdf');
          const pdfjsLib = pdfjs.pdfjs;

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

  // Extract maneuvers from PDF (numbered steps only — legacy button)
  const handleExtractManeuvers = useCallback(async (levelId) => {
    const pattern = formData.patterns[levelId];
    const file = getPatternFile(pattern);
    if (!file) {
      toast({ title: 'No file available', description: 'Pattern file is required for extraction.', variant: 'destructive' });
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(null);
    try {
      const { extractPatternStepsWithProgress } = await import('@/lib/pdfUtils');
      const stepMap = await extractPatternStepsWithProgress(file, (progress) => {
        setExtractionProgress(progress);
      });

      const maneuvers = Object.entries(stepMap).map(([stepNum, instruction]) => ({
        id: uuidv4(),
        stepNumber: parseInt(stepNum),
        instruction,
        isOptional: false,
      }));

      if (maneuvers.length === 0) {
        toast({
          title: 'No Maneuvers Found',
          description: 'Could not extract numbered steps from this PDF. Try using Focus Mode → "Select Text Area" or "Extract All Text" for better results.',
          variant: 'default',
          duration: 8000,
        });
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
      toast({
        title: 'Extraction Failed',
        description: 'Could not read text from this PDF. Try using Focus Mode → "Extract All Text" for a more thorough extraction.',
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setIsExtracting(false);
      setExtractionProgress(null);
    }
  }, [formData.patterns, setFormData, toast]);

  // Full text extraction from FocusMode (region or full-page)
  const handleExtractText = useCallback(async (bounds) => {
    const pattern = formData.patterns[activePatternId];
    const file = getPatternFile(pattern);
    if (!file) {
      toast({ title: 'No file available', description: 'Pattern file is required for extraction.', variant: 'destructive' });
      return;
    }

    try {
      const { extractAllTextFromRegion } = await import('@/lib/pdfUtils');
      const { formatPatternVerbiage } = await import('@/lib/patternTextFormatter');

      const { rawText, lines } = await extractAllTextFromRegion(file, bounds);

      if (!rawText || rawText.trim().length === 0) {
        toast({
          title: 'No Text Found',
          description: bounds
            ? 'No text was found in the selected area. Try selecting a larger region or use "Extract All Text".'
            : 'No text layer found in this PDF. The pattern may be an image-based PDF.',
          variant: 'default',
          duration: 6000,
        });
        return;
      }

      const { steps, warnings } = formatPatternVerbiage(rawText, lines);

      setExtractedVerbiage({ raw: rawText, steps, warnings });
      setEditableRawText(rawText);
      setIsEditingRaw(false);
      setShowRawText(false);
      setFocusModeOpen(false);

      if (steps.length > 0) {
        toast({ title: 'Text Extracted', description: `Found ${steps.length} maneuver steps. Review below.` });
      } else {
        toast({
          title: 'Text Extracted',
          description: 'Text was found but no maneuver steps could be parsed. You can edit the raw text and re-format.',
          variant: 'default',
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('Text extraction error:', error);
      toast({
        title: 'Extraction Failed',
        description: 'Could not extract text from this PDF.',
        variant: 'destructive',
      });
    }
  }, [activePatternId, formData.patterns, toast]);

  // Accept extracted verbiage → populate ManeuverList + save raw + template-ready format
  const handleAcceptVerbiage = useCallback(async () => {
    if (!extractedVerbiage || !activePatternId) return;

    // Generate Pattern Book template-ready format
    let templateReady = null;
    try {
      const { toPatternBookFormat } = await import('@/lib/patternTextFormatter');
      const activePattern = uploadedPatterns.find(p => p.levelId === activePatternId);
      templateReady = toPatternBookFormat(extractedVerbiage.steps, {
        levelTitle: activePattern?.title || '',
      });
    } catch (e) {
      // Non-critical — template format is a bonus
    }

    setFormData(prev => ({
      ...prev,
      patternManeuvers: {
        ...prev.patternManeuvers,
        [activePatternId]: extractedVerbiage.steps,
      },
      patternVerbiage: {
        ...prev.patternVerbiage,
        [activePatternId]: {
          raw: extractedVerbiage.raw,
          formatted: extractedVerbiage.steps,
          templateReady,
          extractedAt: new Date().toISOString(),
        },
      },
    }));

    toast({
      title: 'Pattern formatted and saved successfully',
      description: `${extractedVerbiage.steps.length} maneuver steps — template-ready for Pattern Book.`,
    });
    setExtractedVerbiage(null);
    setIsEditingRaw(false);
    setShowRawText(false);
  }, [extractedVerbiage, activePatternId, uploadedPatterns, setFormData, toast]);

  // Re-format edited raw text
  const handleReformat = useCallback(async () => {
    try {
      const { formatPatternVerbiage } = await import('@/lib/patternTextFormatter');
      const { steps, warnings } = formatPatternVerbiage(editableRawText);
      setExtractedVerbiage(prev => ({ ...prev, raw: editableRawText, steps, warnings }));
      setIsEditingRaw(false);
      toast({ title: 'Re-formatted', description: `Parsed ${steps.length} maneuver steps from edited text.` });
    } catch (error) {
      toast({ title: 'Format Error', description: 'Could not parse the edited text.', variant: 'destructive' });
    }
  }, [editableRawText, toast]);

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

  // Template validation for active maneuvers
  const validationResult = useMemo(() => {
    const maneuvers = formData.patternManeuvers[activePatternId];
    if (!maneuvers || maneuvers.length === 0) return null;
    // Lazy import result — compute synchronously with inline check
    const issues = [];
    if (maneuvers.some(s => !s.instruction?.trim())) {
      issues.push('Some steps have empty instructions.');
    }
    const KNOWN_VERBS = [
      'walk', 'trot', 'jog', 'lope', 'canter', 'gallop', 'back', 'stop', 'halt', 'whoa',
      'turn', 'pivot', 'spin', 'reverse', 'rollback', 'side', 'sidepass',
      'circle', 'lead', 'change', 'extend', 'collect', 'square', 'set', 'pick',
      'drop', 'settle', 'continue', 'proceed', 'begin', 'start', 'finish', 'complete',
      'cross', 'pass', 'round', 'ride', 'execute', 'perform',
    ];
    const firstWord = (maneuvers[0]?.instruction || '').split(/\s+/)[0].toLowerCase();
    if (firstWord && !KNOWN_VERBS.includes(firstWord)) {
      issues.push(`First step doesn't start with a recognized action verb.`);
    }
    return { isValid: issues.length === 0, issues };
  }, [formData.patternManeuvers, activePatternId]);

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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Maneuver List</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFocusModeOpen(true)}
                    disabled={!pdfImageUrls[activePatternId]}
                  >
                    <Maximize className="mr-2 h-3.5 w-3.5" />
                    Focus on Pattern
                  </Button>
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
              </div>

              {/* Extraction progress */}
              {extractionProgress && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{extractionProgress.message}</span>
                </div>
              )}

              {/* Captured image action banner */}
              {capturedImage && !extractedVerbiage && (
                <div className="flex items-center gap-2 p-3 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                  <Info className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">Cleaned image captured.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => {
                      handleExtractManeuvers(activePatternId);
                      setCapturedImage(null);
                    }}
                  >
                    <Wand2 className="mr-1.5 h-3 w-3" /> Extract Maneuvers
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCapturedImage(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Extracted verbiage review panel */}
              <AnimatePresence>
                {extractedVerbiage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            Text Extracted — {extractedVerbiage.steps.length} maneuver step{extractedVerbiage.steps.length !== 1 ? 's' : ''} found
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setExtractedVerbiage(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Raw text toggle */}
                      <button
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowRawText(!showRawText)}
                      >
                        {showRawText ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        Raw Text
                      </button>

                      {showRawText && (
                        <div className="rounded-md border bg-background p-3">
                          {isEditingRaw ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editableRawText}
                                onChange={(e) => setEditableRawText(e.target.value)}
                                className="min-h-[120px] text-xs font-mono"
                              />
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={handleReformat}>
                                  <Wand2 className="mr-1.5 h-3 w-3" /> Re-format
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setIsEditingRaw(false);
                                    setEditableRawText(extractedVerbiage.raw);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-32 overflow-auto">
                                {extractedVerbiage.raw}
                              </pre>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsEditingRaw(true);
                                  setEditableRawText(extractedVerbiage.raw);
                                }}
                              >
                                <Pencil className="mr-1.5 h-3 w-3" /> Edit Raw Text
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Formatted steps preview — Template Preview */}
                      {extractedVerbiage.steps.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Template Preview</span>
                            <Badge variant="outline" className="text-[10px]">Pattern Book Ready</Badge>
                          </div>
                          <div className="rounded-md border bg-white dark:bg-gray-950 p-4 space-y-1.5 max-h-56 overflow-auto font-mono text-[13px]">
                            {extractedVerbiage.steps.map((step) => (
                              <div key={step.id} className="flex items-start gap-3">
                                <span className="font-semibold text-muted-foreground min-w-[24px] text-right shrink-0 tabular-nums">
                                  {step.stepNumber}.
                                </span>
                                <span className="text-foreground leading-snug">{step.instruction}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {extractedVerbiage.warnings.length > 0 && (
                        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{extractedVerbiage.warnings.join(' ')}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={handleAcceptVerbiage}
                          disabled={extractedVerbiage.steps.length === 0}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" /> Accept & Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowRawText(true);
                            setIsEditingRaw(true);
                            setEditableRawText(extractedVerbiage.raw);
                          }}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Raw Text
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExtractedVerbiage(null)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {activeManeuvers.length === 0 && !extractedVerbiage ? (
                <div className="flex flex-col items-center justify-center h-32 rounded-md border border-dashed bg-muted/30 gap-2">
                  <p className="text-sm text-muted-foreground">No maneuvers yet</p>
                  <p className="text-xs text-muted-foreground">
                    {uploadedPatterns.some(p => slots.find(s => s.id === p.levelId)?.isDisciplineSlot)
                      ? 'Maneuvers are optional for jumping patterns — skip if not applicable.'
                      : 'Use Focus Mode → "Extract All Text" or "Auto-Extract from PDF"'}
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

      <FocusMode
        isOpen={focusModeOpen}
        onClose={() => setFocusModeOpen(false)}
        imageUrl={pdfImageUrls[activePatternId]}
        pdfFile={getPatternFile(formData.patterns[activePatternId])}
        onCapture={(dataUrl) => {
          setCapturedImage(dataUrl);
          setFocusModeOpen(false);
        }}
        onExtractText={handleExtractText}
      />
    </motion.div>
  );
};
