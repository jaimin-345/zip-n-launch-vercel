import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Edit, Calendar as CalendarIcon, X, Save, Sparkles, AlertCircle, Eye, Check, ChevronsUpDown, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

// Pattern Sets constant removed (unused)

// Pattern version categories
// Pattern version categories
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


const SortableDivisionItem = ({ division, pbbDiscipline, setFormData, formData, associationsData, groupId }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: division.id,
        data: {
            division: division,
            type: 'division',
            sortable: {
                containerId: groupId
            }
        }
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(division.customTitle || '');
    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleTitleSave = () => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newPrintTitles = { ...(disc.divisionPrintTitles || {}), [division.id]: editedTitle };
                    return { ...disc, divisionPrintTitles: newPrintTitles };
                }
                return disc;
            })
        }));
        setIsEditing(false);
    };

    const handleDateSelect = (date) => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newDates = { ...(disc.divisionDates || {}), [division.id]: format(date, 'yyyy-MM-dd') };
                    return { ...disc, divisionDates: newDates };
                }
                return disc;
            })
        }));
        setPopoverOpen(false);
    };

    const handleRemoveDate = (e) => {
        e.stopPropagation();
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newDates = { ...(disc.divisionDates || {}) };
                    delete newDates[division.id];
                    return { ...disc, divisionDates: newDates };
                }
                return disc;
            })
        }));
    };

    // Parse division name to extract tag and clean name
    const divisionName = division.division || '';
    const originalDivisionName = divisionName.startsWith('custom') ? divisionName.substring(7) : divisionName;
    const dashIndex = originalDivisionName.indexOf(' - ');
    const divisionTag = dashIndex > -1 ? originalDivisionName.substring(0, dashIndex).trim() : '';
    const cleanedName = dashIndex > -1 ? originalDivisionName.substring(dashIndex + 3).trim() : originalDivisionName;
    const displayName = division.customTitle || cleanedName || 'Unknown Division';

    const getAssociationBadges = () => {
        if (!pbbDiscipline || !formData) return [];

        const badges = [];
        const nsbaDualApprovedWith = formData.nsbaDualApprovedWith || [];

        if (pbbDiscipline.name) {
            badges.push(<Badge key="discipline-badge" variant="discipline" className="text-xs">{pbbDiscipline.name}</Badge>);
        }

        const assoc = associationsData.find(a => a.id === division.assocId);
        if (assoc) {
            badges.push(<Badge key={division.assocId} variant={assoc?.color || 'secondary'} className="text-xs">{assoc.abbreviation || assoc.name}</Badge>);

            if (pbbDiscipline.isDualApproved && nsbaDualApprovedWith.includes(division.assocId)) {
                badges.push(<Badge key={`${division.assocId}-da`} variant="dualApproved" className="text-xs">NSBA Dual-Approved</Badge>);
            }
        }

        if (pbbDiscipline.isNsbaStandalone && division.assocId === 'NSBA') {
            badges.push(<Badge key="nsba-standalone" variant="standalone" className="text-xs">NSBA Standalone</Badge>);
        }

        return badges;
    };


    return (
        <div ref={setNodeRef} style={style} className="relative p-1.5 pr-2 border rounded-md bg-background/70 text-xs flex items-center touch-none w-full group">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 mr-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            {isEditing ? (
                <div className="flex-grow flex items-center gap-1">
                    <Input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="h-6 text-xs"
                        autoFocus
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleTitleSave}><Save className="h-3 w-3" /></Button>
                </div>
            ) : (
                <span className="truncate flex-grow">{displayName}</span>
            )}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(true)}><Edit className="h-3 w-3" /></Button>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6"><CalendarIcon className="h-3 w-3" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={division.date ? parseLocalDate(division.date) : null}
                            onSelect={handleDateSelect}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex items-center gap-1 ml-2">
                {divisionTag && (
                    <Badge variant="outline" className="text-xs">
                        {divisionTag}
                    </Badge>
                )}

                {division.date && (
                    <Badge variant="outline" className="flex items-center gap-1 border-info bg-info/10 text-info-foreground text-xs p-1 h-auto font-normal">
                        <CalendarIcon className="h-3 w-3" />
                        {format(parseLocalDate(division.date), 'EEE, MMM d')}
                        <button onClick={handleRemoveDate} className="ml-1 rounded-full hover:bg-muted-foreground/20"><X className="h-3 w-3" /></button>
                    </Badge>
                )}
                {getAssociationBadges()}
            </div>
        </div>
    );
};


