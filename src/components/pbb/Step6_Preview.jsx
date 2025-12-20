import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, FileText, RotateCcw, Eye, ZoomIn, ZoomOut, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PatternGroupPreview from './PatternGroupPreview';
import ScoresheetGroupPreview from './ScoresheetGroupPreview';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { parseLocalDate } from '@/lib/utils';

// Pattern Badge with Hover Functionality Component
const PatternBadgeWithHover = ({ patternId, displayText, formData }) => {
    const [patternImage, setPatternImage] = useState(null);
    const [patternManeuvers, setPatternManeuvers] = useState([]);
    const [imageZoom, setImageZoom] = useState(1);
    const [loading, setLoading] = useState(false);

    // Fetch pattern details when patternId changes
    useEffect(() => {
        const fetchPatternDetails = async () => {
            if (!patternId) {
                setPatternManeuvers([]);
                setPatternImage(null);
                setImageZoom(1);
                setLoading(false);
                return;
            }
            setLoading(true);
            setImageZoom(1);
            try {
                // Fetch maneuvers
                const { data: maneuversData, error: maneuversError } = await supabase
                    .from('tbl_maneuvers')
                    .select('step_no, instruction')
                    .eq('pattern_id', patternId)
                    .order('step_no');
                
                if (maneuversError) throw maneuversError;
                setPatternManeuvers(maneuversData || []);

                // Fetch image
                const { data: imageData, error: imageError } = await supabase
                    .from('tbl_pattern_media')
                    .select('image_url')
                    .eq('pattern_id', patternId)
                    .maybeSingle();
                
                if (imageError) console.error('Error fetching pattern image:', imageError);
                setPatternImage(imageData?.image_url || null);

            } catch (err) {
                console.error('Error fetching pattern details:', err);
                setPatternManeuvers([]);
                setPatternImage(null);
            } finally {
                setLoading(false);
            }
        };
        fetchPatternDetails();
    }, [patternId]);

    return (
        <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
                <span className="inline-flex items-center cursor-pointer">
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs whitespace-nowrap hover:bg-green-200 hover:text-green-900 transition-colors flex items-center gap-1">
                        {displayText}
                        <Eye className="h-3 w-3" />
                    </Badge>
                </span>
            </HoverCardTrigger>
            <HoverCardContent className="w-96" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="space-y-3">
                    <h4 className="font-medium leading-none border-b pb-2">Pattern Details</h4>
                    <p className="text-xs text-muted-foreground mb-2">{displayText}</p>
                    
                    {loading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading pattern details...</span>
                        </div>
                    ) : !patternId ? (
                        <p className="text-sm text-muted-foreground">Pattern ID not available. Please select a pattern first.</p>
                    ) : (
                        <>
                            {/* Pattern Image with Nested Hover for Larger View */}
                            {patternImage ? (
                                <div className="space-y-2">
                                    <HoverCard openDelay={200} closeDelay={100}>
                                        <HoverCardTrigger asChild>
                                            <div className="rounded-md overflow-hidden border bg-muted/20 cursor-pointer hover:border-primary transition-colors">
                                                <img 
                                                    src={patternImage} 
                                                    alt="Pattern Diagram" 
                                                    className="w-full h-auto object-contain max-h-[300px]"
                                                    loading="lazy"
                                                />
                                            </div>
                                        </HoverCardTrigger>
                                        <HoverCardContent className="w-[700px] max-w-[95vw]" align="start" side="right" sideOffset={10}>
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-sm mb-2">Pattern Image</h4>
                                                <div className="rounded-md border bg-muted/20 relative">
                                                    <div className="overflow-auto max-h-[600px] min-h-[400px]">
                                                        <div 
                                                            className="flex items-center justify-center p-4"
                                                            style={{ 
                                                                minHeight: '400px'
                                                            }}
                                                        >
                                                            <img 
                                                                src={patternImage} 
                                                                alt="Pattern Diagram - Zoomed" 
                                                                className="object-contain transition-transform duration-200"
                                                                loading="lazy"
                                                                style={{ 
                                                                    transform: `scale(${imageZoom})`,
                                                                    transformOrigin: 'center',
                                                                    maxWidth: '100%',
                                                                    height: 'auto'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    {/* Zoom Controls */}
                                                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/95 backdrop-blur-sm rounded-md p-1 border shadow-lg z-10">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setImageZoom(prev => Math.min(prev + 0.25, 3));
                                                            }}
                                                            title="Zoom In"
                                                        >
                                                            <ZoomIn className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setImageZoom(prev => Math.max(prev - 0.25, 0.5));
                                                            }}
                                                            title="Zoom Out"
                                                        >
                                                            <ZoomOut className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setImageZoom(1);
                                                            }}
                                                            title="Reset Zoom"
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    {/* Zoom Level Indicator */}
                                                    {imageZoom !== 1 && (
                                                        <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium border shadow-lg z-10">
                                                            {Math.round(imageZoom * 100)}%
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </HoverCardContent>
                                    </HoverCard>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No image available for this pattern.</p>
                            )}

                            {/* Maneuvers List */}
                            <div className="text-sm text-muted-foreground max-h-[200px] overflow-y-auto">
                                {patternManeuvers.length > 0 ? (
                                    <div className="space-y-1 pl-1">
                                        {patternManeuvers.map((m) => (
                                            <div key={m.step_no} className="flex gap-2">
                                                <span className="font-semibold min-w-[20px] text-right">{m.step_no}.</span>
                                                <span>{m.instruction}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    !patternImage && <p className="text-sm text-muted-foreground">No maneuvers available for this pattern.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
};

export const Step6_Preview = ({ formData, setFormData, isEducationMode, stepNumber = 7, onGoToStep }) => {
  const [availablePatterns, setAvailablePatterns] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [selectedScoresheetDetails, setSelectedScoresheetDetails] = useState({});
  const [expandedDisciplines, setExpandedDisciplines] = useState(new Set());
  
  const patternDisciplines = useMemo(() => {
    return (formData.disciplines || [])
      .filter(d => d.pattern)
      .filter(d => {
        // Only show disciplines that have at least one pattern group
        const groups = d.patternGroups || [];
        return groups.length > 0;
      });
  }, [formData.disciplines]);
  const scoresheetDisciplines = useMemo(() => {
    return (formData.disciplines || [])
      .filter(d => d.scoresheet)
      .filter(d => {
        // Only show disciplines that have at least one pattern group
        const groups = d.patternGroups || [];
        return groups.length > 0;
      });
  }, [formData.disciplines]);

  const dateRange = formData.startDate && formData.endDate
    ? `${format(parseLocalDate(formData.startDate), 'MMM d')} - ${format(parseLocalDate(formData.endDate), 'MMM d, yyyy')}`
    : 'Dates not set';

  useEffect(() => {
    const fetchPatterns = async () => {
        setIsLoading(true);
        const allGroupKeys = patternDisciplines.flatMap((discipline, discIndex) =>
            (discipline.patternGroups || []).map((group, groupIndex) => ({
                key: `${discIndex}-${groupIndex}`,
                disciplineName: discipline.name,
                selectedAssociations: discipline.selectedAssociations
            }))
        );

        if (allGroupKeys.length === 0) {
            setIsLoading(false);
            return;
        }

        try {
            const patternPromises = allGroupKeys.map(async groupInfo => {
                const assocKeys = Object.keys(groupInfo.selectedAssociations);
                
                let query = supabase
                    .from('patterns')
                    .select('id, name, difficulty:pattern_set_name, url:preview_image_url, pattern_associations!inner(association_id)')
                    .eq('review_status', 'approved')
                    .or(`class_name.eq.${groupInfo.disciplineName},class_name.eq.All`)
                    .in('pattern_associations.association_id', assocKeys);
                
                const { data, error } = await query;
                
                if (error) {
                    console.error('Error fetching patterns for', groupInfo.key, error);
                    return { key: groupInfo.key, patterns: [] };
                }

                return { key: groupInfo.key, patterns: data || [] };
            });

            const results = await Promise.all(patternPromises);
            const newAvailablePatterns = results.reduce((acc, result) => {
                acc[result.key] = result.patterns;
                return acc;
            }, {});

            setAvailablePatterns(newAvailablePatterns);
        } catch (error) {
            toast({
                title: 'Error Fetching Patterns',
                description: 'Could not load available patterns. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (patternDisciplines.length > 0) {
      fetchPatterns();
    } else {
      setIsLoading(false);
    }
  }, [JSON.stringify(patternDisciplines), toast]);
  
  // Fetch details for selected patterns from tbl_patterns (to get correct names/versions for badges)
  const [selectedPatternDetails, setSelectedPatternDetails] = useState({});

  useEffect(() => {
    const fetchSelectedPatternDetails = async () => {
        const selectedIds = [];
        if (formData.patternSelections) {
            Object.values(formData.patternSelections).forEach(disciplineSels => {
                if (disciplineSels) {
                    Object.values(disciplineSels).forEach(val => {
                        // Handle both simple ID and object format
                        const id = typeof val === 'object' ? val?.patternId : val;
                        if (id) selectedIds.push(id);
                    });
                }
            });
        }

        // De-duplicate IDs and filter for valid numeric IDs
        const uniqueIds = [...new Set(selectedIds)].filter(id => !isNaN(parseInt(id)) && isFinite(id));

        if (uniqueIds.length === 0) return;

        try {
            const { data, error } = await supabase
                .from('tbl_patterns')
                .select('id, pdf_file_name, pattern_version')
                .in('id', uniqueIds);

            if (data) {
                const detailsMap = {};
                const patterns = data;
                
                // Fetch maneuvers and media for these patterns
                const [maneuversResult, mediaResult] = await Promise.all([
                    supabase.from('tbl_maneuvers').select('*').in('pattern_id', uniqueIds).order('step_no'),
                    supabase.from('tbl_pattern_media').select('*').in('pattern_id', uniqueIds)
                ]);

                const maneuvers = maneuversResult.data || [];
                const media = mediaResult.data || [];

                patterns.forEach(p => {
                    detailsMap[p.id] = {
                        ...p,
                        maneuvers: maneuvers.filter(m => m.pattern_id === p.id),
                        media: media.filter(m => m.pattern_id === p.id)
                    };
                });
                setSelectedPatternDetails(detailsMap);
            }
        } catch (err) {
            console.error("Error fetching selected pattern details:", err);
        }
    };
    
    fetchSelectedPatternDetails();
  }, [JSON.stringify(formData.patternSelections)]);

  // Fetch scoresheet images based on selected patterns
  useEffect(() => {
    const fetchScoresheetDetails = async () => {
      const selectedIds = [];
      if (formData.patternSelections) {
        Object.values(formData.patternSelections).forEach(disciplineSels => {
          if (disciplineSels) {
            Object.values(disciplineSels).forEach(val => {
              const id = typeof val === 'object' ? val?.patternId : val;
              if (id) selectedIds.push(id);
            });
          }
        });
      }

      const uniqueIds = [...new Set(selectedIds)].filter(id => !isNaN(parseInt(id)) && isFinite(id));

      if (uniqueIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('tbl_scoresheet')
          .select('id, pattern_id, image_url, storage_path')
          .in('pattern_id', uniqueIds);

        if (data) {
          const scoresheetMap = {};
          data.forEach(s => {
            scoresheetMap[s.pattern_id] = s;
          });
          setSelectedScoresheetDetails(scoresheetMap);
        }
      } catch (err) {
        console.error("Error fetching scoresheet details:", err);
      }
    };

    fetchScoresheetDetails();
  }, [JSON.stringify(formData.patternSelections)]);
  
  const handlePatternSelectionChange = (disciplineId, groupId, newPatternId) => {
    setFormData(prev => {
      const newFormData = { ...prev };
      if (!newFormData.patternSelections) {
          newFormData.patternSelections = {};
      }
      if (!newFormData.patternSelections[disciplineId]) {
        newFormData.patternSelections[disciplineId] = {};
      }
      newFormData.patternSelections[disciplineId][groupId] = newPatternId;
      return newFormData;
    });
  };

  const handleLayoutSelection = (layoutId) => {
    setFormData(prev => ({ ...prev, layoutSelection: layoutId }));
  };
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Fetching available patterns...</p>
        </div>
    );
  }

  return (
    <motion.div key="step6-preview" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <CardHeader>
        <CardTitle>Step {stepNumber}: Preview</CardTitle>
        <CardDescription>Review your selected patterns and scoresheets. Use the carousel to see alternatives for each group.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Layout & Design Section */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Layout & Design</h3>
          <RadioGroup
            value={formData.layoutSelection || 'layout-a'}
            onValueChange={handleLayoutSelection}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="layout-a" id="layout-a" className="peer sr-only" />
              <Label
                htmlFor="layout-a"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <div className="w-full space-y-2">
                  <p className="font-semibold text-center mb-2">Layout A: Modern</p>
                  <div className="w-full min-h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-md flex flex-col items-center justify-center text-xs p-6 border border-border space-y-4">
                    <div className="text-center space-y-2 border-b pb-4 w-full">
                      <p className="font-bold text-2xl">{formData.showName || 'Show Name'}</p>
                      <p className="text-muted-foreground font-semibold">Pattern Book</p>
                      <p className="text-xs text-muted-foreground">{dateRange}</p>
                      {formData.coverPageFile && (
                        <Badge variant="outline" className="text-xs mt-2">
                          Custom Cover Uploaded
                        </Badge>
                      )}
                    </div>
                    <div className="w-full space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Patterns:</p>
                      {patternDisciplines.slice(0, 3).map((disc, idx) => {
                        let cumulativePage = 2;
                        for (let i = 0; i < idx; i++) {
                          const prevDisc = patternDisciplines[i];
                          const prevGroupCount = (prevDisc.patternGroups || []).length;
                          cumulativePage += prevGroupCount;
                        }
                        return (
                          <div key={disc.id} className="text-xs flex justify-between">
                            <span>{disc.name}</span>
                            <span className="text-muted-foreground">Page {cumulativePage}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Includes cover page with show details
                  </p>
                </div>
              </Label>
            </div>

            <div>
              <RadioGroupItem value="layout-b" id="layout-b" className="peer sr-only" />
              <Label
                htmlFor="layout-b"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <div className="w-full space-y-2">
                  <p className="font-semibold text-center mb-2">Layout B: Classic</p>
                  <div className="w-full min-h-48 border-4 border-double border-border rounded-md flex flex-col p-6 bg-background space-y-4">
                    <div className="text-center border-b-2 border-double pb-3">
                      <p className="font-bold text-xl font-serif tracking-wide">
                        {formData.showName || 'Show Name'}
                      </p>
                      <p className="text-muted-foreground italic text-sm mt-1">Pattern Book</p>
                      <p className="text-xs text-muted-foreground mt-1">{dateRange}</p>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <p className="font-bold text-sm font-serif text-center mb-2 border-b pb-1">
                        Table of Contents
                      </p>
                      <div className="flex justify-between px-2">
                        <span className="font-semibold">Show Information</span>
                        <span>1</span>
                      </div>
                      {patternDisciplines.slice(0, 4).map((disc, idx) => {
                        let cumulativePage = 2;
                        for (let i = 0; i < idx; i++) {
                          const prevDisc = patternDisciplines[i];
                          const prevGroupCount = (prevDisc.patternGroups || []).length;
                          cumulativePage += prevGroupCount;
                        }
                        return (
                          <div
                            key={disc.id}
                            className="flex justify-between px-2 border-b border-dotted"
                          >
                            <span>{disc.name}</span>
                            <span>{cumulativePage}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Includes table of contents
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </section>

        {/* Preview Accordion */}
        <Accordion type="multiple" defaultValue={['pattern-preview']} className="w-full">
          {/* Pattern Preview */}
          <AccordionItem value="pattern-preview">
            <AccordionTrigger className="text-base font-semibold">
              <div className="flex items-center gap-2">
                Pattern Preview
                <Badge variant="secondary" className="ml-2">{patternDisciplines.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              {patternDisciplines.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    {onGoToStep && (
                      <Button variant="outline" size="sm" onClick={() => onGoToStep(5)}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Re-assign
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {patternDisciplines.map((pbbDiscipline) => {
                      const originalDisciplineIndex = formData.disciplines.findIndex(d => d.id === pbbDiscipline.id);
                      const groups = pbbDiscipline.patternGroups || [];
                      const groupCount = groups.length;
                      const isExpanded = expandedDisciplines.has(pbbDiscipline.id);
                      
                      // Get all pattern selections for this discipline to show as badges
                      const disciplinePatternSelections = [];
                      groups.forEach((group) => {
                        const rawSelection = formData.patternSelections?.[pbbDiscipline.id]?.[group.id];
                        const selectedId = typeof rawSelection === 'object' ? rawSelection?.patternId : rawSelection;
                        if (selectedId && selectedPatternDetails[selectedId]) {
                          const patternDetail = selectedPatternDetails[selectedId];
                          const patternName = patternDetail.pdf_file_name || '';
                          const cleanPatternName = patternName.replace(/\.(pdf|PDF)$/, '');
                          const version = patternDetail.pattern_version || '';
                          const displayText = version && version !== 'ALL' ? `${cleanPatternName} (${version})` : cleanPatternName;
                          disciplinePatternSelections.push({
                            patternId: selectedId,
                            displayText
                          });
                        }
                      });
                      
                      return (
                        <div key={originalDisciplineIndex} className="border rounded-lg bg-muted/30 overflow-hidden">
                          {/* Collapsible Discipline Header */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedDisciplines(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(pbbDiscipline.id)) {
                                  newSet.delete(pbbDiscipline.id);
                                } else {
                                  newSet.add(pbbDiscipline.id);
                                }
                                return newSet;
                              });
                            }}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="font-semibold text-base text-primary">{pbbDiscipline.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {groupCount} {groupCount === 1 ? 'Group' : 'Groups'}
                              </Badge>
                              <div className="flex items-center gap-1 flex-wrap flex-1">
                                {disciplinePatternSelections.map((sel, idx) => (
                                  <PatternBadgeWithHover 
                                    key={idx} 
                                    patternId={sel.patternId} 
                                    displayText={sel.displayText}
                                    formData={formData}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>
                          
                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="px-4 py-4 border-t bg-background/50">
                              <div className="space-y-6">
                                {groups.map((group, groupIndex) => {
                                  const groupKey = `${originalDisciplineIndex}-${groupIndex}`;
                                  const groupPatterns = availablePatterns[groupKey] || [];
                                  const rawSelection = formData.patternSelections?.[pbbDiscipline.id]?.[group.id];
                                  const selectedId = typeof rawSelection === 'object' ? rawSelection?.patternId : rawSelection;
                                  return(
                                    <div key={group.id}>
                                      <PatternGroupPreview
                                        group={group}
                                        patterns={groupPatterns}
                                        selectedPatternId={selectedId}
                                        selectedPatternDetail={selectedPatternDetails[selectedId]}
                                        onPatternSelect={(newPatternId) => handlePatternSelectionChange(pbbDiscipline.id, group.id, newPatternId)}
                                        primaryAffiliates={new Set(formData.primaryAffiliates || [])}
                                      />
                                      {isEducationMode && formData.lessonPlans && formData.lessonPlans.length > 0 && (
                                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                            <h5 className="font-semibold text-sm mb-2 text-blue-800 dark:text-blue-300">Associated Lesson Plans</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {(formData.lessonPlans || []).map((plan, index) => (
                                                    <Badge key={index} variant="outline" className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-600">
                                                        <FileText className="h-3 w-3" />
                                                        {plan.customName || plan.fileName}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">No disciplines require pattern selections.</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Scoresheet Preview */}
          <AccordionItem value="scoresheet-preview">
            <AccordionTrigger className="text-base font-semibold">
              <div className="flex items-center gap-2">
                Scoresheet Preview
                <Badge variant="secondary" className="ml-2">{scoresheetDisciplines.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              {scoresheetDisciplines.length > 0 ? (
                <div className="space-y-2">
                  {scoresheetDisciplines.map((pbbDiscipline) => {
                    const originalDisciplineIndex = formData.disciplines.findIndex(d => d.id === pbbDiscipline.id);
                    const groups = pbbDiscipline.patternGroups || [];
                    const groupCount = groups.length;
                    const isExpanded = expandedDisciplines.has(pbbDiscipline.id);
                    
                    // Get all pattern selections for this discipline to show as badges
                    const disciplinePatternSelections = [];
                    groups.forEach((group) => {
                      const rawSelection = formData.patternSelections?.[pbbDiscipline.id]?.[group.id];
                      const selectedId = typeof rawSelection === 'object' ? rawSelection?.patternId : rawSelection;
                      if (selectedId && selectedPatternDetails[selectedId]) {
                        const patternDetail = selectedPatternDetails[selectedId];
                        const patternName = patternDetail.pdf_file_name || '';
                        const cleanPatternName = patternName.replace(/\.(pdf|PDF)$/, '');
                        const version = patternDetail.pattern_version || '';
                        const displayText = version && version !== 'ALL' ? `${cleanPatternName} (${version})` : cleanPatternName;
                        disciplinePatternSelections.push({
                          patternId: selectedId,
                          displayText
                        });
                      }
                    });
                    
                    return (
                      <div key={originalDisciplineIndex} className="border rounded-lg bg-muted/30 overflow-hidden">
                        {/* Collapsible Discipline Header */}
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedDisciplines(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(pbbDiscipline.id)) {
                                newSet.delete(pbbDiscipline.id);
                              } else {
                                newSet.add(pbbDiscipline.id);
                              }
                              return newSet;
                            });
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="font-semibold text-base text-primary">{pbbDiscipline.name}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-4 py-4 border-t bg-background/50">
                            <div className="space-y-6">
                              {groups.map((group, groupIndex) => {
                                const rawSelection = formData.patternSelections?.[pbbDiscipline.id]?.[group.id];
                                const selectedPatternId = typeof rawSelection === 'object' ? rawSelection?.patternId : rawSelection;
                                const scoresheetData = selectedPatternId ? selectedScoresheetDetails[selectedPatternId] : null;
                                
                                return (
                                  <ScoresheetGroupPreview
                                    key={group.id}
                                    group={group}
                                    scoresheets={group.scoresheets || []}
                                    discipline={pbbDiscipline}
                                    formData={formData}
                                    scoresheetImage={scoresheetData}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">No disciplines require scoresheet selections.</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      </CardContent>
    </motion.div>
  );
};