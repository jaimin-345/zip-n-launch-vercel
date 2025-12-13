import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Edit, Calendar as CalendarIcon, X, Save, Sparkles, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';

// Pattern Sets with version categories
const PATTERN_SETS = [
  { setNumber: 1, name: 'Pattern 1-9', maneuvers: { ALL: 11, 'GR/NOV': 9 } },
  { setNumber: 2, name: 'Pattern 1-15', maneuvers: { ALL: 11, 'GR/NOV': 9 } },
  { setNumber: 3, name: 'Pattern 1-20', maneuvers: { ALL: 12, 'GR/NOV': 10 } },
];

// Pattern version categories
const PATTERN_VERSIONS = [
  { id: 'ALL', label: 'ALL (Universal)', description: 'Valid for every class', color: 'bg-blue-100 text-blue-800' },
  { id: 'GR/NOV', label: 'GR/NOV (Green/Novice)', description: 'Simplified for Green/Novice', color: 'bg-teal-100 text-teal-800' },
  { id: 'L1', label: 'L1 (Level 1)', description: 'Simplified for Level 1', color: 'bg-green-100 text-green-800' },
  { id: 'Beginner', label: 'Beginner', description: 'For beginner classes', color: 'bg-purple-100 text-purple-800' },
];

// Helper to detect group type based on division names
// Returns specific type only if ALL divisions match that type, otherwise returns 'ALL' (mixed)
const detectGroupType = (divisions) => {
  if (!divisions || divisions.length === 0) return 'ALL';
  
  const divisionNames = divisions.map(d => d.division?.toLowerCase() || '');
  
  // Check if each division belongs to a specific category
  const categoryCheck = divisionNames.map(name => {
    const isL1 = name.includes('level 1') || name.includes('l1 ') || name.match(/\bl1\b/);
    const isGreen = name.includes('green');
    const isNovice = name.includes('novice') || name.includes('rookie');
    const isBeginner = name.includes('beginner');
    const isWalkTrot = name.includes('walk-trot') || name.includes('walk trot');
    
    // L1 takes priority - if explicitly "Level 1" in name, it's L1 even if also has "Green"
    if (isL1) return 'L1';
    if (isGreen || isNovice) return 'GR/NOV';
    if (isBeginner || isWalkTrot) return 'Beginner';
    return 'standard'; // Open, Amateur, Youth without level qualifiers
  });
  
  // Get unique categories
  const uniqueCategories = [...new Set(categoryCheck)];
  
  // If all divisions are the same specific category, return that category
  if (uniqueCategories.length === 1 && uniqueCategories[0] !== 'standard') {
    return uniqueCategories[0];
  }
  
  // Mixed divisions or all standard = use ALL (universal pattern)
  return 'ALL';
};

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

    const divisionsWithDetails = group.divisions.map(div => {
        const id = div.id || `${div.assocId}-${div.division}`;
        const date = (pbbDiscipline.divisionDates && pbbDiscipline.divisionDates[id]) || null;
        const customTitle = (pbbDiscipline.divisionPrintTitles && pbbDiscipline.divisionPrintTitles[id]) || null;
        return { ...div, id, date, customTitle };
    });

    // Get current pattern selection for this group using discipline ID as key
    const disciplineId = pbbDiscipline?.id;
    const currentPatternSelection = disciplineId 
        ? formData?.patternSelections?.[disciplineId]?.[group.id] 
        : null;

    // Pattern selection handlers
    const handlePatternSetChange = (setNumber) => {
        if (!disciplineId || !setFormData) return;
        const setNum = parseInt(setNumber);
        const suggestedVersion = detectGroupType(group.divisions);
        setFormData(prev => {
            const newSelections = { ...(prev.patternSelections || {}) };
            if (!newSelections[disciplineId]) newSelections[disciplineId] = {};
            newSelections[disciplineId][group.id] = {
                setNumber: setNum,
                version: suggestedVersion,
                patternId: `pattern-${setNum}-${suggestedVersion}`
            };
            return { ...prev, patternSelections: newSelections };
        });
    };

    const handlePatternVersionChange = (version) => {
        if (!disciplineId || !setFormData) return;
        setFormData(prev => {
            const newSelections = { ...(prev.patternSelections || {}) };
            if (!newSelections[disciplineId]) newSelections[disciplineId] = {};
            const current = newSelections[disciplineId][group.id] || {};
            newSelections[disciplineId][group.id] = {
                ...current,
                version: version,
                patternId: `pattern-${current.setNumber || 1}-${version}`
            };
            return { ...prev, patternSelections: newSelections };
        });
    };

    const suggestedVersion = detectGroupType(group.divisions);
    const hasPattern = currentPatternSelection?.setNumber && currentPatternSelection?.version;
    const displayName = hasPattern 
        ? `Pattern ${currentPatternSelection.setNumber} (${currentPatternSelection.version})`
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
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleRemovePatternGroup(pbbDiscipline.id, group.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            </div>

            {/* Pattern Selection Panel - similar to Step 5 */}
            {group.divisions.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
                    <Label className="text-sm font-medium mb-2 block">Pattern Selection</Label>
                    
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                        <AlertCircle className="h-3 w-3" />
                        Suggested: <Badge variant="outline" className="text-xs">{suggestedVersion}</Badge> based on divisions
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {/* Pattern Set Dropdown */}
                        <div>
                            <Label className="text-xs text-muted-foreground">1. Pattern Set</Label>
                            <Select 
                                value={currentPatternSelection?.setNumber?.toString() || ''}
                                onValueChange={handlePatternSetChange}
                            >
                                <SelectTrigger className="mt-1 h-9">
                                    <SelectValue placeholder="Select pattern set..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {PATTERN_SETS.map(set => (
                                        <SelectItem key={set.setNumber} value={set.setNumber.toString()}>
                                            {pbbDiscipline.name} {set.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Pattern Version Dropdown */}
                        <div>
                            <Label className="text-xs text-muted-foreground">2. Pattern Version</Label>
                            <Select 
                                value={currentPatternSelection?.version || ''}
                                onValueChange={handlePatternVersionChange}
                                disabled={!currentPatternSelection?.setNumber}
                            >
                                <SelectTrigger className="mt-1 h-9">
                                    <SelectValue placeholder="Select version..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {PATTERN_VERSIONS.map(version => (
                                        <SelectItem key={version.id} value={version.id}>
                                            <div className="flex items-center gap-2">
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
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                {displayName}
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