const DropZoneGroup = ({ group, index, pbbDiscipline, handleGroupFieldChange, handleRemovePatternGroup, handleAiAssistClick, setFormData, formData, associationsData }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: group.id,
        data: {
            type: 'group',
        }
    });
    const { attributes, listeners, setNodeRef: setSortableNodeRef, transform, transition } = useSortable({
        id: group.id,
        data: {
            type: 'group',
            sortable: {
                containerId: 'groups-container'
            }
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Get current pattern selection from formData for this group
    const disciplineId = pbbDiscipline?.id;
    const currentPatternSelection = disciplineId
        ? formData?.patternSelections?.[disciplineId]?.[group.id]
        : null;
    const currentPatternId = currentPatternSelection?.patternId;
    const savedManeuversRange = currentPatternSelection?.maneuversRange || '';

    // State for database patterns - initialize from saved data
    const [dbPatterns, setDbPatterns] = useState([]);
    const [loadingPatterns, setLoadingPatterns] = useState(false);
    // const [selectedManeuversRange, setSelectedManeuversRange] = useState(savedManeuversRange); // Removed
    const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
    const [patternManeuvers, setPatternManeuvers] = useState([]);
    const [patternImage, setPatternImage] = useState(null);
    const [filteredPatterns, setFilteredPatterns] = useState([]);
    const [imageZoom, setImageZoom] = useState(1);
    const [hoveredPatternId, setHoveredPatternId] = useState(null);
    const [hoveredPatternImage, setHoveredPatternImage] = useState(null);
    const [loadingHoveredImage, setLoadingHoveredImage] = useState(false);
    const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

    // Inject CSS to fix pattern select truncation on iOS/iPad
    useEffect(() => {
        const styleId = 'pattern-select-fix';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .pattern-select-trigger > span {
                    display: block !important;
                    overflow: visible !important;
                    text-overflow: unset !important;
                    white-space: nowrap !important;
                    -webkit-line-clamp: unset !important;
                    line-clamp: unset !important;
                    max-height: none !important;
                    -webkit-box-orient: unset !important;
                }
            `;
            document.head.appendChild(style);
        }
        return () => {
            // Cleanup on unmount (optional, style can stay for other instances)
        };
    }, []);

    // Get association name from discipline or divisions
    const getAssociationName = () => {
        // Try to get from discipline's association_id first
        if (pbbDiscipline?.association_id) {
            const assoc = associationsData?.find(a => a.id === pbbDiscipline.association_id);
            if (assoc) return assoc.name || assoc.abbreviation;
        }
        // Fallback: get from first division's assocId
        if (group.divisions?.length > 0) {
            const firstDivAssocId = group.divisions[0].assocId;
            const assoc = associationsData?.find(a => a.id === firstDivAssocId);
            if (assoc) return assoc.name || assoc.abbreviation;
        }
        return null;
    };

    const associationName = getAssociationName();

    // Fetch patterns from tbl_patterns based on discipline name AND association
    useEffect(() => {
        const fetchPatterns = async () => {
            if (!pbbDiscipline?.name) return;
            setLoadingPatterns(true);
            try {
                // Use exact match (case-insensitive) to avoid matching substrings
                // For example, "Reining" should not match "Ranch Reining"
                let query = supabase
                    .from('tbl_patterns')
                    .select('id, pdf_file_name, maneuvers_range, pattern_version, discipline, association_name')
                    .ilike('discipline', pbbDiscipline.name);
                
                // Filter by association if available
                if (associationName) {
                    query = query.ilike('association_name', `%${associationName}%`);
                }
                
                const { data, error } = await query;
                
                if (error) throw error;
                setDbPatterns(data || []);
            } catch (err) {
                console.error('Error fetching patterns:', err);
                setDbPatterns([]);
            } finally {
                setLoadingPatterns(false);
            }
        };
        fetchPatterns();
    }, [pbbDiscipline?.name, associationName]);

    // Filter patterns based on difficulty
    useEffect(() => {
        if (dbPatterns.length > 0) {
            let filtered = dbPatterns;
            // Apply difficulty filter
            // Apply difficulty filter
            if (selectedDifficulty && selectedDifficulty !== 'ALL') {
                filtered = filtered.filter(p => p.pattern_version === selectedDifficulty);
            }
            // Sort nicely
            filtered.sort((a, b) => {
                 const nameA = a.pdf_file_name?.trim() || '';
                 const nameB = b.pdf_file_name?.trim() || '';
                 return nameA.localeCompare(nameB, undefined, { numeric: true });
            });
            setFilteredPatterns(filtered);
        } else {
            setFilteredPatterns([]);
        }
    }, [selectedDifficulty, dbPatterns]);

  // Fetch maneuvers and image when pattern is selected
  useEffect(() => {
    const fetchPatternDetails = async () => {
      if (!currentPatternId) {
        setPatternManeuvers([]);
        setPatternImage(null);
        setImageZoom(1); // Reset zoom when no pattern selected
        return;
      }
      // Reset zoom when pattern changes
      setImageZoom(1);
            try {
                // Fetch maneuvers
                const { data: maneuversData, error: maneuversError } = await supabase
                    .from('tbl_maneuvers')
                    .select('step_no, instruction')
                    .eq('pattern_id', currentPatternId)
                    .order('step_no');
                
                if (maneuversError) throw maneuversError;
                setPatternManeuvers(maneuversData || []);

                // Fetch image
                const { data: imageData, error: imageError } = await supabase
                    .from('tbl_pattern_media')
                    .select('image_url')
                    .eq('pattern_id', currentPatternId)
                    .maybeSingle();
                
                if (imageError) console.error('Error fetching pattern image:', imageError);
                setPatternImage(imageData?.image_url || null);

            } catch (err) {
                console.error('Error fetching pattern details:', err);
                setPatternManeuvers([]);
                setPatternImage(null);
            }
        };
        fetchPatternDetails();
    }, [currentPatternId]);

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


    const divisionsWithDetails = group.divisions.map(div => {
        const id = div.id || `${div.assocId}-${div.division}`;
        const date = (pbbDiscipline.divisionDates && pbbDiscipline.divisionDates[id]) || null;
        const customTitle = (pbbDiscipline.divisionPrintTitles && pbbDiscipline.divisionPrintTitles[id]) || null;
        return { ...div, id, date, customTitle };
    });

    const handlePatternSelect = (patternId) => {
        if (!disciplineId || !setFormData) return;
        const selectedPattern = filteredPatterns.find(p => p.id.toString() === patternId);
        setFormData(prev => {
            const newSelections = { ...(prev.patternSelections || {}) };
            if (!newSelections[disciplineId]) newSelections[disciplineId] = {};
            newSelections[disciplineId][group.id] = {
                maneuversRange: selectedPattern?.maneuvers_range || '', // Use range from the pattern itself
                patternId: parseInt(patternId),
                patternName: selectedPattern?.pdf_file_name?.trim() || `Pattern ${patternId}`,
                version: selectedPattern?.pattern_version || 'ALL'
            };
            return { ...prev, patternSelections: newSelections };
        });
    };

    const handleDeleteClick = () => {
        // If there is a pattern selected, just clear the pattern
        if (currentPatternSelection?.patternId || currentPatternSelection?.maneuversRange) {
                setFormData(prev => {
                    const newSelections = { ...(prev.patternSelections || {}) };
                    if (newSelections[disciplineId]) {
                         if (newSelections[disciplineId][group.id]) {
                            // Clear the selection for this group
                            newSelections[disciplineId][group.id] = null;
                         }
                    }
                    return { ...prev, patternSelections: newSelections };
                });
                // Also reset local states
                // setSelectedManeuversRange(''); // Removed
                setFilteredPatterns([]);
                setPatternManeuvers([]);
                setSelectedDifficulty('ALL');
            }
            handleRemovePatternGroup(pbbDiscipline.id, group.id);
    };

    const hasPattern = currentPatternSelection?.patternId;
    // displayName is used for the pattern badge display, not for the group name input
    const displayName = hasPattern 
        ? currentPatternSelection.patternName || `Pattern ${currentPatternSelection.patternId}`
        : group.name;

    return (
        <div ref={setSortableNodeRef} style={style} className="p-4 border border-border rounded-lg bg-card shadow-sm">
            <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 shrink-0">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                        <Input
                            value={group.name}
                            onChange={(e) => handleGroupFieldChange(pbbDiscipline.id, group.id, 'name', e.target.value)}
                            className="font-semibold h-9"
                            disabled={hasPattern}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleAiAssistClick()}><Sparkles className="h-4 w-4 text-primary" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleDeleteClick}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            </div>

            {/* Pattern Selection Panel - DB-driven */}
            {group.divisions.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
                    <Label className="text-sm font-medium mb-2 block">Pattern Selection</Label>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                        {/* Pattern Selection Dropdown (1st) */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Select Pattern</Label>
                            <Select 
                                value={currentPatternSelection?.patternId?.toString() || ''}
                                onValueChange={(patternId) => {
                                    // Hide preview when pattern is selected
                                    setHoveredPatternId(null);
                                    // Find the selected pattern from filtered patterns and auto-set difficulty
                                    const selectedPattern = filteredPatterns.find(p => p.id.toString() === patternId) || dbPatterns.find(p => p.id.toString() === patternId);
                                    if (selectedPattern?.pattern_version) {
                                        setSelectedDifficulty(selectedPattern.pattern_version);
                                    }
                                    handlePatternSelect(patternId);
                                }}
                            >
                                <SelectTrigger className="mt-1 h-9 pattern-select-trigger">
                                    <SelectValue placeholder={loadingPatterns ? "Loading..." : "Select pattern..."}>
                                        {currentPatternSelection?.patternId ? (() => {
                                            const selectedPattern = filteredPatterns.find(p => p.id.toString() === currentPatternSelection.patternId.toString()) || dbPatterns.find(p => p.id.toString() === currentPatternSelection.patternId.toString());
                                            if (selectedPattern) {
                                                const fileName = selectedPattern.pdf_file_name?.trim() || '';
                                                const match = fileName.match(/(\d+)(?:\..*)?$/);
                                                const patternNum = match ? parseInt(match[1], 10) : selectedPattern.id;
                                                return `Pattern ${patternNum}`;
                                            }
                                            return `Pattern ${currentPatternSelection.patternId}`;
                                        })() : null}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent 
                                    onMouseLeave={() => {
                                        setHoveredPatternId(null);
                                    }}
                                >
                                    {filteredPatterns.length > 0 ? (
                                        filteredPatterns.map((pattern) => (
                                            <SelectItem 
                                                key={pattern.id}
                                                value={pattern.id.toString()}
                                                onMouseEnter={(e) => {
                                                    setHoveredPatternId(pattern.id);
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setHoverPosition({ x: rect.right, y: rect.top });
                                                }}
                                                onMouseLeave={() => {
                                                    setHoveredPatternId(null);
                                                }}
                                            >
                                                <div className="flex items-center gap-2 w-full">
                                                    <span>{(() => {
                                                        // Extract pattern number from pdf_file_name (e.g., "WesternRiding0001" → "1", "WesternRiding0001.L1" → "1")
                                                        const fileName = pattern.pdf_file_name?.trim() || '';
                                                        // Match trailing digits before optional dot/extension
                                                        const match = fileName.match(/(\d+)(?:\..*)?$/);
                                                        const patternNum = match ? parseInt(match[1], 10) : pattern.id;
                                                        return `Pattern ${patternNum}`;
                                                    })()}</span>
                                                    {pattern.pattern_version && (
                                                        <Badge variant="outline" className="text-xs">{pattern.pattern_version}</Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>
                                            {loadingPatterns ? "Loading..." : "No patterns found"}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {/* Hover Preview - Rendered via portal at body level */}
                            {hoveredPatternId && typeof document !== 'undefined' && createPortal(
                                <div
                                    className="fixed z-[9999] bg-background border rounded-lg shadow-lg p-3 w-[500px] pointer-events-auto"
                                    style={{
                                        left: `${hoverPosition.x + 10}px`,
                                        top: `${hoverPosition.y}px`,
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
                                                    className="w-full h-auto object-contain max-h-[450px]"
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
                        
                        {/* Difficulty Dropdown (2nd - auto-set when pattern selected) */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Select Difficulty</Label>
                            <Select 
                                value={selectedDifficulty}
                                onValueChange={setSelectedDifficulty}
                            >
                                <SelectTrigger className="mt-1 h-9">
                                    <SelectValue placeholder="Select difficulty..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {PATTERN_VERSIONS.map(version => (
                                        <SelectItem key={version.id} value={version.id}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${version.dotColor}`} />
                                                <span>{version.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {hasPattern && (
                        <div className="mt-2 flex items-center gap-2">
                            <Badge
                                variant="secondary"
                                className="flex items-center gap-2 pr-1 h-7 hover:text-primary-foreground hover:bg-primary transition-colors"
                            >
                                {displayName}
                                <HoverCard openDelay={100} closeDelay={100}>
                                    <HoverCardTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-background/20 ml-1">
                                            <Eye className="h-3 w-3" />
                                        </Button>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-96" align="start">
                                        <div className="space-y-3">
                                            <h4 className="font-medium leading-none border-b pb-2">Pattern Details</h4>
                                            
                                            {/* Pattern Image with Nested Hover for Larger View */}
                                            {patternImage && (
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
                                                    !patternImage && <p>No details available for this pattern.</p>
                                                )}
                                            </div>
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                            </Badge>
                        </div>
                    )}
                </div>
            )}

            <div ref={setNodeRef} className={cn('min-h-[80px] p-3 rounded-md bg-muted/30 transition-colors border-2 border-dashed border-border', { 'border-primary bg-primary/10': isOver })}>
                <SortableContext items={divisionsWithDetails.map(d => d.id)} strategy={verticalListSortingStrategy} id={group.id}>
                    <div className="space-y-2">
                        {divisionsWithDetails.map(div => (
                            <SortableDivisionItem key={div.id} division={div} pbbDiscipline={pbbDiscipline} setFormData={setFormData} formData={formData} associationsData={associationsData} groupId={group.id} />
                        ))}
                    </div>
                </SortableContext>
                {group.divisions.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-6">
                        Drop divisions here
                    </div>
                )}
            </div>
        </div>
    );
};

export default DropZoneGroup;