import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Users, UserCheck, ChevronDown, MapPin, Building, CheckCircle2, AlertCircle, Trophy, Eye, Check, ChevronsUpDown, X, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { cn, parseLocalDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import PatternPagePreview from './PatternPagePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

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
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs hover:bg-green-200 hover:text-green-900 transition-colors flex items-center gap-1">
                        <span className="whitespace-normal break-words">{displayText}</span>
                        <Eye className="h-3 w-3 flex-shrink-0" />
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

// Level category badge colors (kept for reference)
// Pattern version categories (Standardized)
const PATTERN_VERSIONS = [
  { id: 'ALL', label: 'All', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-500' },
  { id: 'L1', label: 'L1', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-500' },
  { id: 'GR/NOV', label: 'Green / Novice', color: 'bg-teal-100 text-teal-800', dotColor: 'bg-teal-500' },
  { id: 'Championship', label: 'Championship', color: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-500' },
  { id: 'Skilled', label: 'Skilled', color: 'bg-indigo-100 text-indigo-800', dotColor: 'bg-indigo-500' },
  { id: 'Intermediate', label: 'Intermediate', color: 'bg-orange-100 text-orange-800', dotColor: 'bg-orange-500' },
  { id: 'Beginner', label: 'Beginner', color: 'bg-purple-100 text-purple-800', dotColor: 'bg-purple-500' },
  { id: 'Walk-Trot', label: 'Walk-Trot', color: 'bg-pink-100 text-pink-800', dotColor: 'bg-pink-500' },
];

export const Step6_PatternAndLayout = ({ formData, setFormData, associationsData = [], stepNumber = 5 }) => {
  const { toast } = useToast();
  const [openDisciplineId, setOpenDisciplineId] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [currentDiscipline, setCurrentDiscipline] = useState(null);
  const [dialogDueDate, setDialogDueDate] = useState('');
  const [dialogJudge, setDialogJudge] = useState('');
  const [dialogStaff, setDialogStaff] = useState('');
  const disciplineRefs = useRef({});
  const [previewDiscipline, setPreviewDiscipline] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Database-driven pattern state
  const [dbPatterns, setDbPatterns] = useState({});
  const [loadingPatterns, setLoadingPatterns] = useState({});
  const [maneuversRangeMap, setManeuversRangeMap] = useState({});
  // New state for "Reference" style selection
  const [disciplineSelections, setDisciplineSelections] = useState({}); // { [disciplineId]: { difficulty: ['ALL'] } }
  
  // State for hover functionality
  const [hoveredPatternId, setHoveredPatternId] = useState(null);
  const [hoveredPatternImage, setHoveredPatternImage] = useState(null);
  const [loadingHoveredImage, setLoadingHoveredImage] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Sync maneuversRangeMap from formData.patternSelections on mount
  useEffect(() => {
    if (formData.patternSelections) {
      const newMap = {};
      Object.keys(formData.patternSelections).forEach(disciplineId => {
        const disciplineSelections = formData.patternSelections[disciplineId];
        if (disciplineSelections && typeof disciplineSelections === 'object') {
          // Collect unique maneuversRange from ALL groups to ensure we don't miss any if they differ
          const allRanges = new Set();
          Object.values(disciplineSelections).forEach(selection => {
            const val = selection?.maneuversRange;
            if (Array.isArray(val)) {
              val.forEach(v => allRanges.add(v));
            } else if (val && typeof val === 'string') {
              allRanges.add(val);
            }
          });
          
          if (allRanges.size > 0) {
            newMap[disciplineId] = Array.from(allRanges);
          }
        }
      });
      setManeuversRangeMap(prev => ({ ...prev, ...newMap }));
    }
  }, [formData.patternSelections]);

  // Get disciplines with patterns OR scoresheet-only and merge duplicates by name
  const rawPatternDisciplines = (formData.disciplines || []).filter(d => {
    // Include disciplines with patterns
    if (d.pattern) return true;
    // Include scoresheet-only disciplines
    if (d.pattern_type === 'scoresheet_only' || (!d.pattern && d.scoresheet)) return true;
    return false;
  });
  
  // Merge disciplines with the same name and filter out empty groups
  const patternDisciplines = rawPatternDisciplines.reduce((acc, discipline) => {
    const existingIndex = acc.findIndex(d => d.name === discipline.name);
    
    // Check if this is a scoresheet-only discipline
    const isScoresheetOnly = discipline.pattern_type === 'scoresheet_only' || (!discipline.pattern && discipline.scoresheet);
    
    // Filter out groups that don't have actual divisions/content
    let validGroups = (discipline.patternGroups || []).filter(group => 
      group.divisions && group.divisions.length > 0
    );
    
    // For scoresheet-only disciplines: if no groups exist but divisions are selected, create a default group
    if (isScoresheetOnly && validGroups.length === 0 && discipline.divisionOrder && discipline.divisionOrder.length > 0) {
      // Create a default group from selected divisions
      const divisionsFromOrder = discipline.divisionOrder.map(divId => {
        // Parse division ID format: "assocId-divisionName"
        const [assocId, ...divisionParts] = divId.split('-');
        const divisionName = divisionParts.join('-');
        return {
          id: divId,
          assocId: assocId,
          division: divisionName
        };
      });
      
      if (divisionsFromOrder.length > 0) {
        validGroups = [{
          id: `group-${discipline.id}-default`,
          name: 'Group 1',
          divisions: divisionsFromOrder
        }];
      }
    }
    
    if (existingIndex === -1) {
      // First occurrence - add to array with filtered groups
      acc.push({ ...discipline, patternGroups: validGroups });
    } else {
      // Merge patternGroups from duplicate into existing
      const existing = acc[existingIndex];
      const existingGroups = existing.patternGroups || [];
      existing.patternGroups = [...existingGroups, ...validGroups];
      // Also merge association IDs if needed
      if (!existing.mergedAssociations) {
        existing.mergedAssociations = [existing.association_id];
      }
      existing.mergedAssociations.push(discipline.association_id);
      
    }
    return acc;
  }, []);
  
  // Get selected associations from formData
  const selectedAssociations = associationsData.filter(
    assoc => formData.associations?.[assoc.id]
  );

  // Fetch patterns from database for a discipline (fetch ALL patterns, filter by group associations later)
  const fetchPatternsForDiscipline = async (discipline) => {
    if (!discipline?.name) return;
    const disciplineId = discipline.id;
    
    if (loadingPatterns[disciplineId] || dbPatterns[disciplineId]) return;
    
    setLoadingPatterns(prev => ({ ...prev, [disciplineId]: true }));
    
    try {
      // Check if this is an open-show discipline
      const isOpenShowDiscipline = discipline?.selectedAssociations?.['open-show'] || 
                                   discipline?.association_id === 'open-show';
      
      let query = supabase
        .from('tbl_patterns')
        .select('id, pdf_file_name, maneuvers_range, pattern_version, discipline, association_name');
      
      // For open-show disciplines, fetch ALL patterns (no discipline filter)
      // For other disciplines, filter by discipline name
      if (!isOpenShowDiscipline) {
        // Use exact match (case-insensitive) to avoid matching substrings
        // For example, "Reining" should not match "Ranch Reining"
        query = query.ilike('discipline', discipline.name);
      }
      // For open-show, fetch all patterns without discipline filter
      
      const { data, error } = await query;
      if (error) throw error;
      
      setDbPatterns(prev => ({ ...prev, [disciplineId]: data || [] }));
    } catch (err) {
      console.error('Error fetching patterns:', err);
      setDbPatterns(prev => ({ ...prev, [disciplineId]: [] }));
    } finally {
      setLoadingPatterns(prev => ({ ...prev, [disciplineId]: false }));
    }
  };

  // Fetch patterns for all disciplines on mount
  useEffect(() => {
    patternDisciplines.forEach(discipline => {
      fetchPatternsForDiscipline(discipline);
    });
  }, [patternDisciplines.length]);

  // Fetch pattern image when hovering over a pattern in dropdown
  useEffect(() => {
    const fetchHoveredPatternImage = async () => {
      if (!hoveredPatternId) {
        setHoveredPatternImage(null);
        return;
      }
      setLoadingHoveredImage(true);
      try {
        const { data: imageData, error: imageError } = await supabase
          .from('tbl_pattern_media')
          .select('image_url')
          .eq('pattern_id', hoveredPatternId)
          .maybeSingle();
        
        if (imageError) console.error('Error fetching hovered pattern image:', imageError);
        setHoveredPatternImage(imageData?.image_url || null);
      } catch (err) {
        console.error('Error fetching hovered pattern image:', err);
        setHoveredPatternImage(null);
      } finally {
        setLoadingHoveredImage(false);
      }
    };
    fetchHoveredPatternImage();
  }, [hoveredPatternId]);

  const handlePatternSelection = (disciplineIndex, groupIndex, patternId) => {
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      newSelections[disciplineIndex][groupIndex] = patternId;
      return { ...prev, patternSelections: newSelections };
    });
  };

  // Handle maneuvers range change at discipline level (Multi-select)
  const handleManeuversRangeChange = (disciplineId, rangeValue) => {
    setManeuversRangeMap(prev => {
      const currentRanges = prev[disciplineId] || [];
      let newRanges;
      if (currentRanges.includes(rangeValue)) {
        newRanges = currentRanges.filter(r => r !== rangeValue);
      } else {
        newRanges = [...currentRanges, rangeValue];
      }
      
      // Update all groups with this new array of ranges
      if (setFormData) {
        setFormData(prevFormData => {
            const newSelections = { ...(prevFormData.patternSelections || {}) };
            if (!newSelections[disciplineId]) newSelections[disciplineId] = {};
            
            // Find the discipline to get groups
            const discipline = patternDisciplines.find(d => d.id === disciplineId);
            const groups = discipline?.patternGroups || [];
            
            groups.forEach(group => {
            newSelections[disciplineId][group.id] = {
                ...(newSelections[disciplineId]?.[group.id] || {}),
                maneuversRange: newRanges, // Store array
                patternId: null, // Reset pattern selection when range changes? Maybe keep if valid? simpler to reset for now or keep if still valid.
                patternName: null
            };
            });
            return { ...prevFormData, patternSelections: newSelections };
        });
      }

      return { ...prev, [disciplineId]: newRanges };
    });
  };

  // Handle pattern selection for a specific group
  const handleGroupPatternSelect = (disciplineId, groupId, patternId, maneuversRangeValue) => {
    const patterns = dbPatterns[disciplineId] || [];
    const selectedPattern = patterns.find(p => p.id.toString() === patternId);
    // Use provided maneuversRangeValue (string) or get from selected pattern's maneuvers_range
    const maneuversRange = maneuversRangeValue || selectedPattern?.maneuvers_range || '';
    
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineId]) newSelections[disciplineId] = {};
      newSelections[disciplineId][groupId] = {
        maneuversRange, // Store as string to match Step 3 format
        patternId: parseInt(patternId),
        patternName: selectedPattern?.pdf_file_name?.trim() || `Pattern ${patternId}`,
        version: selectedPattern?.pattern_version || 'ALL'
      };
      return { ...prev, patternSelections: newSelections };
    });
  };

  // Get available maneuvers ranges for a discipline
  const getManeuversRanges = (disciplineId) => {
    const patterns = dbPatterns[disciplineId] || [];
    return [...new Set(patterns.filter(p => p.maneuvers_range).map(p => p.maneuvers_range))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  // Get filtered patterns for a discipline based on selected maneuvers range
  // Get filtered patterns for a discipline (Difficulty filter applied in render)
  const getFilteredPatterns = (disciplineId) => {
    return dbPatterns[disciplineId] || [];
  };

  // Get association name(s) and abbreviation(s) for a group based on Primary logic (similar to DropZoneGroup)
  const getGroupAssociationNames = (group) => {
    if (!group?.divisions || group.divisions.length === 0) {
      return { names: [], abbreviations: [], ids: [] };
    }

    // Get all unique associations from divisions in this group
    const uniqueAssocIds = [...new Set(group.divisions.map(div => div.assocId).filter(Boolean))];
    
    // If only one association, use it
    if (uniqueAssocIds.length === 1) {
      const assocId = uniqueAssocIds[0];
      const assoc = associationsData?.find(a => a.id === assocId);
      if (assoc) {
        return {
          names: assoc.name ? [assoc.name] : [],
          abbreviations: assoc.abbreviation ? [assoc.abbreviation] : [],
          ids: [assocId] // Include ID as fallback for matching
        };
      }
      // Fallback: if association not found in associationsData, use the ID itself
      return { names: [], abbreviations: [], ids: [assocId] };
    }

    // If multiple associations, check which are Primary
    if (uniqueAssocIds.length > 1 && formData?.primaryAffiliates) {
      const primaryAssocIds = uniqueAssocIds.filter(assocId => 
        formData.primaryAffiliates.includes(assocId)
      );
      
      // If we have Primary associations, use them
      if (primaryAssocIds.length > 0) {
        const names = [];
        const abbreviations = [];
        primaryAssocIds.forEach(assocId => {
          const assoc = associationsData?.find(a => a.id === assocId);
          if (assoc) {
            if (assoc.name) names.push(assoc.name);
            if (assoc.abbreviation) abbreviations.push(assoc.abbreviation);
          }
        });
        return { names, abbreviations, ids: primaryAssocIds };
      }
    }

    // Fallback: use first association if no Primary found
    if (uniqueAssocIds.length > 0) {
      const assocId = uniqueAssocIds[0];
      const assoc = associationsData?.find(a => a.id === assocId);
      if (assoc) {
        return {
          names: assoc.name ? [assoc.name] : [],
          abbreviations: assoc.abbreviation ? [assoc.abbreviation] : [],
          ids: [assocId]
        };
      }
      // Fallback: if association not found in associationsData, use the ID itself
      return { names: [], abbreviations: [], ids: [assocId] };
    }

    return { names: [], abbreviations: [], ids: [] };
  };

  // Get pattern selection from formData
  const getPatternSelection = (disciplineId, groupId) => {
    return formData.patternSelections?.[disciplineId]?.[groupId];
  };

  // Extract pattern number from filename (e.g., "WesternRiding0001" -> "1", "WesternRiding0001.L1" -> "1")
  const extractPatternNumber = (fileName) => {
    if (!fileName) return null;
    // Remove extension if present
    const nameWithoutExt = fileName.replace(/\.(pdf|PDF)$/, '');
    // Extract trailing digits before any dot (e.g., "WesternRiding0001.L1" -> "0001")
    const match = nameWithoutExt.match(/(\d+)(?:\.|$)/);
    if (match) {
      // Convert to number to remove leading zeros (e.g., "0001" -> 1)
      const num = parseInt(match[1], 10);
      return isNaN(num) ? null : num;
    }
    // Fallback: try to find any sequence of digits at the end
    const fallbackMatch = nameWithoutExt.match(/(\d+)$/);
    if (fallbackMatch) {
      const num = parseInt(fallbackMatch[1], 10);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  // Check if discipline is complete
  const isDisciplineComplete = (discipline) => {
    const groups = discipline.patternGroups || [];
    if (groups.length === 0) return false;
    
    // Check if this is a scoresheet-only discipline
    const isScoresheetOnly = discipline.pattern_type === 'scoresheet_only' || (!discipline.pattern && discipline.scoresheet);
    
    // For scoresheet-only disciplines: complete if they have groups with divisions (no pattern selection needed)
    if (isScoresheetOnly) {
      return groups.every(group => group.divisions && group.divisions.length > 0);
    }
    
    // For pattern disciplines: all groups must have pattern selections
    return groups.every(group => {
      const selection = getPatternSelection(discipline.id, group.id);
      return selection?.patternId;
    });
  };

  const handleOpenAssignDialog = (discipline, disciplineIndex) => {
    // Get all judges from all associations
    const associationJudges = [];
    if (formData.associationJudges) {
      Object.values(formData.associationJudges).forEach(assocData => {
        const judges = assocData?.judges || [];
        judges.forEach(judge => {
          if (judge.name && !associationJudges.find(j => j.name === judge.name)) {
            associationJudges.push(judge);
          }
        });
      });
    }
    
    setCurrentDiscipline({ ...discipline, disciplineIndex, associationJudges });

    // Prefill from any existing discipline-level selections first
    // Convert judge ID to name if needed
    let existingJudge = formData.judgeSelections?.[disciplineIndex] || '';
    
    // If not found in judgeSelections, check groupJudges (from Step 5 or Step 6)
    // Check all groups to find any assigned judge
    if (!existingJudge && formData.groupJudges?.[disciplineIndex]) {
      // Get the first non-empty judge value from any group
      const groupJudges = formData.groupJudges[disciplineIndex];
      const judgeValues = Object.values(groupJudges).filter(Boolean);
      if (judgeValues.length > 0) {
        // Use the first judge found (they should all be the same if assigned via dialog)
        existingJudge = judgeValues[0];
      }
    }
    
    // If existingJudge is an ID (like "judge-0" or "judge-1"), convert it to judge name
    if (existingJudge && (existingJudge.startsWith('judge-') || /^judge-\d+$/.test(existingJudge))) {
      // Try to find judge by matching ID pattern in all association judges
      const allJudges = [];
      if (formData.associationJudges) {
        Object.values(formData.associationJudges).forEach(assocData => {
          const judges = assocData?.judges || [];
          judges.forEach((judge, idx) => {
            if (judge.name) {
              // Check if this judge matches the ID pattern
              const judgeId = judge.id || `judge-${idx}`;
              if (judgeId === existingJudge || `judge-${idx}` === existingJudge) {
                allJudges.push({ ...judge, matchedId: judgeId, matchedIdx: idx });
              }
            }
          });
        });
      }
      
      // Also check in associationJudges passed to dialog
      if (allJudges.length === 0 && associationJudges.length > 0) {
        const judgeIndex = parseInt(existingJudge.replace('judge-', ''), 10);
        if (!isNaN(judgeIndex) && associationJudges[judgeIndex]) {
          existingJudge = associationJudges[judgeIndex].name;
        }
      } else if (allJudges.length > 0) {
        // Use the first matching judge's name
        existingJudge = allJudges[0].name;
      }
    }
    
    const existingStaff = formData.staffSelections?.[disciplineIndex]
      || formData.groupStaff?.[disciplineIndex]?.[0]
      || '';
    const existingDueDate = formData.dueDateSelections?.[disciplineIndex]
      || formData.disciplineDueDates?.[disciplineIndex]
      || '';

    // Find the exact judge name from available judges to ensure Select component matches
    // This handles case sensitivity and whitespace differences
    let matchedJudgeName = existingJudge;
    if (existingJudge && existingJudge.trim() && !existingJudge.startsWith('judge-')) {
      // Try to find exact match first
      const exactMatch = associationJudges.find(j => j.name === existingJudge);
      if (exactMatch) {
        matchedJudgeName = exactMatch.name;
      } else {
        // Try case-insensitive match
        const caseInsensitiveMatch = associationJudges.find(j => 
          j.name && j.name.toLowerCase().trim() === existingJudge.toLowerCase().trim()
        );
        if (caseInsensitiveMatch) {
          matchedJudgeName = caseInsensitiveMatch.name;
        } else {
          // If no match found, keep the original value (might be from a different association)
          matchedJudgeName = existingJudge.trim();
        }
      }
    }

    setDialogJudge(matchedJudgeName);
    setDialogStaff(existingStaff);
    setDialogDueDate(existingDueDate);
    setAssignDialogOpen(true);
  };

  const handleAssignPattern = () => {
    if (!currentDiscipline) return;
    
    const { disciplineIndex } = currentDiscipline;
    const groups = currentDiscipline.patternGroups || [];
    // Get selected pattern from new state
    const selection = disciplineSelections[currentDiscipline.id];
    const selectedPattern = selection?.patternId;

    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      const newJudges = { ...(prev.groupJudges || {}) };
      const newStaff = { ...(prev.groupStaff || {}) };
      const newDueDates = { ...(prev.disciplineDueDates || {}) };

      // Discipline-level summary values used for row display
      const judgeSelections = [...(prev.judgeSelections || [])];
      const staffSelections = [...(prev.staffSelections || [])];
      const dueDateSelections = [...(prev.dueDateSelections || [])];

      // Initialize discipline entries
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      if (!newJudges[disciplineIndex]) newJudges[disciplineIndex] = {};
      if (!newStaff[disciplineIndex]) newStaff[disciplineIndex] = {};

      // Apply judge and staff to all groups (don't overwrite existing pattern selections)
      // Ensure we're saving judge name, not ID - ALWAYS save the name
      let judgeNameToSave = dialogJudge;
      if (dialogJudge && dialogJudge.trim()) {
        // If dialogJudge is an ID (like "judge-0" or "judge-1"), convert it to judge name
        if (dialogJudge.startsWith('judge-') || /^judge-\d+$/.test(dialogJudge)) {
          // First try to find in currentDiscipline.associationJudges
          const judgeIndex = parseInt(dialogJudge.replace('judge-', ''), 10);
          if (!isNaN(judgeIndex) && currentDiscipline.associationJudges && currentDiscipline.associationJudges[judgeIndex]) {
            judgeNameToSave = currentDiscipline.associationJudges[judgeIndex].name;
          } else {
            // Try to find judge by ID in all association judges
            const allJudges = [];
            if (formData.associationJudges) {
              Object.values(formData.associationJudges).forEach(assocData => {
                const judges = assocData?.judges || [];
                judges.forEach((judge, idx) => {
                  if (judge.name) {
                    const judgeId = judge.id || `judge-${idx}`;
                    // Check if this judge matches the ID
                    if (judgeId === dialogJudge || `judge-${idx}` === dialogJudge) {
                      allJudges.push(judge);
                    }
                  }
                });
              });
            }
            if (allJudges.length > 0) {
              judgeNameToSave = allJudges[0].name;
            } else {
              // If we can't find the judge, don't save anything
              judgeNameToSave = null;
            }
          }
        }
        // If dialogJudge is already a name (not an ID), use it directly
        // This ensures we always save the name, never an ID
      } else {
        judgeNameToSave = null;
      }
      
      // Store judge name - optimize to avoid duplicates when same judge for all groups
      // If judge is assigned via dialog, it applies to all groups in the discipline
      if (judgeNameToSave && judgeNameToSave.trim()) {
        const judgeName = judgeNameToSave.trim();
        
        // Optimization: When assigning via dialog (same judge for all groups),
        // only store for the first group to avoid duplicates
        // Step 5 will read from groupJudges[disciplineIndex][0] or fall back to judgeSelections
        if (groups.length > 0) {
          // Store only for first group (index 0) to avoid duplicates
          newJudges[disciplineIndex][0] = judgeName;
          
          // Clear any existing judge assignments for other groups since we're assigning to all
          for (let i = 1; i < groups.length; i++) {
            if (newJudges[disciplineIndex][i]) {
              delete newJudges[disciplineIndex][i];
            }
          }
        }
        
        // Handle patterns for all groups
        groups.forEach((group, groupIndex) => {
          // Only set pattern if no existing selection for this group
          if (selectedPattern && !newSelections[disciplineIndex][groupIndex]) {
            const difficultyOptions = getGroupDifficultyOptions(selectedPattern, currentDiscipline.name || '', group);
            const difficultyOption = difficultyOptions[0]; // First available option for this group type
            newSelections[disciplineIndex][groupIndex] = difficultyOption?.id || selectedPattern;
          }
        });
      } else {
        // No judge assigned - clear judge data for all groups in this discipline
        if (newJudges[disciplineIndex]) {
          // Clear all judge assignments for this discipline's groups
          groups.forEach((group, groupIndex) => {
            if (newJudges[disciplineIndex][groupIndex]) {
              delete newJudges[disciplineIndex][groupIndex];
            }
          });
          // If no groups have judges, remove the discipline entry entirely
          if (Object.keys(newJudges[disciplineIndex]).length === 0) {
            delete newJudges[disciplineIndex];
          }
        }
        // Handle patterns
        groups.forEach((group, groupIndex) => {
          if (selectedPattern && !newSelections[disciplineIndex][groupIndex]) {
            const difficultyOptions = getGroupDifficultyOptions(selectedPattern, currentDiscipline.name || '', group);
            const difficultyOption = difficultyOptions[0];
            newSelections[disciplineIndex][groupIndex] = difficultyOption?.id || selectedPattern;
          }
        });
      }

      // Set due date at discipline level
      if (dialogDueDate && dialogDueDate.trim()) {
        newDueDates[disciplineIndex] = dialogDueDate.trim();
      } else {
        // Clear due date if removed
        delete newDueDates[disciplineIndex];
      }

      // Store discipline-level selections for display on the row (only if selected)
      // Save judge name, not ID - ALWAYS save the name
      if (judgeNameToSave && judgeNameToSave.trim()) {
        judgeSelections[disciplineIndex] = judgeNameToSave.trim();
      } else {
        // Clear if no valid judge name
        judgeSelections[disciplineIndex] = null;
      }
      // Store due date selection
      if (dialogDueDate && dialogDueDate.trim()) {
        dueDateSelections[disciplineIndex] = dialogDueDate.trim();
      } else {
        // Clear due date selection if removed
        dueDateSelections[disciplineIndex] = null;
      }

      return {
        ...prev,
        patternSelections: newSelections,
        groupJudges: newJudges,
        disciplineDueDates: newDueDates,
        judgeSelections,
        dueDateSelections,
      };
    });

    setAssignDialogOpen(false);
  };

  const dateRange = formData.startDate && formData.endDate
    ? `${format(parseLocalDate(formData.startDate), 'MMM d')} - ${format(parseLocalDate(formData.endDate), 'MMM d, yyyy')}`
    : 'Dates not set';

  // Judges with associated associations
  const judgesWithAssociations = [];
  if (formData.associationJudges) {
    Object.keys(formData.associationJudges).forEach(assocId => {
      const assocJudges = formData.associationJudges[assocId]?.judges || [];
      assocJudges.forEach(judge => {
        if (judge?.name) {
          // Find association display name (prefer abbreviation)
          const association = (associationsData || []).find(a => a.id === assocId) || selectedAssociations.find(a => a.id === assocId);
          const assocName = association?.abbreviation || association?.name || assocId;

          const existing = judgesWithAssociations.find(j => j.name === judge.name);
          if (existing) {
            if (!existing.associations.includes(assocName)) {
              existing.associations.push(assocName);
            }
          } else {
            judgesWithAssociations.push({
              name: judge.name,
              associations: [assocName],
            });
          }
        }
      });
    });
  }

  const showStaff = formData.officials || [];

  // Scroll to discipline and expand it
  const scrollToDiscipline = (disciplineId) => {
    const ref = disciplineRefs.current[disciplineId];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Expand the discipline
      setOpenDisciplineId(disciplineId);
    }
  };

  return (
    <motion.div
      key="step6-pattern-layout"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader>
        <CardTitle>
          Step {stepNumber}: Pattern Selection
        </CardTitle>
        <CardDescription>
          Assign patterns to each group for your book.
        </CardDescription>
        {formData.showName && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-xl font-semibold">
              Horse Show {formData.showName}
            </h3>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Show summary - 3 column layout */}
        <Card className="p-4 bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Show Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Show Information</h3>
              <div className="space-y-3 text-sm">
                {formData.showName && (
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 mt-0.5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground">Show Name</p>
                      <p className="font-medium">{formData.showName}</p>
                    </div>
                  </div>
                )}
                {formData.venueName && (
                  <div className="flex items-start gap-2">
                    <Building className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground">Venue Name</p>
                      <p className="text-muted-foreground">{formData.venueName}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <CalendarIcon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground">Show Dates</p>
                    <p className="text-muted-foreground">{dateRange}</p>
                  </div>
                </div>
                {formData.venueAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground">Location</p>
                      <p className="text-muted-foreground">{formData.venueAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column - Staff */}
            <div className="space-y-4">
              {/* Show Staff Section */}
              <div className="border rounded-lg p-3">
                <h3 className="text-lg font-semibold mb-3">Show Staff</h3>
                <div className="space-y-2">
                  {showStaff.length > 0 ? (
                    showStaff.map((staff, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-blue-600 font-medium">{staff.role}:</span>
                        <span className="font-semibold uppercase">{staff.name || 'Not assigned'}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No staff assigned</span>
                  )}
                </div>
              </div>

              {/* Judges Section */}
              <div className="border rounded-lg p-3">
                <h3 className="text-lg font-semibold mb-3">Show Judges</h3>
                <div className="space-y-2">
                  {judgesWithAssociations.length > 0 ? (
                    judgesWithAssociations.map((judge, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="font-medium uppercase text-sm">{judge.name}</span>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">
                          - {judge.associations.join(', ')}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No judges assigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Discipline Folder */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Discipline Folders</h3>
              <div className="text-xs text-muted-foreground mb-2">
                {(() => {
                  const completeDisciplines = patternDisciplines.filter((discipline) => {
                    return isDisciplineComplete(discipline);
                  }).length;
                  const allComplete = completeDisciplines === patternDisciplines.length && patternDisciplines.length > 0;
                  return `${completeDisciplines} of ${patternDisciplines.length} disciplines ${allComplete ? 'complete' : 'incomplete'}`;
                })()}
              </div>
              <div className="space-y-2">
                {patternDisciplines.map((discipline) => {
                  const groups = discipline.patternGroups || [];
                  const isComplete = isDisciplineComplete(discipline);
                  const isScoresheetOnly = discipline.pattern_type === 'scoresheet_only' || (!discipline.pattern && discipline.scoresheet);
                  
                  // For scoresheet-only: count groups with divisions. For pattern disciplines: count groups with pattern selections
                  const assignedCount = isScoresheetOnly
                    ? groups.filter(group => group.divisions && group.divisions.length > 0).length
                    : groups.filter(group => {
                        const selection = getPatternSelection(discipline.id, group.id);
                        return selection?.patternId;
                      }).length;
                  
                  return (
                    <div
                      key={discipline.id}
                      onClick={() => scrollToDiscipline(discipline.id)}
                      className={cn(
                        "p-3 rounded-lg border-2 flex items-center justify-between cursor-pointer transition-all",
                        isComplete 
                          ? "bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-950/30" 
                          : "bg-orange-50 border-orange-300 dark:bg-orange-950/20 dark:border-orange-700 hover:bg-destructive/10 hover:border-destructive dark:hover:border-destructive"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className={cn(
                            "w-4 h-4",
                            isComplete ? "text-orange-600 dark:text-orange-400" : "text-destructive"
                          )} />
                        )}
                        <div>
                          <p className="font-semibold text-sm">{discipline.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {isScoresheetOnly 
                              ? `${assignedCount} group${assignedCount !== 1 ? 's' : ''} configured`
                              : `${assignedCount} pattern${assignedCount !== 1 ? 's' : ''} assigned`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-semibold px-2 py-1 rounded",
                          isComplete ? "text-green-700 dark:text-green-300" : "text-orange-700 dark:text-orange-300"
                        )}>
                          {isComplete ? 'Complete' : 'Incomplete'}
                        </span>
                        {isComplete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewDiscipline(discipline);
                              setIsPreviewOpen(true);
                            }}
                            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Pattern selection accordion-style list */}
        {patternDisciplines.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Discipline Configuration</h3>
            <div className="space-y-2">
              {patternDisciplines.map((discipline, logicalIndex) => {
                const disciplineIndex = (formData.disciplines || []).findIndex(d => d.id === discipline.id);
                const isOpen = openDisciplineId === discipline.id;
                const groups = discipline.patternGroups || [];
                
                // Check if this is a scoresheet-only discipline
                const isScoresheetOnly = discipline.pattern_type === 'scoresheet_only' || (!discipline.pattern && discipline.scoresheet);
                
                // Filter judges by this discipline's association
                const disciplineJudges = [];
                if (discipline.association_id && formData.associationJudges) {
                  const assocJudges = formData.associationJudges[discipline.association_id]?.judges || [];
                  assocJudges.forEach(judge => {
                    if (judge.name) {
                      disciplineJudges.push(judge);
                    }
                  });
                }

                return (
                  <div 
                    key={discipline.id} 
                    className="bg-card rounded-lg border"
                    ref={(el) => disciplineRefs.current[discipline.id] = el}
                  >
                    {/* Toggle row with inline pattern selection */}
                    <div 
                      className="w-full flex items-center gap-3 px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() =>
                        setOpenDisciplineId(prev => (prev === discipline.id ? null : discipline.id))
                      }
                    >
                      <div className="flex items-center gap-2 hover:text-primary transition-colors">
                        <span className="font-semibold text-base">{discipline.name}</span>
                        {groups.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
                          </Badge>
                        )}
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform text-muted-foreground',
                            isOpen ? 'rotate-180' : 'rotate-0'
                          )}
                        />
                      </div>
                      
                      <div className="flex-1 flex items-center gap-2 flex-wrap min-h-[40px]">
                        {/* Show scoresheet-only badge */}
                        {isScoresheetOnly && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                            Scoresheet Only
                          </Badge>
                        )}
                        
                        {/* Pattern selection UI - only show for non-scoresheet-only disciplines */}
                        {!isScoresheetOnly && (
                          <>
                            {/* Pattern Set (Maneuvers) dropdown - database driven */}
                            {/* Pattern Set (Maneuvers) dropdown - Multi-select */}
                            {/* Reference Style Selection: Difficulty -> Pattern */}
                            <div 
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                                {/* Select Difficulty (Multi-Select) */}
                                <Popover>
                                <PopoverTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      className="w-[180px] justify-between bg-background"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            {(() => {
                                                const selectedIds = disciplineSelections[discipline.id]?.difficulty || ['ALL'];
                                                
                                                if (selectedIds.includes('ALL')) {
                                                    const ver = PATTERN_VERSIONS.find(v => v.id === 'ALL') || PATTERN_VERSIONS[0];
                                                    return (
                                                        <>
                                                            <div className={cn("h-2 w-2 rounded-full", ver.dotColor)} />
                                                            <span>{ver.label}</span>
                                                        </>
                                                    );
                                                }
                                                if (selectedIds.length === 0) return "Select Difficulty";
                                                
                                                if (selectedIds.length === 1) {
                                                    const ver = PATTERN_VERSIONS.find(v => v.id === selectedIds[0]);
                                                    if (ver) {
                                                        return (
                                                            <>
                                                                <div className={cn("h-2 w-2 rounded-full", ver.dotColor)} />
                                                                <span>{ver.label}</span>
                                                            </>
                                                        );
                                                    }
                                                    return selectedIds[0];
                                                }
                                                
                                                // Show all selected difficulties when multiple are selected
                                                return (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {selectedIds.map((id, idx) => {
                                                            const ver = PATTERN_VERSIONS.find(v => v.id === id);
                                                            if (!ver) return null;
                                                            return (
                                                                <div key={id} className="flex items-center gap-1">
                                                                    <div className={cn("h-2 w-2 rounded-full", ver.dotColor)} />
                                                                    <span className="text-xs">{ver.label}</span>
                                                                    {idx < selectedIds.length - 1 && <span className="text-muted-foreground">,</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[180px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search difficulty..." />
                                        <CommandList>
                                            <CommandEmpty>No results found.</CommandEmpty>
                                            <CommandGroup>
                                                {PATTERN_VERSIONS.map(ver => {
                                                    // Only show versions that exist in the DB for this discipline? 
                                                    // The user list seems fixed constant. "i want this type of data" implies use this list explicitly.
                                                    // But showing options that have NO patterns might be annoying.
                                                    // However, typical pattern builder shows all. I'll stick to the user list.
                                                    // Actually, I should probably filter unavailable ones or just show all. Showing all is safer for "Reference".
                                                    
                                                    const current = disciplineSelections[discipline.id]?.difficulty || ['ALL'];
                                                    const isSelected = current.includes(ver.id);

                                                    return (
                                                        <CommandItem
                                                            key={ver.id}
                                                            value={ver.label}
                                                            onSelect={() => {
                                                                setDisciplineSelections(prev => {
                                                                    const old = prev[discipline.id]?.difficulty || ['ALL'];
                                                                    let newSel;
                                                                    
                                                                    if (ver.id === 'ALL') {
                                                                        // If selecting ALL, clear others? Or just toggle? 
                                                                        // Typically ALL overrides everything else.
                                                                        newSel = ['ALL'];
                                                                    } else {
                                                                        // If selecting specific
                                                                         let temp = old.filter(x => x !== 'ALL'); // remove ALL if selecting specific
                                                                         if (isSelected) {
                                                                             temp = temp.filter(x => x !== ver.id);
                                                                             if (temp.length === 0) temp = ['ALL']; // fallback to ALL if empty
                                                                         } else {
                                                                             temp = [...temp, ver.id];
                                                                         }
                                                                         newSel = temp;
                                                                    }

                                                                    return {
                                                                        ...prev,
                                                                        [discipline.id]: {
                                                                            ...(prev[discipline.id] || {}),
                                                                            difficulty: newSel
                                                                        }
                                                                    };
                                                                });
                                                            }}
                                                        >
                                                            <div className={cn(
                                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                                isSelected
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "opacity-50 [&_svg]:invisible"
                                                            )}>
                                                                <Check className={cn("h-4 w-4")} />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("h-2 w-2 rounded-full", ver.dotColor)} />
                                                                <span>{ver.label}</span>
                                                            </div>
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Assign Judge & Date Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAssignDialog(discipline, disciplineIndex);
                          }}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Assign Judge
                        </Button>

                        {/* Display pattern badges from Step 3 selections */}
                        {(() => {
                          const groupSelections = groups.map((group) => {
                            const selection = getPatternSelection(discipline.id, group.id);
                            if (!selection?.patternId && !selection?.patternName) return null;
                            
                            const patternName = selection.patternName || '';
                            // Remove .pdf extension if present and use the actual pattern name
                            const cleanPatternName = patternName.replace(/\.(pdf|PDF)$/, '');
                            const version = selection.version || '';
                            // Format: "WesternRiding0001.L1 (L1)" or just "WesternRiding0001.L1" if no version
                            const displayText = version && version !== 'ALL' ? `${cleanPatternName} (${version})` : cleanPatternName;
                            
                            return {
                              groupName: group.name,
                              patternId: selection.patternId,
                              displayText
                            };
                          }).filter(Boolean);
                          
                          return groupSelections.length > 0 && (
                            <div 
                              className="flex items-center gap-1 flex-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {groupSelections.map((sel, idx) => (
                                <PatternBadgeWithHover 
                                  key={idx} 
                                  patternId={sel.patternId} 
                                  displayText={sel.displayText}
                                  formData={formData}
                                />
                              ))}
                            </div>
                          );
                        })()}
                          </>
                        )}

                        {/* Display assigned labels with values */}
                        {formData.judgeSelections?.[disciplineIndex] && (
                          <Badge 
                            variant="secondary" 
                            className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap cursor-pointer hover:bg-blue-500/20 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignDialog(discipline, disciplineIndex);
                            }}
                          >
                            Judge:{' '}
                            {(() => {
                              // judgeSelections now stores judge names directly
                              const judgeValue = formData.judgeSelections[disciplineIndex];
                              // If it's still an ID (legacy data), try to convert it
                              if (judgeValue && judgeValue.startsWith('judge-')) {
                                const judge = disciplineJudges.find((j, idx) => (j.id || `judge-${idx}`) === judgeValue);
                                return judge?.name || judgeValue;
                              }
                              // Otherwise, it's already a name, just return it
                              return judgeValue;
                            })()}
                          </Badge>
                        )}
                        {formData.dueDateSelections?.[disciplineIndex] && (
                          <Badge 
                            variant="secondary" 
                            className="bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Due Date: {format(new Date(formData.dueDateSelections[disciplineIndex]), 'MM/dd/yy')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 space-y-4">
                        {/* Group Level Details */}
                        <div className="space-y-3">
                          {groups.length > 0 ? (
                            groups.map((group, groupIndex) => {
                              const currentSelection = getPatternSelection(discipline.id, group.id);
                              const filteredPatterns = getFilteredPatterns(discipline.id);
                              
                              return (
                                <div
                                  key={group.id}
                                  className="p-4 border rounded-lg bg-background/50 space-y-4"
                                >
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Label className="font-semibold text-base">{group.name}</Label>
                                      {/* Show pattern badge if selected (only for pattern disciplines) */}
                                      {!isScoresheetOnly && currentSelection?.patternName && (() => {
                                        const patternName = currentSelection.patternName || '';
                                        // Remove .pdf extension if present
                                        const cleanPatternName = patternName.replace(/\.(pdf|PDF)$/, '');
                                        const version = currentSelection.version || '';
                                        // Format: "WesternRiding0001.L1 (L1)" or just "WesternRiding0001.L1" if no version
                                        const displayText = version && version !== 'ALL' ? `${cleanPatternName} (${version})` : cleanPatternName;
                                        return (
                                          <PatternBadgeWithHover 
                                            patternId={currentSelection.patternId} 
                                            displayText={displayText}
                                            formData={formData}
                                          />
                                        );
                                      })()}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {(group.divisions || []).map(div => (
                                        <Badge
                                          key={div.id || `${div.assocId}-${div.division}`}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {div.division || div.id}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>

                                {/* Pattern Selection - Only show for non-scoresheet-only disciplines */}
                                {!isScoresheetOnly && (
                                  <div className="space-y-2">
                                      <Label className="text-sm text-muted-foreground">Select Pattern</Label>
                                      <div className="flex gap-2">
                                          {/* Pattern Selector */}
                                          <Select
                                            value={currentSelection?.patternId?.toString() || ''}
                                            onValueChange={(value) => {
                                                // Hide preview when pattern is selected
                                                setHoveredPatternId(null);
                                                const selectedPattern = (dbPatterns[discipline.id] || []).find(p => p.id.toString() === value);
                                                const patternManeuversRange = selectedPattern?.maneuvers_range || '';
                                                handleGroupPatternSelect(discipline.id, group.id, value, patternManeuversRange);
                                            }}
                                        >
                                            <SelectTrigger className="flex-1 bg-background min-w-[200px] [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:break-words">
                                                <SelectValue placeholder="Select Pattern" />
                                            </SelectTrigger>
                                            <SelectContent 
                                                className="max-h-[300px]"
                                                onMouseLeave={() => {
                                                    setHoveredPatternId(null);
                                                }}
                                            >
                                                {(() => {
                                                    // Use Discipline Level Difficulty (Multi-Select)
                                                    const difficulty = disciplineSelections[discipline.id]?.difficulty || ['ALL'];
                                                    let filtered = getFilteredPatterns(discipline.id);

                                                    // Check if this is an open-show discipline
                                                    const isOpenShowDiscipline = discipline?.selectedAssociations?.['open-show'] || 
                                                                                 discipline?.association_id === 'open-show';
                                                    
                                                    // For open-show disciplines, show all patterns without association filtering
                                                    // For other disciplines, filter by group associations
                                                    if (!isOpenShowDiscipline) {
                                                        // Filter by group associations based on Primary logic
                                                        const groupAssociations = getGroupAssociationNames(group);
                                                        const allGroupAssocNames = [...groupAssociations.names, ...groupAssociations.abbreviations, ...groupAssociations.ids];
                                                        
                                                        if (allGroupAssocNames.length > 0) {
                                                            const filteredByAssoc = filtered.filter(pattern => {
                                                                const patternAssocName = (pattern.association_name || '').trim();
                                                                if (!patternAssocName) {
                                                                    // If pattern has no association name, exclude it (patterns should have association names)
                                                                    return false;
                                                                }
                                                                
                                                                const patternAssocLower = patternAssocName.toLowerCase();
                                                                
                                                                return allGroupAssocNames.some(assocName => {
                                                                    const assocNameLower = (assocName || '').trim().toLowerCase();
                                                                    if (!assocNameLower) return false;
                                                                    
                                                                    // 1. Exact match (case-insensitive)
                                                                    if (patternAssocLower === assocNameLower) return true;
                                                                    
                                                                    // 2. Pattern starts with association abbreviation (e.g., "AQHA - ..." matches "AQHA")
                                                                    if (patternAssocLower.startsWith(assocNameLower + ' ') || 
                                                                        patternAssocLower.startsWith(assocNameLower + '-')) {
                                                                        return true;
                                                                    }
                                                                    
                                                                    // 3. Association abbreviation matches pattern's first word before dash/space
                                                                    // (e.g., "AQHA" matches "AQHA - American Quarter Horse Association")
                                                                    const patternFirstPart = patternAssocLower.split(/[\s-]+/)[0];
                                                                    if (patternFirstPart === assocNameLower) return true;
                                                                    
                                                                    // 4. Pattern contains full association name (for cases like "American Quarter Horse Association" in pattern)
                                                                    // Only if the association name is longer than 3 chars to avoid false matches
                                                                    if (assocNameLower.length > 3 && patternAssocLower.includes(assocNameLower)) {
                                                                        return true;
                                                                    }
                                                                    
                                                                    return false;
                                                                });
                                                            });
                                                            
                                                            // Use filtered results if we found matches, otherwise show "No patterns found"
                                                            if (filteredByAssoc.length > 0) {
                                                                // Deduplicate by pattern ID to avoid showing same pattern multiple times
                                                                const seenIds = new Set();
                                                                filtered = filteredByAssoc.filter(pattern => {
                                                                    if (seenIds.has(pattern.id)) {
                                                                        return false;
                                                                    }
                                                                    seenIds.add(pattern.id);
                                                                    return true;
                                                                });
                                                            } else {
                                                                // If no matches found for this group's association, show empty (will display "No patterns")
                                                                filtered = [];
                                                            }
                                                        } else {
                                                            // If group has no associations identified, show empty (will display "No patterns")
                                                            filtered = [];
                                                        }
                                                    }
                                                    // For open-show disciplines, keep all filtered patterns (no association filtering)

                                                    if (!difficulty.includes('ALL')) {
                                                        filtered = filtered.filter(p => difficulty.includes(p.pattern_version));
                                                    }
                                                    
                                                    // Final deduplication by pattern ID (in case same pattern appears multiple times)
                                                    const uniquePatterns = [];
                                                    const seenPatternIds = new Set();
                                                    filtered.forEach(pattern => {
                                                        if (!seenPatternIds.has(pattern.id)) {
                                                            seenPatternIds.add(pattern.id);
                                                            uniquePatterns.push(pattern);
                                                        }
                                                    });
                                                    filtered = uniquePatterns;
                                                    
                                                    // Sort by discipline first, then by pattern number within each discipline
                                                    filtered.sort((a, b) => {
                                                        const nameA = a.pdf_file_name?.trim() || '';
                                                        const nameB = b.pdf_file_name?.trim() || '';
                                                        const disciplineA = a.discipline?.trim() || '';
                                                        const disciplineB = b.discipline?.trim() || '';
                                                        
                                                        // First sort by discipline (alphabetically)
                                                        if (disciplineA !== disciplineB) {
                                                            return disciplineA.localeCompare(disciplineB);
                                                        }
                                                        
                                                        // Within the same discipline, sort by pattern number
                                                        const extractPatternNumber = (fileName) => {
                                                            // Try to match trailing digits before optional dot/extension
                                                            const match = fileName.match(/(\d+)(?:\..*)?$/);
                                                            if (match) {
                                                                return parseInt(match[1], 10);
                                                            }
                                                            // Fallback: try to find any number in the filename
                                                            const anyNumber = fileName.match(/\d+/);
                                                            return anyNumber ? parseInt(anyNumber[0], 10) : 0;
                                                        };
                                                        
                                                        const numA = extractPatternNumber(nameA);
                                                        const numB = extractPatternNumber(nameB);
                                                        
                                                        // Sort by numeric value within the same discipline
                                                        if (numA !== numB) {
                                                            return numA - numB;
                                                        }
                                                        return nameA.localeCompare(nameB, undefined, { numeric: true });
                                                    });

                                                    if (filtered.length === 0) {
                                                        return <SelectItem value="none" disabled>No patterns</SelectItem>;
                                                    }

                                                    return filtered.map((p) => {
                                                        const patternNumber = extractPatternNumber(p.pdf_file_name);
                                                        const version = p.pattern_version || 'ALL';
                                                        const fileName = p.pdf_file_name?.trim() || '';
                                                        const cleanPatternName = fileName.replace(/\.(pdf|PDF)$/, '');
                                                        // Use full pattern name for display, fallback to pattern number
                                                        const displayLabel = cleanPatternName || (patternNumber !== null 
                                                            ? `Pattern ${patternNumber}`
                                                            : `Pattern ${p.id}`);
                                                        const fullDisplayLabel = version && version !== 'ALL' 
                                                            ? `${displayLabel} (${version})` 
                                                            : displayLabel;
                                                        
                                                        return (
                                                            <SelectItem 
                                                                key={p.id} 
                                                                value={p.id.toString()}
                                                                onMouseEnter={(e) => {
                                                                    setHoveredPatternId(p.id);
                                                                    // Center the preview in the middle of the screen
                                                                    const screenWidth = window.innerWidth;
                                                                    const screenHeight = window.innerHeight;
                                                                    setHoverPosition({ 
                                                                        x: screenWidth / 2, 
                                                                        y: screenHeight / 2 
                                                                    });
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    // Don't hide immediately - let the preview handle its own mouse leave
                                                                    // Only hide if we're not moving to the preview
                                                                    const relatedTarget = e.relatedTarget;
                                                                    if (relatedTarget && relatedTarget.closest('.fixed.z-\\[9999\\]')) {
                                                                        return; // Moving to preview, don't hide
                                                                    }
                                                                    // Small delay to allow mouse to move to preview
                                                                    setTimeout(() => {
                                                                        setHoveredPatternId(prev => {
                                                                            // Only clear if still the same pattern (to avoid race conditions)
                                                                            return prev === p.id ? null : prev;
                                                                        });
                                                                    }, 100);
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2 w-full">
                                                                    <span className="whitespace-normal break-words">{fullDisplayLabel}</span>
                                                                    {version && version !== 'ALL' && (
                                                                        <Badge variant="outline" className="text-xs flex-shrink-0">{version}</Badge>
                                                                    )}
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    });
                                                })()}
                                            </SelectContent>
                                        </Select>
                                        {/* Hover Preview - Rendered via portal at body level, centered */}
                                        {hoveredPatternId && typeof document !== 'undefined' && createPortal(
                                            <div
                                                className="fixed z-[9999] bg-background border rounded-lg shadow-lg p-4 w-[600px] max-w-[90vw] pointer-events-auto"
                                                style={{
                                                    left: '50%',
                                                    top: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                }}
                                                onMouseEnter={() => {
                                                    // Keep preview visible when hovering over it
                                                    if (hoveredPatternId) {
                                                        setHoveredPatternId(hoveredPatternId);
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    setHoveredPatternId(null);
                                                }}
                                            >
                                                {loadingHoveredImage ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : hoveredPatternImage ? (
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-sm">Pattern Preview</h4>
                                                        <div className="rounded-md overflow-hidden border bg-muted/20">
                                                            <img 
                                                                src={hoveredPatternImage} 
                                                                alt="Pattern Diagram" 
                                                                className="w-full h-auto object-contain max-h-[600px]"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground py-4">
                                                        No image available for this pattern.
                                                    </div>
                                                )}
                                            </div>,
                                            document.body
                                        )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                          ) : (
                            <div className="p-4 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
                              No groups configured. Please go back to Step 3 to configure divisions.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Assign Pattern Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Pattern</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="dialog-judge" className="text-sm">Assign Judge</Label>
                  {dialogJudge && dialogJudge.trim() && !dialogJudge.startsWith('judge-') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDialogJudge('')}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove Judge
                    </Button>
                  )}
                </div>
                <Select 
                  value={dialogJudge && !dialogJudge.startsWith('judge-') ? dialogJudge : ''} 
                  onValueChange={(value) => {
                    // Ensure we always set the judge name, never an ID
                    // The SelectItem value is already judge.name, so value will be the name
                    setDialogJudge(value);
                  }}
                >
                  <SelectTrigger id="dialog-judge" className="bg-background">
                    <SelectValue placeholder="Select a judge..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {(currentDiscipline?.associationJudges || []).length > 0 ? (
                      (currentDiscipline?.associationJudges || []).map((judge, idx) => {
                        // Always use judge.name as the value - never use ID
                        const judgeName = judge.name || 'Unnamed Judge';
                        return (
                          <SelectItem key={idx} value={judgeName}>
                            {judgeName}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="no-judges" disabled>No judges for this association</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>


              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="dialog-due-date" className="text-sm">Due Date</Label>
                  {dialogDueDate && dialogDueDate.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDialogDueDate('')}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove Date
                    </Button>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dialogDueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dialogDueDate ? format(new Date(dialogDueDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dialogDueDate ? new Date(dialogDueDate) : undefined}
                      onSelect={(date) => setDialogDueDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignPattern}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pattern Preview Modal */}
        <PatternPagePreview
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          discipline={previewDiscipline ? {
              ...previewDiscipline,
              patternGroups: (previewDiscipline.patternGroups || []).map(group => {
                  const selection = getPatternSelection(previewDiscipline.id, group.id);
                  return {
                      ...group,
                      selectedPatternId: selection?.patternId,
                      selectedPatternName: selection?.patternName
                  };
              })
          } : null}
          associationsData={associationsData}
        />
      </CardContent>
    </motion.div>
  );
};
