import React, { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Edit, Calendar as CalendarIcon, X, Save, Sparkles, AlertCircle, Eye, Check, ChevronsUpDown } from 'lucide-react';
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
                let query = supabase
                    .from('tbl_patterns')
                    .select('id, pdf_file_name, maneuvers_range, pattern_version, discipline, association_name')
                    .ilike('discipline', `%${pbbDiscipline.name}%`);
                
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
                return;
            }
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
                            value={displayName}
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
                            <Label className="text-xs text-muted-foreground">1. Select Pattern</Label>
                            <Select 
                                value={currentPatternSelection?.patternId?.toString() || ''}
                                onValueChange={(patternId) => {
                                    // Find the selected pattern and auto-set difficulty
                                    const selectedPattern = dbPatterns.find(p => p.id.toString() === patternId);
                                    if (selectedPattern?.pattern_version) {
                                        setSelectedDifficulty(selectedPattern.pattern_version);
                                    }
                                    handlePatternSelect(patternId);
                                }}
                            >
                                <SelectTrigger className="mt-1 h-9">
                                    <SelectValue placeholder={loadingPatterns ? "Loading..." : "Select pattern..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {dbPatterns.length > 0 ? (
                                        dbPatterns.map((pattern) => (
                                            <SelectItem key={pattern.id} value={pattern.id.toString()}>
                                                <div className="flex items-center gap-2">
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
                                            No patterns found
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Difficulty Dropdown (2nd - auto-set when pattern selected) */}
                        <div>
                            <Label className="text-xs text-muted-foreground">2. Select Difficulty</Label>
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
                                            
                                            {/* Pattern Image */}
                                            {patternImage && (
                                                <div className="rounded-md overflow-hidden border bg-muted/20">
                                                    <img 
                                                        src={patternImage} 
                                                        alt="Pattern Diagram" 
                                                        className="w-full h-auto object-contain max-h-[300px]"
                                                        loading="lazy"
                                                    />
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