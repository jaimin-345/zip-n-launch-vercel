import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Info, GitMerge, ListPlus, Layers, LayoutTemplate, UploadCloud, Eye, ArrowLeft, ArrowRight, Save, Download, FileText, Image as ImageIcon, Printer, Mail, Share2, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import * as pdfjsLib from 'pdfjs-dist';

// Set worker at module level so Vite resolves it as a static asset
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

import { StepContainer } from './StepContainer';
import { Step3_DivisionAndLevel } from './Step3_DivisionAndLevel';
import { usePatternHub } from '@/hooks/usePatternHub';
import { Step1_Associations } from '@/components/pbb/Step1_Associations';
import { Step2_ClassesAndDivisions } from '@/components/pbb/Step2_ClassesAndDivisions';
import { Step4_Uploads } from '@/components/pbb/Step4_Uploads';
import { Step6_PatternAndLayout } from '@/components/pbb/Step6_PatternAndLayout';
import { Step6_Preview } from '@/components/pbb/Step6_Preview';

import { BuilderSteps } from '@/components/pbb/BuilderSteps';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generatePatternBookPdf } from '@/lib/bookGenerator';

// All possible steps — step 3 is conditionally shown for horse_show only
const ALL_STEPS = [
  { id: 0, name: 'Usage Purpose', icon: Info },
  { id: 1, name: 'Event Setup', icon: GitMerge },
  { id: 2, name: 'Select Disciplines', icon: ListPlus },
  { id: 3, name: 'Division & Level', icon: Layers, horseShowOnly: true },
  { id: 4, name: 'Pattern Selection', icon: LayoutTemplate },
  { id: 5, name: 'Uploads & Media', icon: UploadCloud },
  { id: 6, name: 'Preview Pattern', icon: Eye },
  { id: 7, name: 'Generate', icon: Download },
];

