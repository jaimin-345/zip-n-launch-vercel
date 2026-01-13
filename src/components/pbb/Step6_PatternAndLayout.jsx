import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Users, UserCheck, ChevronDown, MapPin, Building, CheckCircle2, AlertCircle, Trophy, Eye, Check, ChevronsUpDown, X, ZoomIn, ZoomOut, RotateCcw, Loader2, Info, ChevronRight, Pencil } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { cn, parseLocalDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import PatternPagePreview from './PatternPagePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { flushSync } from 'react-dom';

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

export const Step6_PatternAndLayout = ({ formData, setFormData, associationsData = [], stepNumber = 5, isReadOnly = false }) => {
  const { toast } = useToast();
  const [openDisciplineId, setOpenDisciplineId] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [currentDiscipline, setCurrentDiscipline] = useState(null);
  const [dialogDueDate, setDialogDueDate] = useState('');
  const [dialogJudge, setDialogJudge] = useState('');
  const [dialogStaff, setDialogStaff] = useState('');
  const [assignStaffDialogOpen, setAssignStaffDialogOpen] = useState(false);
  const [currentDisciplineForStaff, setCurrentDisciplineForStaff] = useState(null);
  const [dialogStaffName, setDialogStaffName] = useState('');
  const [dialogStaffDueDate, setDialogStaffDueDate] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState(new Set());
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [bulkAssignJudge, setBulkAssignJudge] = useState('');
  const [bulkAssignDueDate, setBulkAssignDueDate] = useState('');
  const disciplineRefs = useRef({});
  const [previewDiscipline, setPreviewDiscipline] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Edit dialog states for Staff and Judges
  const [editStaffDialogOpen, setEditStaffDialogOpen] = useState(false);
  const [editJudgeDialogOpen, setEditJudgeDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingJudge, setEditingJudge] = useState(null);
  const [editedStaffContact, setEditedStaffContact] = useState({ name: '', email: '', phone: '' });
  const [editedJudgeContact, setEditedJudgeContact] = useState({ name: '', email: '', phone: '' });
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingUser, setExistingUser] = useState(null);
  
  const { signUp } = useAuth();
  
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
  
  // Filter and sort state for Discipline Folders
  const [filters, setFilters] = useState({
    incomplete: true,
    completed: true,
    patternsAssigned: false
  });
  const [sortBy, setSortBy] = useState('name');
  const [showAllDisciplines, setShowAllDisciplines] = useState(false);
  const [isDisciplineFoldersOpen, setIsDisciplineFoldersOpen] = useState(true);
  const [isDisciplineConfigOpen, setIsDisciplineConfigOpen] = useState(true);

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
      // Preserve isCustom and pattern_type properties
      acc.push({ 
        ...discipline, 
        patternGroups: validGroups,
        isCustom: discipline.isCustom || discipline.pattern_type === 'custom',
        pattern_type: discipline.pattern_type || 'none'
      });
    } else {
      // Merge patternGroups from duplicate into existing
      const existing = acc[existingIndex];
      const existingGroups = existing.patternGroups || [];
      existing.patternGroups = [...existingGroups, ...validGroups];
      // Preserve isCustom property if either discipline is custom
      existing.isCustom = existing.isCustom || discipline.isCustom || discipline.pattern_type === 'custom';
      // Preserve pattern_type if it's custom
      if (discipline.pattern_type === 'custom') {
        existing.pattern_type = 'custom';
      }
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
    if (isReadOnly) return;
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      newSelections[disciplineIndex][groupIndex] = patternId;
      return { ...prev, patternSelections: newSelections };
    });
  };

  // Handle maneuvers range change at discipline level (Multi-select)
  const handleManeuversRangeChange = (disciplineId, rangeValue) => {
    if (isReadOnly) return;
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
    if (isReadOnly) return;
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

    // Fallback: use ALL associations if multiple and no Primary found
    if (uniqueAssocIds.length > 0) {
      const names = [];
      const abbreviations = [];
      uniqueAssocIds.forEach(assocId => {
      const assoc = associationsData?.find(a => a.id === assocId);
      if (assoc) {
          if (assoc.name) names.push(assoc.name);
          if (assoc.abbreviation) abbreviations.push(assoc.abbreviation);
      }
      });
      return { names, abbreviations, ids: uniqueAssocIds };
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
  const isDisciplineComplete = (discipline, disciplineIndex) => {
    const groups = discipline.patternGroups || [];
    if (groups.length === 0) return false;
    
    // Check if this is a scoresheet-only discipline
    const isScoresheetOnly = discipline.pattern_type === 'scoresheet_only' || (!discipline.pattern && discipline.scoresheet);
    
    // For scoresheet-only disciplines: complete if they have groups with divisions (no judge or pattern selection needed)
    if (isScoresheetOnly) {
      return groups.every(group => group.divisions && group.divisions.length > 0);
    }
    
    // Check if this is a Custom Pattern discipline
    const isCustomPattern = discipline.isCustom || discipline.pattern_type === 'custom';
    
    // For Custom Pattern disciplines: check if staff is assigned
    if (isCustomPattern) {
      const staffAssigned = formData.staffSelections?.[disciplineIndex] && 
                            formData.staffSelections[disciplineIndex].trim();
      
      // Check if any pattern is assigned to any group
      const hasPatternAssigned = groups.some(group => {
        const selection = getPatternSelection(discipline.id, group.id);
        return selection?.patternId;
      });
      
      // Complete if staff is assigned OR pattern is assigned
      return staffAssigned || hasPatternAssigned;
    }
    
    // For regular pattern disciplines: check if judge is assigned
    const judgeAssigned = formData.judgeSelections?.[disciplineIndex] && 
                          formData.judgeSelections[disciplineIndex].trim() && 
                          !formData.judgeSelections[disciplineIndex].startsWith('judge-');
    
    // Check if any pattern is assigned to any group
    const hasPatternAssigned = groups.some(group => {
      const selection = getPatternSelection(discipline.id, group.id);
      return selection?.patternId;
    });
    
    // Complete if judge is assigned OR pattern is assigned
    return judgeAssigned || hasPatternAssigned;
  };

  const handleOpenAssignDialog = (discipline, disciplineIndex) => {
    // Get all judges from all associations with their association info
    const associationJudges = [];
    if (formData.associationJudges) {
      Object.entries(formData.associationJudges).forEach(([assocId, assocData]) => {
        const judges = assocData?.judges || [];
        // Find association details
        const association = associationsData?.find(a => a.id === assocId);
        const assocName = association?.abbreviation || association?.name || assocId;
        
        judges.forEach(judge => {
          if (judge.name) {
            // Check if judge already exists in the list
            const existingJudge = associationJudges.find(j => j.name === judge.name);
            if (existingJudge) {
              // If judge already exists, add association to the list if not already present
              if (!existingJudge.associations) {
                existingJudge.associations = [];
              }
              if (!existingJudge.associations.includes(assocName)) {
                existingJudge.associations.push(assocName);
              }
            } else {
              // Add judge with association info
              associationJudges.push({
                ...judge,
                associations: [assocName]
              });
            }
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
    if (!currentDiscipline || isReadOnly) return;
    
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
        groups.forEach((group) => {
          // Only set pattern if no existing selection for this group
          if (selectedPattern) {
            // Apply pattern directly to the group
            const selectedPatternData = (dbPatterns[currentDiscipline.id] || []).find(p => p.id.toString() === selectedPattern.toString());
            if (selectedPatternData) {
              const patternManeuversRange = selectedPatternData?.maneuvers_range || '';
              handleGroupPatternSelect(currentDiscipline.id, group.id, selectedPattern.toString(), patternManeuversRange);
            }
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
            // Apply pattern directly to the group
            const selectedPatternData = (dbPatterns[currentDiscipline.id] || []).find(p => p.id.toString() === selectedPattern.toString());
            if (selectedPatternData) {
              const patternManeuversRange = selectedPatternData?.maneuvers_range || '';
              handleGroupPatternSelect(currentDiscipline.id, group.id, selectedPattern.toString(), patternManeuversRange);
            }
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

  // Handle opening assign staff dialog for Custom Pattern disciplines
  const handleOpenAssignStaffDialog = (discipline, disciplineIndex) => {
    setCurrentDisciplineForStaff({ ...discipline, disciplineIndex });
    
    // Get existing staff selection
    const existingStaff = formData.staffSelections?.[disciplineIndex] || '';
    const existingDueDate = formData.dueDateSelections?.[disciplineIndex] || '';
    setDialogStaffName(existingStaff);
    setDialogStaffDueDate(existingDueDate);
    setAssignStaffDialogOpen(true);
  };

  // Get available staff members for dropdown
  const getAvailableStaff = () => {
    const staffList = formData.officials || [];
    return staffList
      .filter(staff => staff.name && staff.name.trim())
      .map(staff => ({
        id: staff.id || staff.name,
        name: staff.name,
        role: staff.role || ''
      }));
  };

  // Handle saving staff assignment for Custom Pattern disciplines
  const handleAssignStaff = () => {
    if (!currentDisciplineForStaff || isReadOnly) return;
    
    const { disciplineIndex } = currentDisciplineForStaff;
    const staffName = dialogStaffName && dialogStaffName.trim() ? dialogStaffName.trim() : null;
    const dueDate = dialogStaffDueDate && dialogStaffDueDate.trim() ? dialogStaffDueDate.trim() : null;
    
    setFormData(prev => {
      const staffSelections = [...(prev.staffSelections || [])];
      const dueDateSelections = [...(prev.dueDateSelections || [])];
      
      if (staffName) {
        staffSelections[disciplineIndex] = staffName;
      } else {
        // Clear staff selection if empty
        staffSelections[disciplineIndex] = null;
      }
      
      if (dueDate) {
        dueDateSelections[disciplineIndex] = dueDate;
      } else {
        // Clear due date if empty
        dueDateSelections[disciplineIndex] = null;
      }
      
      return { ...prev, staffSelections, dueDateSelections };
    });
    
    setAssignStaffDialogOpen(false);
    setDialogStaffName('');
    setDialogStaffDueDate('');
    
    const successMessages = [];
    if (staffName) successMessages.push(`Staff "${staffName}"`);
    if (dueDate) successMessages.push(`Due date "${format(parseLocalDate(dueDate), 'MMM d, yyyy')}"`);
    
    if (successMessages.length > 0) {
      toast({
        title: "Success",
        description: `${successMessages.join(' and ')} assigned to ${currentDisciplineForStaff.name}.`,
      });
    }
  };

  // Handler for bulk judge assignment
  const handleBulkAssignJudge = () => {
    if (isReadOnly) return;
    if (selectedDisciplines.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one discipline.",
        variant: "destructive"
      });
      return;
    }

    const judgeName = bulkAssignJudge && bulkAssignJudge.trim() ? bulkAssignJudge.trim() : null;
    const dueDate = bulkAssignDueDate && bulkAssignDueDate.trim() ? bulkAssignDueDate.trim() : null;
    
    if (!judgeName && !dueDate) {
      toast({
        title: "Error",
        description: "Please select a judge or date to assign.",
        variant: "destructive"
      });
      return;
    }
    
    setFormData(prev => {
      const newJudges = { ...(prev.groupJudges || {}) };
      const judgeSelections = { ...(prev.judgeSelections || {}) };
      const newDueDates = { ...(prev.disciplineDueDates || {}) };
      const dueDateSelections = { ...(prev.dueDateSelections || {}) };

      // Assign judge and/or date to all selected disciplines
      selectedDisciplines.forEach(disciplineId => {
        const disciplineIndex = (prev.disciplines || []).findIndex(d => d.id === disciplineId);
        if (disciplineIndex === -1) return;

        const discipline = prev.disciplines[disciplineIndex];
        const groups = discipline.patternGroups || [];

        // Assign judge if provided
        if (judgeName) {
          // Store judge for the first group (index 0) to avoid duplicates
          if (groups.length > 0) {
            if (!newJudges[disciplineIndex]) newJudges[disciplineIndex] = {};
            newJudges[disciplineIndex][0] = judgeName;

            // Clear any existing judge assignments for other groups
            for (let i = 1; i < groups.length; i++) {
              if (newJudges[disciplineIndex][i]) {
                delete newJudges[disciplineIndex][i];
              }
            }
          }

          // Also store in judgeSelections for discipline-level access
          judgeSelections[disciplineIndex] = judgeName;
        }

        // Assign due date if provided
        if (dueDate) {
          newDueDates[disciplineIndex] = dueDate;
          dueDateSelections[disciplineIndex] = dueDate;
        }
      });

      return {
        ...prev,
        groupJudges: newJudges,
        judgeSelections,
        disciplineDueDates: newDueDates,
        dueDateSelections,
      };
    });

    const successMessages = [];
    if (judgeName) successMessages.push(`Judge "${judgeName}"`);
    if (dueDate) successMessages.push(`Due date "${format(parseLocalDate(dueDate), 'MMM d, yyyy')}"`);
    
    toast({
      title: "Success",
      description: `${successMessages.join(' and ')} assigned to ${selectedDisciplines.size} discipline(s).`,
    });

    setBulkAssignDialogOpen(false);
    setBulkAssignJudge('');
    setBulkAssignDueDate('');
    setSelectedDisciplines(new Set());
  };

  const dateRange = formData.startDate && formData.endDate
    ? `${format(parseLocalDate(formData.startDate), 'MMM d')} - ${format(parseLocalDate(formData.endDate), 'MMM d, yyyy')}`
    : 'Dates not set';

  // Judges with associated associations - include email and phone from Step 3
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
            // Update email and phone if they exist in the judge object (preserve existing or update with new)
            if (judge.email && !existing.email) {
              existing.email = judge.email;
            }
            if (judge.phone && !existing.phone) {
              existing.phone = judge.phone;
            }
          } else {
            judgesWithAssociations.push({
              name: judge.name,
              email: judge.email || '',
              phone: judge.phone || '',
              associations: [assocName],
            });
          }
        }
      });
    });
  }

  const showStaff = formData.officials || [];

  // Helper function to check if user exists (similar to Step 8)
  const checkUserExists = async (emailValue) => {
    if (!emailValue || !emailValue.includes('@')) return;
    
    setIsCheckingUser(true);
    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, user_id, email, full_name')
        .ilike('email', emailValue.trim().toLowerCase())
        .maybeSingle();

      if (customerData && !customerError && customerData.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', customerData.user_id)
          .maybeSingle();

        if (profileData && !profileError) {
          setExistingUser({
            ...profileData,
            email: customerData.email
          });
          toast({
            title: 'User Found',
            description: `Found existing user: ${customerData.full_name || profileData.full_name}`,
          });
        } else {
          setExistingUser(null);
        }
      } else {
        setExistingUser(null);
      }
    } catch (error) {
      setExistingUser(null);
    } finally {
      setIsCheckingUser(false);
    }
  };

  // Handle opening edit dialog for staff
  const handleOpenEditStaff = (staff, index) => {
    // Always read from formData.officials to get the most up-to-date data including email and phone from Step 3
    let actualStaff = staff;
    
    // Try to find by id first
    if (staff.id) {
      const foundById = (formData.officials || []).find(s => s.id === staff.id);
      if (foundById) {
        actualStaff = foundById;
      }
    }
    
    // If not found by id, try by index
    if (index !== undefined && (formData.officials || [])[index]) {
      const foundByIndex = (formData.officials || [])[index];
      // Use foundByIndex if it has more complete data (email/phone) or if we didn't find by id
      if (!actualStaff.email && !actualStaff.phone && (foundByIndex.email || foundByIndex.phone)) {
        actualStaff = foundByIndex;
      } else if (foundByIndex.id === staff.id || (!staff.id && foundByIndex.role === staff.role && foundByIndex.name === staff.name)) {
        actualStaff = foundByIndex;
      }
    }
    
    // If still not found, try by role and name match
    if ((!actualStaff.email && !actualStaff.phone) || (!actualStaff.id && staff.id)) {
      const foundByRoleName = (formData.officials || []).find(s => 
        s.role === staff.role && s.name === staff.name
      );
      if (foundByRoleName && (foundByRoleName.email || foundByRoleName.phone)) {
        actualStaff = foundByRoleName;
      }
    }
    
    setEditingStaff({ ...actualStaff, index });
    setEditedStaffContact({
      name: actualStaff.name || '',
      email: actualStaff.email || '',
      phone: actualStaff.phone || ''
    });
    setExistingUser(null);
    setEditStaffDialogOpen(true);
  };

  // Handle opening edit dialog for judge
  const handleOpenEditJudge = (judge) => {
    // Always read from formData.associationJudges to get the most up-to-date data including email and phone from Step 3
    // Search through all associations to find the judge with the most complete data
    let actualJudge = { ...judge };
    let bestMatch = null;
    
    if (formData.associationJudges) {
      Object.keys(formData.associationJudges).forEach(assocId => {
        const assocJudges = formData.associationJudges[assocId]?.judges || [];
        const foundJudge = assocJudges.find(j => 
          j.name && judge.name && j.name.toLowerCase().trim() === judge.name.toLowerCase().trim()
        );
        if (foundJudge) {
          // Prioritize judge with both email and phone, then email only, then phone only
          if (!bestMatch) {
            bestMatch = foundJudge;
          } else {
            // If current foundJudge has more complete data, use it
            const bestHasBoth = bestMatch.email && bestMatch.phone;
            const foundHasBoth = foundJudge.email && foundJudge.phone;
            const bestHasEmail = bestMatch.email;
            const foundHasEmail = foundJudge.email;
            const bestHasPhone = bestMatch.phone;
            const foundHasPhone = foundJudge.phone;
            
            if (foundHasBoth && !bestHasBoth) {
              bestMatch = foundJudge;
            } else if (foundHasEmail && !bestHasEmail) {
              bestMatch = foundJudge;
            } else if (foundHasPhone && !bestHasPhone) {
              bestMatch = foundJudge;
            }
          }
        }
      });
    }
    
    // Use bestMatch if found, otherwise use the passed judge
    if (bestMatch) {
      actualJudge = {
        ...actualJudge,
        ...bestMatch,
        // Ensure we use the best match's email and phone
        email: bestMatch.email || actualJudge.email || '',
        phone: bestMatch.phone || actualJudge.phone || ''
      };
    }
    
    setEditingJudge(actualJudge);
    setEditedJudgeContact({
      name: actualJudge.name || '',
      email: actualJudge.email || '',
      phone: actualJudge.phone || ''
    });
    setExistingUser(null);
    setEditJudgeDialogOpen(true);
  };

  // Handle saving staff contact info
  const handleSaveStaffContact = async () => {
    if (!editingStaff || isReadOnly) return;
    
    flushSync(() => {
      setIsSaving(true);
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const currentName = editedStaffContact.name;
    const currentEmail = editedStaffContact.email;
    const currentPhone = editedStaffContact.phone;
    
    try {
      let userExistsInCustomers = false;
      
      if (currentEmail && currentEmail.includes('@')) {
        const normalizedEmail = currentEmail.trim().toLowerCase();
        const trimmedEmail = currentEmail.trim();
        
        const { data: customerData, error: errorIlike } = await supabase
          .from('customers')
          .select('id, user_id, email, full_name')
          .ilike('email', normalizedEmail)
          .maybeSingle();
        
        if (customerData && !errorIlike) {
          userExistsInCustomers = true;
          if (customerData.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, role')
              .eq('id', customerData.user_id)
              .maybeSingle();
            if (profileData) {
              setExistingUser({
                ...profileData,
                email: customerData.email
              });
            }
          }
        }
      }

      if (!userExistsInCustomers && currentEmail && currentEmail.includes('@')) {
        const nameParts = currentName.trim().split(/\s+/);
        const firstName = nameParts[0] || currentName;
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const metadata = {
          firstName: firstName,
          lastName: lastName,
          mobile: currentPhone || '',
        };
        
        const defaultPassword = '123456';
        const { data, error } = await signUp(currentEmail, defaultPassword, metadata);

        if (error) {
          toast({
            title: 'Error',
            description: `Failed to create user account: ${error.message || 'Unknown error'}`,
            variant: 'destructive'
          });
        } else if (data?.user) {
          if (data.user.id) {
            let profileExists = false;
            let retries = 0;
            const maxRetries = 5;
            
            while (!profileExists && retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              const { data: profileCheck } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', data.user.id)
                .maybeSingle();
              
              if (profileCheck) {
                profileExists = true;
              }
              retries++;
            }
            
            const { error: profileUpdateError } = await supabase
              .from('profiles')
              .update({ 
                full_name: currentName,
                role: editingStaff.role 
              })
              .eq('id', data.user.id);
            
            if (profileUpdateError) {
              const { error: profileInsertError } = await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  full_name: currentName,
                  role: editingStaff.role
                });
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id')
              .eq('user_id', data.user.id)
              .maybeSingle();
            
            if (!existingCustomer) {
              await supabase
                .from('customers')
                .insert({
                  id: crypto.randomUUID(),
                  user_id: data.user.id,
                  email: currentEmail,
                  full_name: currentName,
                  last_name: lastName,
                  created_at: new Date().toISOString()
                });
            }
          }
          
          toast({
            title: 'User Created',
            description: `New user account created for ${currentName}. Login credentials sent to ${currentEmail}.`,
          });
        }
      } else if (userExistsInCustomers) {
        toast({
          title: 'Contact Info Saved',
          description: `Contact information saved for existing user ${currentName}.`,
        });
      }
      
      // Update formData - sync with Step 3 by matching staff ID
      setFormData(prev => {
        const newOfficials = (prev.officials || []).map(official => {
          // Match by id if available, otherwise match by index and role
          if (editingStaff.id && official.id === editingStaff.id) {
            return {
              ...official,
              name: currentName,
              email: currentEmail,
              phone: currentPhone
            };
          }
          // Fallback: match by index if id doesn't match
          if (editingStaff.index !== undefined && prev.officials?.[editingStaff.index]?.id === official.id) {
            return {
              ...official,
              name: currentName,
              email: currentEmail,
              phone: currentPhone
            };
          }
          // Fallback: match by role and name if no id
          if (!editingStaff.id && official.role === editingStaff.role && official.name === editingStaff.name) {
            return {
              ...official,
              name: currentName,
              email: currentEmail,
              phone: currentPhone
            };
          }
          return official;
        });
        return { ...prev, officials: newOfficials };
      });
      
      setEditStaffDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save contact information. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving judge contact info
  const handleSaveJudgeContact = async () => {
    if (!editingJudge || isReadOnly) return;
    
    flushSync(() => {
      setIsSaving(true);
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const currentName = editedJudgeContact.name;
    const currentEmail = editedJudgeContact.email;
    const currentPhone = editedJudgeContact.phone;
    
    try {
      let userExistsInCustomers = false;
      
      if (currentEmail && currentEmail.includes('@')) {
        const normalizedEmail = currentEmail.trim().toLowerCase();
        
        const { data: customerData, error: errorIlike } = await supabase
          .from('customers')
          .select('id, user_id, email, full_name')
          .ilike('email', normalizedEmail)
          .maybeSingle();
        
        if (customerData && !errorIlike) {
          userExistsInCustomers = true;
          if (customerData.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, role')
              .eq('id', customerData.user_id)
              .maybeSingle();
            if (profileData) {
              setExistingUser({
                ...profileData,
                email: customerData.email
              });
            }
          }
        }
      }

      if (!userExistsInCustomers && currentEmail && currentEmail.includes('@')) {
        const nameParts = currentName.trim().split(/\s+/);
        const firstName = nameParts[0] || currentName;
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const metadata = {
          firstName: firstName,
          lastName: lastName,
          mobile: currentPhone || '',
        };
        
        const defaultPassword = '123456';
        const { data, error } = await signUp(currentEmail, defaultPassword, metadata);

        if (error) {
          toast({
            title: 'Error',
            description: `Failed to create user account: ${error.message || 'Unknown error'}`,
            variant: 'destructive'
          });
        } else if (data?.user) {
          if (data.user.id) {
            let profileExists = false;
            let retries = 0;
            const maxRetries = 5;
            
            while (!profileExists && retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              const { data: profileCheck } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', data.user.id)
                .maybeSingle();
              
              if (profileCheck) {
                profileExists = true;
              }
              retries++;
            }
            
            await supabase
              .from('profiles')
              .update({ 
                full_name: currentName,
                role: 'Judge'
              })
              .eq('id', data.user.id);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id')
              .eq('user_id', data.user.id)
              .maybeSingle();
            
            if (!existingCustomer) {
              await supabase
                .from('customers')
                .insert({
                  id: crypto.randomUUID(),
                  user_id: data.user.id,
                  email: currentEmail,
                  full_name: currentName,
                  last_name: lastName,
                  created_at: new Date().toISOString()
                });
            }
          }
          
          toast({
            title: 'User Created',
            description: `New user account created for ${currentName}. Login credentials sent to ${currentEmail}.`,
          });
        }
      } else if (userExistsInCustomers) {
        toast({
          title: 'Contact Info Saved',
          description: `Contact information saved for existing user ${currentName}.`,
        });
      }
      
      // Update formData - find judge in associationJudges and update in all associations where it appears
      // This syncs with Step 3 data structure (JudgesAndStaff component)
      setFormData(prev => {
        const newAssociationJudges = { ...(prev.associationJudges || {}) };
        
        // Find which associations this judge belongs to (judge can appear in multiple associations)
        Object.keys(newAssociationJudges).forEach(assocId => {
          const assocData = newAssociationJudges[assocId];
          if (assocData?.judges) {
            // Update all instances of this judge in this association (case-insensitive match)
            const originalJudgeName = editingJudge.name;
            const updatedJudges = assocData.judges.map((judge) => {
              // Match by name (case-insensitive) to handle variations
              if (judge.name && judge.name.toLowerCase().trim() === originalJudgeName.toLowerCase().trim()) {
                // Preserve all existing properties (id, etc.) and update contact info
                return { 
                  ...judge, 
                  name: currentName, 
                  email: currentEmail, 
                  phone: currentPhone 
                };
              }
              return judge;
            });
            
            // Only update if we found matches to avoid unnecessary state updates
            const hasChanges = updatedJudges.some((judge, idx) => 
              judge.name !== assocData.judges[idx]?.name ||
              judge.email !== assocData.judges[idx]?.email ||
              judge.phone !== assocData.judges[idx]?.phone
            );
            
            if (hasChanges) {
              newAssociationJudges[assocId] = {
                ...assocData,
                judges: updatedJudges
              };
            }
          }
        });
        
        return { ...prev, associationJudges: newAssociationJudges };
      });
      
      setEditJudgeDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save contact information. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

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
        {/* Show summary - 2 column layout with Discipline Folders in second row */}
        <Card className="p-4 bg-muted/50">
          <div className="space-y-6">
            {/* First Row - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Right Column - Staff & Judges */}
              <div className="space-y-4">
                {/* Show Staff Section */}
                <div className="border rounded-lg p-3">
                  <h3 className="text-lg font-semibold mb-3">Show Staff</h3>
                  <div className="space-y-2">
                    {showStaff.length > 0 ? (
                      showStaff.map((staff, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {!isReadOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleOpenEditStaff(staff, idx)}
                              title="Edit Contact Info"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            )}
                            <span className="text-blue-600 font-medium">{staff.role}:</span>
                          </div>
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
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {!isReadOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleOpenEditJudge(judge)}
                              title="Edit Contact Info"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            )}
                            <span className="font-medium uppercase text-sm">{judge.name}</span>
                          </div>
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
            </div>

            {/* Second Row - Discipline Folders (Full Width) */}
            <div className="space-y-4 pt-4 border-t">
              <div 
                className="flex items-center justify-between mb-2 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                onClick={() => setIsDisciplineFoldersOpen(!isDisciplineFoldersOpen)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isDisciplineFoldersOpen ? "rotate-0" : "-rotate-90")} />
                  <h3 className="text-lg font-semibold">Discipline Folders</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllDisciplines(!showAllDisciplines);
                  }}
                >
                  {showAllDisciplines ? 'Show Less' : 'See All'} <ChevronRight className={cn("w-4 h-4 ml-1 transition-transform", showAllDisciplines && "rotate-90")} />
                </Button>
              </div>
              
              {isDisciplineFoldersOpen && (
                <>
              
              <div className="text-sm text-muted-foreground mb-4">
                <p>
                  {(() => {
                    const incompleteCount = patternDisciplines.filter((discipline) => {
                      const disciplineIndex = (formData.disciplines || []).findIndex(d => d.id === discipline.id);
                      return !isDisciplineComplete(discipline, disciplineIndex);
                    }).length;
                    return `${incompleteCount} of ${patternDisciplines.length} disciplines incomplete`;
                  })()}
                </p>
              </div>
              
              {/* Filter Checkboxes */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="filter-incomplete"
                    checked={filters.incomplete}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, incomplete: checked }))}
                  />
                  <Label 
                    htmlFor="filter-incomplete" 
                    className={cn(
                      "text-sm cursor-pointer px-2 py-1 rounded transition-colors"
                    )}
                  >
                    Incomplete
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="filter-completed"
                    checked={filters.completed}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, completed: checked }))}
                  />
                  <Label htmlFor="filter-completed" className="text-sm cursor-pointer">Completed</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="filter-patterns-assigned"
                    checked={filters.patternsAssigned}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, patternsAssigned: checked }))}
                  />
                  <Label htmlFor="filter-patterns-assigned" className="text-sm cursor-pointer">Patterns Assigned</Label>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Label className="text-sm">Sort by:</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[150px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="patterns">Patterns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Grid of Discipline Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(() => {
                  // Filter disciplines based on selected filters
                  const hasActiveFilters = Object.values(filters).some(v => v);
                  
                  let filteredDisciplines = patternDisciplines.filter((discipline) => {
                    if (!hasActiveFilters) return true; // Show all if no filters active
                    
                    const disciplineIndex = (formData.disciplines || []).findIndex(d => d.id === discipline.id);
                    const isComplete = isDisciplineComplete(discipline, disciplineIndex);
                    const isScoresheetOnly = discipline.pattern_type === 'scoresheet_only' || (!discipline.pattern && discipline.scoresheet);
                    
                    // Count patterns/groups
                    const assignedCount = isScoresheetOnly
                      ? (discipline.patternGroups || []).filter(group => group.divisions && group.divisions.length > 0).length
                      : (discipline.patternGroups || []).filter(group => {
                          const selection = getPatternSelection(discipline.id, group.id);
                          return selection?.patternId;
                        }).length;
                    const hasPatterns = assignedCount > 0;
                    
                    // Check if discipline matches any active filter
                    if (filters.incomplete && !isComplete) return true;
                    if (filters.completed && isComplete) return true;
                    if (filters.patternsAssigned && hasPatterns) return true;
                    return false;
                  });
                  
                  // Sort disciplines
                  filteredDisciplines = [...filteredDisciplines].sort((a, b) => {
                    const aIndex = (formData.disciplines || []).findIndex(d => d.id === a.id);
                    const bIndex = (formData.disciplines || []).findIndex(d => d.id === b.id);
                    const aComplete = isDisciplineComplete(a, aIndex);
                    const bComplete = isDisciplineComplete(b, bIndex);
                    const aIsScoresheetOnly = a.pattern_type === 'scoresheet_only' || (!a.pattern && a.scoresheet);
                    const bIsScoresheetOnly = b.pattern_type === 'scoresheet_only' || (!b.pattern && b.scoresheet);
                    
                    const aAssignedCount = aIsScoresheetOnly
                      ? (a.patternGroups || []).filter(group => group.divisions && group.divisions.length > 0).length
                      : (a.patternGroups || []).filter(group => {
                          const selection = getPatternSelection(a.id, group.id);
                          return selection?.patternId;
                        }).length;
                    const bAssignedCount = bIsScoresheetOnly
                      ? (b.patternGroups || []).filter(group => group.divisions && group.divisions.length > 0).length
                      : (b.patternGroups || []).filter(group => {
                          const selection = getPatternSelection(b.id, group.id);
                          return selection?.patternId;
                        }).length;
                    
                    if (sortBy === 'name') {
                      return a.name.localeCompare(b.name);
                    } else if (sortBy === 'status') {
                      return aComplete === bComplete ? 0 : aComplete ? 1 : -1;
                    } else if (sortBy === 'patterns') {
                      return bAssignedCount - aAssignedCount;
                    }
                    return 0;
                  });
                  
                  // Limit to 8 items if not showing all
                  const displayDisciplines = showAllDisciplines ? filteredDisciplines : filteredDisciplines.slice(0, 8);
                  
                  return displayDisciplines.map((discipline) => {
                    const disciplineIndex = (formData.disciplines || []).findIndex(d => d.id === discipline.id);
                    const groups = discipline.patternGroups || [];
                    const isComplete = isDisciplineComplete(discipline, disciplineIndex);
                    const isScoresheetOnly = discipline.pattern_type === 'scoresheet_only' || (!discipline.pattern && discipline.scoresheet);
                    
                    // Check if judge is assigned
                    const judgeAssigned = formData.judgeSelections?.[disciplineIndex] && 
                                          formData.judgeSelections[disciplineIndex].trim() && 
                                          !formData.judgeSelections[disciplineIndex].startsWith('judge-');
                    
                    // Get judge name and number
                    let judgeName = null;
                    let judgeNumber = null;
                    if (judgeAssigned) {
                      judgeName = formData.judgeSelections[disciplineIndex];
                      const match = judgeName.match(/(\d+)/);
                      judgeNumber = match ? match[1] : null;
                    }
                    
                    // Count assigned patterns/groups
                    const assignedCount = isScoresheetOnly
                      ? groups.filter(group => group.divisions && group.divisions.length > 0).length
                      : groups.filter(group => {
                          const selection = getPatternSelection(discipline.id, group.id);
                          return selection?.patternId;
                        }).length;
                    
                    // Get pattern names for display
                    const patternNames = [];
                    if (!isScoresheetOnly) {
                      groups.forEach(group => {
                        const selection = getPatternSelection(discipline.id, group.id);
                        if (selection?.patternName) {
                          const patternName = selection.patternName.replace(/\.(pdf|PDF)$/, '');
                          const version = selection.version || '';
                          const displayText = version && version !== 'ALL' ? `${patternName} (${version})` : patternName;
                          if (!patternNames.includes(displayText)) {
                            patternNames.push(displayText);
                          }
                        }
                      });
                    }
                    
                    // Determine subtitle text
                    let subtitle = '';
                    let subtitleColor = 'text-muted-foreground';
                    if (judgeName && judgeNumber) {
                      subtitle = `★ Test Judge ${judgeNumber}`;
                      subtitleColor = 'text-blue-600 dark:text-blue-400';
                    } else if (isScoresheetOnly) {
                      subtitle = `${assignedCount} group${assignedCount !== 1 ? 's' : ''} configured`;
                    } else if (assignedCount > 0) {
                      subtitle = `${assignedCount} pattern${assignedCount !== 1 ? 's' : ''} assigned`;
                      // Add pattern names if available
                      if (patternNames.length > 0) {
                        subtitle += ` ${patternNames.join(' ')}`;
                      }
                    } else {
                      subtitle = '0 patterns assigned';
                    }
                    
                    const handleDisciplineClick = () => {
                      scrollToDiscipline(discipline.id);
                      if (!isScoresheetOnly && !judgeAssigned) {
                        toast({
                          title: "Judge Required",
                          description: "First assign this discipline judge before proceeding.",
                          variant: "destructive"
                        });
                      }
                    };
                    
                    return (
                      <div
                        key={discipline.id}
                        onClick={handleDisciplineClick}
                        className={cn(
                          "relative p-4 border-2 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md",
                          isComplete 
                            ? "bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-950/30" 
                            : "bg-orange-50 border-orange-300 dark:bg-orange-950/20 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950/30"
                        )}
                      >
                        {/* Discipline Name with Status Icon */}
                        <div className="flex items-start gap-2 mb-2">
                          {isComplete ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-base leading-tight">{discipline.name}</h4>
                            {subtitle && (
                              <p className={cn("text-sm mt-1", subtitleColor)}>
                                {subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Footer with status badge and action */}
                        <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-current/10">
                          <Badge 
                            className={cn(
                              "text-xs font-semibold",
                              isComplete 
                                ? "bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700" 
                                : "bg-orange-200 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300 dark:border-orange-700"
                            )}
                          >
                            {isComplete ? "Complete" : "Incomplete"}
                          </Badge>
                          {isComplete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewDiscipline(discipline);
                                setIsPreviewOpen(true);
                              }}
                              className="p-1 hover:bg-green-200 dark:hover:bg-green-900/40 rounded transition-colors flex-shrink-0"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4 text-green-700 dark:text-green-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Pattern selection accordion-style list */}
        {patternDisciplines.length > 0 && (
          <section>
            <div 
              className="flex items-center justify-between mb-4 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
              onClick={() => setIsDisciplineConfigOpen(!isDisciplineConfigOpen)}
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={cn("w-4 h-4 transition-transform", isDisciplineConfigOpen ? "rotate-0" : "-rotate-90")} />
                <h3 className="text-lg font-semibold">Discipline Configuration</h3>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setBulkAssignDialogOpen(true)}
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Assign Judge to Multiple Disciplines
                </Button>
              </div>
            </div>
            
            {isDisciplineConfigOpen && (
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
                    className={cn(
                      "bg-card rounded-lg border transition-all duration-300",
                      isOpen && "border-primary"
                    )}
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
                        {/* Pattern Dropdown - Apply to all groups */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Select
                            value=""
                            onValueChange={(patternId) => {
                              // Apply selected pattern to all groups in this discipline
                              const selectedPattern = (dbPatterns[discipline.id] || []).find(p => p.id.toString() === patternId);
                              if (selectedPattern) {
                                const patternManeuversRange = selectedPattern?.maneuvers_range || '';
                                groups.forEach((group) => {
                                  handleGroupPatternSelect(discipline.id, group.id, patternId, patternManeuversRange);
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-[200px] text-xs bg-background">
                              <SelectValue placeholder="Select Pattern for All Groups" />
                            </SelectTrigger>
                            <SelectContent 
                              className="max-h-[300px]"
                              onMouseLeave={() => {
                                setHoveredPatternId(null);
                              }}
                            >
                                            {(() => {
                                let allPatterns = getFilteredPatterns(discipline.id);
                                
                                // Check if this is an open-show discipline
                                const isOpenShowDiscipline = discipline?.selectedAssociations?.['open-show'] || 
                                                             discipline?.association_id === 'open-show';
                                
                                // For open-show disciplines, show all patterns without association filtering
                                if (!isOpenShowDiscipline) {
                                  // Get all unique associations from all groups in this discipline
                                  // This works for ANY associations (AQHA, APHA, VRH, RHC, etc.)
                                  const uniqueAssocIds = new Set();
                                  groups.forEach(group => {
                                    if (group.divisions) {
                                      group.divisions.forEach(div => {
                                        if (div.assocId) {
                                          uniqueAssocIds.add(div.assocId);
                                        }
                                      });
                                    }
                                  });
                                  
                                  const assocIdsArray = Array.from(uniqueAssocIds);
                                  
                                  // If discipline has 2+ associations: show patterns from all of them
                                  // If discipline has 1 association: show only patterns from that association
                                  if (assocIdsArray.length > 0) {
                                    // Get association names and abbreviations for all associations found
                                    const associationNames = [];
                                    assocIdsArray.forEach(assocId => {
                                      const assoc = associationsData?.find(a => a.id === assocId);
                                      if (assoc) {
                                        if (assoc.name) associationNames.push(assoc.name);
                                        if (assoc.abbreviation) associationNames.push(assoc.abbreviation);
                                      }
                                    });
                                    
                                    // Filter patterns to only show those matching ANY of the discipline's associations
                                    if (associationNames.length > 0) {
                                      allPatterns = allPatterns.filter(pattern => {
                                        const patternAssocName = (pattern.association_name || '').trim();
                                        if (!patternAssocName) return false;
                                        
                                        const patternAssocLower = patternAssocName.toLowerCase();
                                        
                                        // Check if pattern matches ANY of the associations in this discipline
                                        return associationNames.some(assocName => {
                                          const assocNameLower = (assocName || '').trim().toLowerCase();
                                          if (!assocNameLower) return false;
                                          
                                          // 1. Exact match (case-insensitive)
                                          if (patternAssocLower === assocNameLower) return true;
                                          
                                          // 2. Pattern starts with association abbreviation
                                          if (patternAssocLower.startsWith(assocNameLower + ' ') || 
                                              patternAssocLower.startsWith(assocNameLower + '-')) {
                                            return true;
                                          }
                                          
                                          // 3. Association abbreviation matches pattern's first word before dash/space
                                          const patternFirstPart = patternAssocLower.split(/[\s-]+/)[0];
                                          if (patternFirstPart === assocNameLower) return true;
                                          
                                          // 4. Pattern contains full association name
                                          if (assocNameLower.length > 3 && patternAssocLower.includes(assocNameLower)) {
                                            return true;
                                          }
                                          
                                          return false;
                                        });
                                      });
                                    }
                                  }
                                }
                                
                                if (allPatterns.length === 0) {
                                  return <SelectItem value="none" disabled>No patterns available</SelectItem>;
                                }
                                
                                // Extract pattern number helper
                                const extractPatternNumber = (fileName) => {
                                  if (!fileName) return null;
                                  const match = fileName.match(/(\d+)(?:\..*)?$/);
                                  if (match) {
                                    return parseInt(match[1], 10);
                                  }
                                  return null;
                                };
                                
                                // Sort patterns
                                const sortedPatterns = [...allPatterns].sort((a, b) => {
                                  const numA = extractPatternNumber(a.pdf_file_name) || 0;
                                  const numB = extractPatternNumber(b.pdf_file_name) || 0;
                                  return numA - numB;
                                });
                                
                                return sortedPatterns.map((pattern) => {
                                  const patternNumber = extractPatternNumber(pattern.pdf_file_name);
                                  const version = pattern.pattern_version || 'ALL';
                                  
                                  // Display label as "Pattern 1", "Pattern 2", etc.
                                  const displayLabel = patternNumber !== null 
                                    ? `Pattern ${patternNumber}`
                                    : `Pattern ${pattern.id}`;
                                  
                                  return (
                                    <SelectItem 
                                      key={pattern.id} 
                                      value={pattern.id.toString()}
                                      onMouseEnter={(e) => {
                                        setHoveredPatternId(pattern.id);
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
                                            return prev === pattern.id ? null : prev;
                                          });
                                        }, 100);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <span className="whitespace-normal break-words">{displayLabel}</span>
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
                        </div>

                        {/* Assign Judge & Date Button - Hide for Custom Pattern disciplines */}
                        {!(discipline.isCustom || discipline.pattern_type === 'custom') && (
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
                        )}

                        {/* Assign Judge Button - Only for Custom Pattern disciplines */}
                        {(discipline.isCustom || discipline.pattern_type === 'custom') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignDialog(discipline, disciplineIndex);
                            }}
                            disabled={
                              formData.staffSelections?.[disciplineIndex] && 
                              formData.staffSelections[disciplineIndex].trim()
                            }
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Assign Judge
                          </Button>
                        )}

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
                        {/* Judge badge - Show for all disciplines when judge is assigned */}
                        {formData.judgeSelections?.[disciplineIndex] && 
                         formData.judgeSelections[disciplineIndex].trim() && 
                         !formData.judgeSelections[disciplineIndex].startsWith('judge-') && (
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
                        {/* Due date badge - Show for all disciplines */}
                        {formData.dueDateSelections?.[disciplineIndex] && (
                          <Badge 
                            variant="secondary" 
                            className="bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap cursor-pointer hover:bg-purple-500/20 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open appropriate dialog based on discipline type
                              if (discipline.isCustom || discipline.pattern_type === 'custom') {
                                handleOpenAssignStaffDialog(discipline, disciplineIndex);
                              } else {
                                handleOpenAssignDialog(discipline, disciplineIndex);
                              }
                            }}
                          >
                            Due Date: {format(new Date(formData.dueDateSelections[disciplineIndex]), 'MM/dd/yy')}
                          </Badge>
                        )}
                        {/* Display assigned staff for Custom Pattern disciplines */}
                        {(discipline.isCustom || discipline.pattern_type === 'custom') && formData.staffSelections?.[disciplineIndex] && (
                          <Badge 
                            variant="secondary" 
                            className="bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20 whitespace-nowrap cursor-pointer hover:bg-orange-500/20 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignStaffDialog(discipline, disciplineIndex);
                            }}
                          >
                            Staff: {formData.staffSelections[disciplineIndex]}
                          </Badge>
                        )}

                        {/* Assign Staff Button - Only for Custom Pattern disciplines, positioned on the right */}
                        {(discipline.isCustom || discipline.pattern_type === 'custom') && (
                          <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAssignStaffDialog(discipline, disciplineIndex);
                              }}
                              disabled={
                                formData.judgeSelections?.[disciplineIndex] && 
                                formData.judgeSelections[disciplineIndex].trim() && 
                                !formData.judgeSelections[disciplineIndex].startsWith('judge-')
                              }
                            >
                              <Users className="h-3 w-3 mr-1" />
                              Assign Staff
                            </Button>
                          </div>
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
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
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
                                      {/* Show association badge on right side - get from pattern data */}
                                      {!isScoresheetOnly && currentSelection?.patternId && (() => {
                                        // Get the pattern from database patterns to extract association name
                                        const pattern = (dbPatterns[discipline.id] || []).find(p => p.id === currentSelection.patternId);
                                        const associationName = pattern?.association_name || currentSelection?.filterAssociation;
                                        
                                        if (associationName) {
                                          // Extract just the association abbreviation/name (before dash if present)
                                          const assocDisplay = associationName.split(/[\s-]+/)[0].trim();
                                          return (
                                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                                              {assocDisplay}
                                            </Badge>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {(group.divisions || []).map(div => {
                                        // Remove first word, "Pro", and "Non-Pro" from division name
                                        const divisionName = div.division || div.id || '';
                                        const removeFirstWord = (name) => {
                                          if (!name) return name;
                                          let cleaned = name;
                                          
                                          // Remove first word and any separator (dash, hyphen, etc.)
                                          cleaned = cleaned.replace(/^[^\s-]+\s*[-–—]\s*/, '').trim();
                                          
                                          // Remove "Pro" or "Non-Pro" at the start
                                          cleaned = cleaned.replace(/^(Pro|Non-Pro)\s*[-–—]?\s*/i, '').trim();
                                          
                                          // If no separator found and still original, try removing just the first word
                                          if (cleaned === name) {
                                            const parts = name.split(/\s+/);
                                            // Skip first word if it's not "Pro" or "Non-Pro"
                                            if (parts.length > 1 && !/^(Pro|Non-Pro)$/i.test(parts[0])) {
                                              cleaned = parts.slice(1).join(' ');
                                            } else if (parts.length > 1) {
                                              // If first word is "Pro" or "Non-Pro", remove it and separator if present
                                              cleaned = parts.slice(1).join(' ').replace(/^\s*[-–—]\s*/, '').trim();
                                            }
                                          }
                                          
                                          return cleaned || name;
                                        };
                                        const displayName = removeFirstWord(divisionName);
                                        
                                        return (
                                          <Badge
                                            key={div.id || `${div.assocId}-${div.division}`}
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {displayName}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  </div>

                                {/* Pattern Selection - Only show for non-scoresheet-only disciplines */}
                                {!isScoresheetOnly && (
                                  <div className="space-y-2">
                                      <Label className="text-sm text-muted-foreground">Pattern Selection</Label>
                                      <div className="grid grid-cols-2 gap-3">
                                          {/* Pattern Selector */}
                                          <div>
                                              <Label className="text-xs text-muted-foreground mb-1 block">Select Pattern</Label>
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
                                                <SelectTrigger className="bg-background [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:break-words">
                                                <SelectValue placeholder="Select Pattern" />
                                            </SelectTrigger>
                                            <SelectContent 
                                                className="max-h-[300px]"
                                                onMouseLeave={() => {
                                                    setHoveredPatternId(null);
                                                }}
                                            >
                                                {(() => {
                                                    let filtered = getFilteredPatterns(discipline.id);

                                                    // Check if this is an open-show discipline
                                                    const isOpenShowDiscipline = discipline?.selectedAssociations?.['open-show'] || 
                                                                                 discipline?.association_id === 'open-show';
                                                    
                                                    // For open-show disciplines, show all patterns without association filtering
                                                    // For other disciplines, filter by group associations
                                                    if (!isOpenShowDiscipline) {
                                                        // If filterAssociation is set from Step 3, use only that association
                                                        // Otherwise, use all associations in the group
                                                        let associationNamesToFilter = [];
                                                        
                                                        if (currentSelection?.filterAssociation) {
                                                            // Use the saved filterAssociation value from Step 3
                                                            associationNamesToFilter = [currentSelection.filterAssociation];
                                                        } else {
                                                            // Fallback to group associations based on Primary logic
                                                        const groupAssociations = getGroupAssociationNames(group);
                                                            associationNamesToFilter = [...groupAssociations.names, ...groupAssociations.abbreviations, ...groupAssociations.ids];
                                                        }
                                                        
                                                        if (associationNamesToFilter.length > 0) {
                                                            const filteredByAssoc = filtered.filter(pattern => {
                                                                const patternAssocName = (pattern.association_name || '').trim();
                                                                if (!patternAssocName) {
                                                                    // If pattern has no association name, exclude it (patterns should have association names)
                                                                    return false;
                                                                }
                                                                
                                                                const patternAssocLower = patternAssocName.toLowerCase();
                                                                
                                                                return associationNamesToFilter.some(assocName => {
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

                                                    // Filter by group-level difficulty if set
                                                    const groupDifficulty = currentSelection?.version;
                                                    if (groupDifficulty && groupDifficulty !== 'ALL') {
                                                        filtered = filtered.filter(p => p.pattern_version === groupDifficulty);
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
                                                        
                                                        // Display label as "Pattern 1", "Pattern 2", etc.
                                                        const displayLabel = patternNumber !== null 
                                                            ? `Pattern ${patternNumber}`
                                                            : `Pattern ${p.id}`;
                                                        
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
                                                                    <span className="whitespace-normal break-words">{displayLabel}</span>
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
                                        </div>
                                        
                                        {/* Difficulty Dropdown */}
                                        <div>
                                            <Label className="text-xs text-muted-foreground mb-1 block">Select Difficulty</Label>
                                            <Select 
                                                value={currentSelection?.version || 'ALL'}
                                                onValueChange={(value) => {
                                                    // Update the version in formData
                                                    setFormData(prev => {
                                                        const newSelections = { ...(prev.patternSelections || {}) };
                                                        if (!newSelections[discipline.id]) newSelections[discipline.id] = {};
                                                        if (newSelections[discipline.id][group.id]) {
                                                            newSelections[discipline.id][group.id] = {
                                                                ...newSelections[discipline.id][group.id],
                                                                version: value
                                                            };
                                                        } else {
                                                            // If no pattern selected yet, just set the version
                                                            newSelections[discipline.id][group.id] = {
                                                                maneuversRange: '',
                                                                patternId: null,
                                                                patternName: null,
                                                                version: value
                                                            };
                                                        }
                                                        return { ...prev, patternSelections: newSelections };
                                                    });
                                                }}
                                            >
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue placeholder="Select difficulty..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {PATTERN_VERSIONS.map(version => (
                                                        <SelectItem key={version.id} value={version.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("h-2 w-2 rounded-full", version.dotColor)} />
                                                                <span>{version.label}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    
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
            )}
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
                        const associations = judge.associations || [];
                        return (
                          <SelectItem key={idx} value={judgeName}>
                            <div className="flex items-center justify-between w-full">
                              <span>{judgeName}</span>
                              {associations.length > 0 && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {associations.join(', ')}
                                </Badge>
                              )}
                            </div>
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
                      {dialogDueDate ? format(parseLocalDate(dialogDueDate), 'EEE, MMM d') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dialogDueDate ? parseLocalDate(dialogDueDate) : undefined}
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

        {/* Bulk Assign Judge Dialog */}
        <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Judge & Date to Disciplines</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Select Disciplines ({selectedDisciplines.size} selected)</Label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                  {patternDisciplines.map(discipline => (
                    <div key={discipline.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-discipline-${discipline.id}`}
                        checked={selectedDisciplines.has(discipline.id)}
                        onCheckedChange={(checked) => {
                          setSelectedDisciplines(prev => {
                            const newSet = new Set(prev);
                            if (checked) {
                              newSet.add(discipline.id);
                            } else {
                              newSet.delete(discipline.id);
                            }
                            return newSet;
                          });
                        }}
                      />
                      <Label 
                        htmlFor={`bulk-discipline-${discipline.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {discipline.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="bulk-dialog-judge" className="text-sm">Select Judge (Optional)</Label>
                  {bulkAssignJudge && bulkAssignJudge.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setBulkAssignJudge('')}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <Select 
                  value={bulkAssignJudge && !bulkAssignJudge.startsWith('judge-') ? bulkAssignJudge : ''} 
                  onValueChange={(value) => {
                    setBulkAssignJudge(value);
                  }}
                >
                  <SelectTrigger id="bulk-dialog-judge" className="bg-background">
                    <SelectValue placeholder="Select a judge..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {judgesWithAssociations.length > 0 ? (
                      judgesWithAssociations.map((judge, idx) => {
                        const judgeName = judge.name || 'Unnamed Judge';
                        return (
                          <SelectItem key={idx} value={judgeName}>
                            {judgeName}
                            {judge.associations.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({judge.associations.join(', ')})
                              </span>
                            )}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="no-judges" disabled>No judges available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="bulk-dialog-due-date" className="text-sm">Due Date (Optional)</Label>
                  {bulkAssignDueDate && bulkAssignDueDate.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setBulkAssignDueDate('')}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !bulkAssignDueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {bulkAssignDueDate ? format(parseLocalDate(bulkAssignDueDate), 'EEE, MMM d, yyyy') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={bulkAssignDueDate ? parseLocalDate(bulkAssignDueDate) : undefined}
                      onSelect={(date) => setBulkAssignDueDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => {
                setBulkAssignDialogOpen(false);
                setBulkAssignJudge('');
                setBulkAssignDueDate('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleBulkAssignJudge}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={selectedDisciplines.size === 0 || (!bulkAssignJudge?.trim() && !bulkAssignDueDate?.trim())}
              >
                Assign to {selectedDisciplines.size} Discipline{selectedDisciplines.size !== 1 ? 's' : ''}
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

        {/* Edit Staff Contact Dialog */}
        <Dialog open={editStaffDialogOpen} onOpenChange={setEditStaffDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Contact Info</DialogTitle>
              <DialogDescription>
                Add or update the contact details for this staff member. System will check if they're an existing user.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="staff-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="staff-name"
                  value={editedStaffContact.name}
                  onChange={(e) => setEditedStaffContact(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  placeholder="Full Name"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="staff-email" className="text-right">
                  Email
                </Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="staff-email"
                      type="email"
                      value={editedStaffContact.email}
                      onChange={(e) => setEditedStaffContact(prev => ({ ...prev, email: e.target.value }))}
                      onBlur={() => {
                        if (editedStaffContact.email !== (editingStaff?.email || '')) {
                          checkUserExists(editedStaffContact.email);
                        }
                      }}
                      className="flex-1"
                      placeholder="name@example.com"
                    />
                    {isCheckingUser && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                  </div>
                  {existingUser && (
                    <Badge variant="outline" className="text-xs">
                      ✓ Existing user found
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="staff-phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="staff-phone"
                  value={editedStaffContact.phone}
                  onChange={(e) => setEditedStaffContact(prev => ({ ...prev, phone: e.target.value }))}
                  className="col-span-3"
                  placeholder="(555) 123-4567"
                />
              </div>

              {existingUser && existingUser.role && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs text-muted-foreground">
                    Current Role
                  </Label>
                  <div className="col-span-3">
                    <Badge variant="secondary">{existingUser.role}</Badge>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button"
                onClick={handleSaveStaffContact} 
                disabled={isCheckingUser || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isCheckingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Judge Contact Dialog */}
        <Dialog open={editJudgeDialogOpen} onOpenChange={setEditJudgeDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Contact Info</DialogTitle>
              <DialogDescription>
                Add or update the contact details for this judge. System will check if they're an existing user.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="judge-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="judge-name"
                  value={editedJudgeContact.name}
                  onChange={(e) => setEditedJudgeContact(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  placeholder="Full Name"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="judge-email" className="text-right">
                  Email
                </Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="judge-email"
                      type="email"
                      value={editedJudgeContact.email}
                      onChange={(e) => setEditedJudgeContact(prev => ({ ...prev, email: e.target.value }))}
                      onBlur={() => {
                        if (editedJudgeContact.email !== (editingJudge?.email || '')) {
                          checkUserExists(editedJudgeContact.email);
                        }
                      }}
                      className="flex-1"
                      placeholder="name@example.com"
                    />
                    {isCheckingUser && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                  </div>
                  {existingUser && (
                    <Badge variant="outline" className="text-xs">
                      ✓ Existing user found
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="judge-phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="judge-phone"
                  value={editedJudgeContact.phone}
                  onChange={(e) => setEditedJudgeContact(prev => ({ ...prev, phone: e.target.value }))}
                  className="col-span-3"
                  placeholder="(555) 123-4567"
                />
              </div>

              {existingUser && existingUser.role && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs text-muted-foreground">
                    Current Role
                  </Label>
                  <div className="col-span-3">
                    <Badge variant="secondary">{existingUser.role}</Badge>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button"
                onClick={handleSaveJudgeContact} 
                disabled={isCheckingUser || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isCheckingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Staff Dialog for Custom Pattern Disciplines */}
        <Dialog open={assignStaffDialogOpen} onOpenChange={setAssignStaffDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Staff & Due Date</DialogTitle>
              <DialogDescription>
                Select a staff member and set due date for this custom pattern discipline.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="dialog-staff" className="text-sm">Select Staff</Label>
                  {dialogStaffName && dialogStaffName.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDialogStaffName('')}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove Staff
                    </Button>
                  )}
                </div>
                <Select 
                  value={dialogStaffName || ''} 
                  onValueChange={(value) => {
                    setDialogStaffName(value);
                  }}
                >
                  <SelectTrigger id="dialog-staff" className="bg-background">
                    <SelectValue placeholder="Select a staff member..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {getAvailableStaff().length > 0 ? (
                      getAvailableStaff().map((staff) => (
                        <SelectItem key={staff.id} value={staff.name}>
                          <div className="flex items-center justify-between w-full">
                            <span>{staff.name}</span>
                            {staff.role && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {staff.role}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-staff" disabled>No staff members available. Add staff in Step 3.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="dialog-staff-due-date" className="text-sm">Due Date</Label>
                  {dialogStaffDueDate && dialogStaffDueDate.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDialogStaffDueDate('')}
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
                        !dialogStaffDueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dialogStaffDueDate ? format(parseLocalDate(dialogStaffDueDate), 'EEE, MMM d') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dialogStaffDueDate ? parseLocalDate(dialogStaffDueDate) : undefined}
                      onSelect={(date) => setDialogStaffDueDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => {
                setAssignStaffDialogOpen(false);
                setDialogStaffName('');
                setDialogStaffDueDate('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignStaff}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Assign Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </motion.div>
  );
};