const UsagePurposeStep = ({ setFormData, usageType, usagePurposes, isLoadingPurposes }) => {
    const getShowName = (type) => {
        if (type === 'horse_show') return 'Horse Show Patterns';
        if (type === 'clinic') return '';
        if (type === 'just_for_fun') return 'Choose a Pattern';
        return 'Choose a Pattern';
    };

    return (
        <StepContainer title="Purpose" description="Select how you intend to use the patterns or score sheets you're looking for.">
            {isLoadingPurposes ? (
                <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-2">
                    <Label htmlFor="usage-type">Purpose</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({ ...prev, usageType: value, showName: getShowName(value) }))} value={usageType}>
                        <SelectTrigger id="usage-type" className="w-full">
                            <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                            {usagePurposes.map(purpose => (
                                <SelectItem key={purpose.id} value={purpose.id}>{purpose.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </StepContainer>
    );
};

const GENERATE_OPTIONS = [
    { id: 'pdf', label: 'Download as PDF', icon: FileText, description: 'Save pattern as a PDF file' },
    { id: 'png', label: 'Download as PNG', icon: ImageIcon, description: 'Save pattern as an image' },
    { id: 'print', label: 'Print', icon: Printer, description: 'Send directly to printer' },
    { id: 'email', label: 'Send Email', icon: Mail, description: 'Email pattern to yourself or others' },
    { id: 'share', label: 'Share Link', icon: Share2, description: 'Copy a shareable link' },
];

const GenerateStep = ({ isGenerated, formData, setFormData, onGenerateOption, isGenerating }) => {
    // Extract pattern summary from formData
    const patternSummary = useMemo(() => {
        const summaries = [];
        const disciplines = formData?.disciplines?.filter(d => d.pattern) || [];
        for (const disc of disciplines) {
            const groups = disc.patternGroups || [];
            for (const group of groups) {
                const selection = formData?.patternSelections?.[disc.id]?.[group.id];
                if (selection?.patternId) {
                    const divisions = (group.divisions || []).map(d => d.division).filter(Boolean);
                    const categories = [...new Set((group.divisions || []).map(d => d.category).filter(Boolean))];
                    summaries.push({
                        patternName: selection.patternName || selection.patternId,
                        discipline: disc.name || disc.label || 'Unknown',
                        divisions,
                        categories,
                    });
                }
            }
        }
        return summaries;
    }, [formData]);

    const downloadIncludes = formData?.downloadIncludes || { pattern: true, scoresheet: true };

    const toggleInclude = (key) => {
        setFormData(prev => ({
            ...prev,
            downloadIncludes: {
                ...prev.downloadIncludes,
                [key]: !prev.downloadIncludes?.[key],
            },
        }));
    };

    return (
        <motion.div key="step-generate" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader className="pb-3">
                <CardTitle className="text-xl">{isGenerated ? 'Generation Complete' : 'Generate Pattern'}</CardTitle>
                <CardDescription className="text-sm">
                    {isGenerated
                        ? 'Your pattern has been generated and saved to your projects.'
                        : 'Your pattern is ready. Choose how you\'d like to get it.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isGenerated ? (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center space-y-4">
                        <Download className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                        <p className="text-lg font-medium">Done!</p>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Your pattern has been downloaded and saved to My Projects.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Pattern Summary */}
                        {patternSummary.length > 0 && (
                            <div className="rounded-lg border bg-muted/30 p-3 sm:p-4 space-y-3">
                                <p className="text-sm font-semibold text-foreground">Pattern Summary</p>
                                {patternSummary.map((item, idx) => (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                            <span className="text-sm font-medium">{item.patternName}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                                            <Badge variant="secondary" className="text-xs">{item.discipline}</Badge>
                                            {item.categories.map((cat, i) => (
                                                <Badge key={`cat-${i}`} variant="outline" className="text-xs">{cat}</Badge>
                                            ))}
                                            {item.divisions.map((div, i) => (
                                                <Badge key={`div-${i}`} variant="outline" className="text-xs">{div}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* What to Include */}
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-foreground">What to include</p>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <button
                                    type="button"
                                    onClick={() => toggleInclude('pattern')}
                                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
                                >
                                    {downloadIncludes.pattern ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                                    Pattern
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleInclude('scoresheet')}
                                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
                                >
                                    {downloadIncludes.scoresheet ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                                    Score Sheet
                                </button>
                            </div>
                        </div>

                        {/* Export Options */}
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-foreground">Export options</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {GENERATE_OPTIONS.map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => onGenerateOption(option.id)}
                                        disabled={isGenerating}
                                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 active:bg-muted/70 transition-colors text-left disabled:opacity-50"
                                    >
                                        <div className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <option.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm">{option.label}</p>
                                            <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </motion.div>
    );
};

export const PatternHub = ({ projectId }) => {
    const { toast } = useToast();
    const {
        currentStep, setCurrentStep,
        formData, setFormData,
        isLoading,
        disciplineLibrary,
        associationsData,
        divisionsData,
        usagePurposes,
        resetDisciplines,
        highestStepReached,
        setHighestStepReached,
    } = usePatternHub(projectId);

    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    const isHorseShow = formData.usageType === 'horse_show';
    const isClinic = formData.usageType === 'clinic';

    // Filter steps based on usage type
    const hubSteps = useMemo(() => {
        return ALL_STEPS
            .filter(s => !s.horseShowOnly || isHorseShow)
            .map((s, i) => ({ ...s, displayNumber: i }));
    }, [isHorseShow]);

    // Map step ID to 1-indexed display number for content titles
    const getDisplayStepNumber = (stepId) => {
        const step = hubSteps.find(s => s.id === stepId);
        return step ? step.displayNumber + 1 : stepId + 1;
    };

    // Find the max step ID in the current flow
    const maxStepId = hubSteps[hubSteps.length - 1]?.id ?? 5;

    const handleNext = () => {
        let nextStep = currentStep + 1;
        // Skip Division & Level step for non-horse-show
        if (nextStep === 3 && !isHorseShow) nextStep = 4;

        // When leaving Division & Level (step 3), carry selected levels into discipline patternGroups
        if (currentStep === 3 && isHorseShow) {
            setFormData(prev => {
                const updatedDisciplines = (prev.disciplines || []).map(discipline => {
                    // Find which associations this discipline belongs to
                    const discAssocIds = Object.keys(discipline.selectedAssociations || {})
                        .filter(id => discipline.selectedAssociations[id]);
                    // Fallback to association_id if selectedAssociations is empty
                    if (discAssocIds.length === 0 && discipline.association_id) {
                        discAssocIds.push(discipline.association_id);
                    }

                    // Collect all selected levels for this discipline's associations
                    const divisionEntries = [];
                    discAssocIds.forEach(assocId => {
                        const assocLevels = prev.selectedLevels?.[assocId] || {};
                        Object.entries(assocLevels).forEach(([groupName, levels]) => {
                            (levels || []).forEach(levelName => {
                                divisionEntries.push({
                                    id: `${assocId}-${groupName}-${levelName}`,
                                    assocId,
                                    division: levelName,
                                    category: groupName,
                                });
                            });
                        });
                    });

                    if (divisionEntries.length === 0) return discipline;

                    // Inject into the first patternGroup's divisions (or create one)
                    const groups = [...(discipline.patternGroups || [])];
                    if (groups.length > 0) {
                        groups[0] = { ...groups[0], divisions: divisionEntries };
                    } else if (discipline.pattern) {
                        groups.push({
                            id: `pattern-group-${Date.now()}-${discipline.id}`,
                            name: 'Group 1',
                            divisions: divisionEntries,
                            rulebookPatternId: '',
                            competitionDate: null,
                        });
                    }

                    return { ...discipline, patternGroups: groups };
                });

                return { ...prev, disciplines: updatedDisciplines };
            });
        }

        if (nextStep <= maxStepId) {
            setCurrentStep(nextStep);
            if (nextStep > highestStepReached) {
                setHighestStepReached(nextStep);
            }
        }
    };

    const handleBack = () => {
        let prevStep = currentStep - 1;
        // Skip Division & Level step for non-horse-show
        if (prevStep === 3 && !isHorseShow) prevStep = 2;
        if (prevStep >= 0) setCurrentStep(prevStep);
    };

    const handleSaveProject = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Authentication Required",
                    description: "Please log in to save your project.",
                    variant: "destructive",
                });
                return;
            }

            // Check if all steps are complete
            const isStep0Complete = !!formData.usageType;
            const isStep1Complete = Object.values(formData.associations || {}).some(val => val);
            const isStep2Complete = formData.disciplines.length > 0;
            const isStep3Complete = !isHorseShow || Object.keys(formData.selectedLevels || {}).some(assocId =>
                Object.values(formData.selectedLevels[assocId] || {}).some(levels => levels.length > 0)
            );
            const isStep4Complete = (() => {
                const patternDisciplines = formData.disciplines.filter(d => d.pattern);
                if (patternDisciplines.length === 0) return true;
                return patternDisciplines.every(pbbDiscipline => {
                    const groups = pbbDiscipline.patternGroups || [];
                    if (groups.length === 0) return true;
                    return groups.some(group =>
                        !!formData.patternSelections?.[pbbDiscipline.id]?.[group.id]?.patternId
                    );
                });
            })();

            const allStepsComplete = isStep0Complete && isStep1Complete && isStep2Complete &&
                                     isStep3Complete && isStep4Complete;

            const status = allStepsComplete ? 'Draft' : 'In progress';

            const { id: formDataId, ...formDataToSave } = formData;

            const projectData = {
                project_name: isClinic
                    ? (formData.showName || 'Untitled Clinic')
                    : (formData.showName || 'Untitled Pattern Hub Project'),
                project_type: 'pattern_hub',
                project_data: {
                    ...formDataToSave,
                    currentStep: currentStep,
                    completedSteps: Array.from(completedSteps),
                },
                user_id: user.id,
                status: status,
            };

            if (projectId && projectId !== 'undefined') {
                projectData.id = projectId;
            } else if (formDataId) {
                projectData.id = formDataId;
            }

            const { error } = await supabase
                .from('projects')
                .upsert(projectData, { onConflict: 'id' })
                .select();

            if (error) throw error;

            toast({
                title: "Project Saved",
                description: `Your project has been saved with status: ${status === 'Draft' ? 'Draft' : 'In Progress'}.`,
            });
        } catch (error) {
            toast({
                title: "Error Saving",
                description: error.message || "Failed to save project. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateOption = async (optionId) => {
        setShowGenerateModal(false);
        setIsGenerating(true);
        try {
            const fileName = (formData.showName || 'Pattern').replace(/ /g, '_');

            if (optionId === 'pdf') {
                toast({ title: 'Generating PDF...', description: 'Your pattern is being created.' });
                const pdfDataUri = await generatePatternBookPdf(formData);
                const link = document.createElement('a');
                link.href = pdfDataUri;
                link.download = `${fileName}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                await handleSaveProject();
                setIsGenerated(true);
                toast({ title: 'Success!', description: 'Your pattern PDF has been downloaded.' });
            } else if (optionId === 'png') {
                toast({ title: 'Generating PNG...', description: 'Converting pattern to image.' });
                const pdfDataUri = await generatePatternBookPdf(formData);
                // Convert PDF to PNG via pdfjs-dist (worker set at module level)
                const pdfDoc = await pdfjsLib.getDocument(pdfDataUri).promise;
                const totalPages = pdfDoc.numPages;

                // Find the first non-blank page (cover page is blank when coverPageOption='none')
                let targetPageNum = 1;
                for (let p = 1; p <= Math.min(totalPages, 3); p++) {
                    const testPage = await pdfDoc.getPage(p);
                    const textContent = await testPage.getTextContent();
                    if (textContent.items.length > 0) {
                        targetPageNum = p;
                        break;
                    }
                }

                const page = await pdfDoc.getPage(targetPageNum);
                const scale = 2;
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
                // Add platform branding watermark
                ctx.save();
                ctx.font = '12px Helvetica, Arial, sans-serif';
                ctx.fillStyle = 'rgba(120, 120, 120, 0.7)';
                ctx.textAlign = 'right';
                ctx.fillText('Generated by EQ Patterns', canvas.width - 20, canvas.height - 14);
                ctx.restore();
                const pngDataUri = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = pngDataUri;
                link.download = `${fileName}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                await handleSaveProject();
                setIsGenerated(true);
                toast({ title: 'Success!', description: 'Your pattern PNG has been downloaded.' });
            } else if (optionId === 'print') {
                toast({ title: 'Preparing to print...', description: 'Opening print dialog.' });
                const pdfDataUri = await generatePatternBookPdf(formData);
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`<html><head><title>Print Pattern</title></head><body style="margin:0"><iframe src="${pdfDataUri}" style="width:100%;height:100%;border:none" onload="setTimeout(()=>{window.print()},500)"></iframe></body></html>`);
                    printWindow.document.close();
                }
                await handleSaveProject();
                setIsGenerated(true);
            } else if (optionId === 'email') {
                toast({ title: 'Preparing email...', description: 'Opening email client.' });
                const subject = encodeURIComponent(`Pattern: ${formData.showName || 'My Pattern'}`);
                const body = encodeURIComponent(`Here is the pattern for ${formData.showName || 'my selection'}.\n\nGenerated from EQ Patterns.`);
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
            } else if (optionId === 'share') {
                const shareUrl = window.location.href;
                await navigator.clipboard.writeText(shareUrl);
                toast({ title: 'Link Copied!', description: 'Shareable link has been copied to your clipboard.' });
            }
        } catch (error) {
            console.error('Failed to generate pattern:', error);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: error.message || 'There was a problem generating your pattern.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const renderStepContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            );
        }

        switch (currentStep) {
            case 0:
                return <UsagePurposeStep setFormData={setFormData} usageType={formData.usageType} usagePurposes={usagePurposes} isLoadingPurposes={isLoading} />;
            case 1:
                return (
                    <Step1_Associations
                      formData={formData}
                      setFormData={setFormData}
                      associationsData={associationsData}
                      onShowTypeChange={resetDisciplines}
                      isHub={true}
                      stepNumber={getDisplayStepNumber(1)}
                      selectedPurposeName={usagePurposes.find(p => p.id === formData.usageType)?.name || 'Pattern'}
                    />
                );
            case 2:
                return (
                    <Step2_ClassesAndDivisions formData={formData} setFormData={setFormData} disciplineLibrary={disciplineLibrary} associationsData={associationsData} stepNumber={getDisplayStepNumber(2)} />
                );
            case 3:
                return (
                    <Step3_DivisionAndLevel
                      formData={formData}
                      setFormData={setFormData}
                      divisionsData={divisionsData}
                      associationsData={associationsData}
                      stepNumber={getDisplayStepNumber(3)}
                    />
                );
            case 4:
                return (
                    <Step6_PatternAndLayout formData={formData} setFormData={setFormData} associationsData={associationsData} stepNumber={getDisplayStepNumber(4)} isClinicMode={formData.usageType === 'clinic'} isHubMode={true} />
                );
            case 5:
                return (
                    <Step4_Uploads formData={formData} setFormData={setFormData} isClinicMode={isClinic} isEducationMode={false} stepNumber={getDisplayStepNumber(5)} purposeName={usagePurposes.find(p => p.id === formData.usageType)?.name || 'Pattern'} />
                );
            case 6:
                return (
                    <Step6_Preview formData={formData} setFormData={setFormData} isEducationMode={false} stepNumber={getDisplayStepNumber(6)} purposeName={isClinic ? 'Clinic Materials' : null} isHubMode={true} />
                );
            case 7:
                return <GenerateStep isGenerated={isGenerated} formData={formData} setFormData={setFormData} onGenerateOption={handleGenerateOption} isGenerating={isGenerating} />;
            default:
                return null;
        }
    };

    // Check if current step requirements are met
    const isCurrentStepComplete = useMemo(() => {
        switch (currentStep) {
            case 0:
                return !!formData.usageType;
            case 1: {
                const hasAssociation = Object.values(formData.associations || {}).some(val => val);
                // Clinic requires Clinic Number (stored in showName)
                if (isClinic) return hasAssociation && !!formData.showName?.trim();
                return hasAssociation;
            }
            case 2:
                return formData.disciplines.length > 0;
            case 3: {
                // Division & Level (horse show only)
                if (!isHorseShow) return true;
                return Object.keys(formData.selectedLevels || {}).some(assocId =>
                    Object.values(formData.selectedLevels[assocId] || {}).some(levels => levels.length > 0)
                );
            }
            case 4: {
                const patternDisciplines = formData.disciplines.filter(d => d.pattern);
                if (patternDisciplines.length === 0) return true;
                return patternDisciplines.every(pbbDiscipline => {
                    const groups = pbbDiscipline.patternGroups || [];
                    if (groups.length === 0) return true;
                    return groups.some(group =>
                        !!formData.patternSelections?.[pbbDiscipline.id]?.[group.id]?.patternId
                    );
                });
            }
            case 5:
                return true; // Uploads optional
            case 6:
                return true; // Preview always completable
            case 7:
                return true; // Generate step
            default:
                return false;
        }
    }, [currentStep, formData, isHorseShow]);

    // Steps are completed only if they've been passed through
    const completedSteps = useMemo(() => {
        const completed = new Set();
        for (let i = 0; i < highestStepReached; i++) {
            // Skip step 3 in completed set for non-horse-show
            if (i === 3 && !isHorseShow) continue;
            completed.add(i);
        }
        return completed;
    }, [highestStepReached, isHorseShow]);

    const getNextStepId = () => {
        for (let i = 0; i < hubSteps.length; i++) {
            if (!completedSteps.has(hubSteps[i].id)) {
                return hubSteps[i].id;
            }
        }
        return hubSteps[hubSteps.length - 1].id;
    };
    const nextStepId = getNextStepId();

    const isFinalStep = currentStep === maxStepId;

    return (
        <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Choose A Pattern</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Your central resource for individual patterns and score sheets. Find exactly what you need.
                    </p>
                </div>
            </motion.div>

            <BuilderSteps
              steps={hubSteps}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              completedSteps={completedSteps}
              nextStepId={nextStepId}
            />

            <Card className="w-full">
              <AnimatePresence mode="wait">
                <CardContent className="p-0 sm:p-6">
                    {renderStepContent()}
                </CardContent>
              </AnimatePresence>
               <div className="p-3 sm:p-6 flex justify-between items-center gap-2 border-t border-border">
                    <Button variant="outline" size="sm" className="sm:size-default" onClick={handleBack} disabled={currentStep === 0}><ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Back</span><span className="sm:hidden">Back</span></Button>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {!isClinic && (
                            <Button variant="secondary" size="sm" className="sm:size-default" onClick={handleSaveProject} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 sm:mr-2 h-4 w-4" />}
                                <span className="hidden sm:inline">Save Project</span><span className="sm:hidden">Save</span>
                            </Button>
                        )}
                        {isFinalStep ? (
                            isGenerating ? (
                                <Button size="sm" className="sm:size-default" disabled>
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> <span className="hidden sm:inline">Generating...</span><span className="sm:hidden">...</span>
                                </Button>
                            ) : isGenerated ? (
                                <Button size="sm" className="sm:size-default" onClick={() => { setIsGenerated(false); setCurrentStep(0); }}>
                                    <ArrowRight className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">New Pattern</span><span className="sm:hidden">New</span>
                                </Button>
                            ) : null
                        ) : (
                            <Button size="sm" className="sm:size-default" onClick={handleNext} disabled={isFinalStep || !isCurrentStepComplete}>
                                Next <ArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
              </div>
            </Card>

            {/* Generate Options Modal */}
            <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Generate Pattern</DialogTitle>
                        <DialogDescription>Choose how you'd like to get your pattern.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 pt-2">
                        {GENERATE_OPTIONS.map(option => (
                            <button
                                key={option.id}
                                onClick={() => handleGenerateOption(option.id)}
                                disabled={isGenerating}
                                className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-3 rounded-lg border hover:bg-muted/50 active:bg-muted/70 transition-colors text-left disabled:opacity-50"
                            >
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <option.icon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{option.label}</p>
                                    <p className="text-xs text-muted-foreground">{option.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
