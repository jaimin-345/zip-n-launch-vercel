import React, { useState, useMemo } from 'react';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar as CalendarIcon, X, Trophy, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { parseLocalDate, cn } from '@/lib/utils';

const SortableDivisionItem = ({ 
    divisionIdentifier, 
    onSelectionChange, 
    isSelected, 
    prelimsDate,
    finalsDate,
    customTitle,
    onTitleChange,
    onDateClear,
    formData,
    pbbDiscipline,
    associationsData,
}) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: divisionIdentifier });
    const style = { transform: CSS.Transform.toString(transform), transition };

    const [assocId, ...divisionParts] = divisionIdentifier.split('-');
    const originalDivisionName = divisionParts.join('-');

    // Parse division name to extract tag and name
    const parseDivisionDisplay = (divName) => {
        const cleanName = divName.startsWith('custom-') ? divName.substring(7) : divName;
        const parts = cleanName.split(' - ');
        if (parts.length === 2) {
            return { tag: parts[0], name: parts[1] };
        }
        return { tag: null, name: cleanName };
    };

    const { tag: divisionTag, name: divisionName } = parseDivisionDisplay(originalDivisionName);
    
    const getAssociationBadges = () => {
        if (!pbbDiscipline || !formData) return [];
        
        const badges = [];
        const nsbaDualApprovedWith = formData.nsbaDualApprovedWith || [];

        // Add Discipline Badge first
        if (pbbDiscipline.name) {
            badges.push(<Badge key="discipline-badge" variant="outline" className="text-xs bg-gray-100 dark:bg-gray-800">{pbbDiscipline.name}</Badge>);
        }
        
        const assoc = associationsData.find(a => a.id === assocId);
        if (assoc) {
            badges.push(<Badge key={assocId} variant={assoc?.color || 'secondary'} className="text-xs">{assoc.abbreviation || assoc.name}</Badge>);
            
            if (pbbDiscipline.isDualApproved && nsbaDualApprovedWith.includes(assocId)) {
                badges.push(<Badge key={`${assocId}-da`} variant="dualApproved" className="text-xs">NSBA Dual-Approved</Badge>);
            }
        }

        if (pbbDiscipline.isNsbaStandalone && assocId === 'NSBA') {
            badges.push(<Badge key="nsba-standalone" variant="standalone" className="text-xs">NSBA Standalone</Badge>);
        }

        return badges;
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-1.5 bg-background rounded-lg border shadow-sm touch-none">
            <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing h-7 w-7">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Checkbox id={`select-${divisionIdentifier}`} checked={isSelected} onCheckedChange={(checked) => onSelectionChange(divisionIdentifier, checked)} />
            <div className="flex-grow text-sm">
                <Label htmlFor={`select-${divisionIdentifier}`} className="font-normal">
                    {customTitle || divisionName}
                </Label>
            </div>
            {divisionTag && (
                <Badge variant="outline" className="text-xs rounded-full px-2">
                    {divisionTag}
                </Badge>
            )}
            
            {/* Prelims Date Badge */}
            {prelimsDate && (
                <Badge variant="outline" className="flex items-center gap-1 border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <Flag className="h-3 w-3" />
                    <span className="font-semibold text-[10px] uppercase">Prelims</span>
                    <span className="text-xs">{format(parseLocalDate(prelimsDate), 'EEE, MMM d')}</span>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:bg-amber-500/20" onClick={() => onDateClear(divisionIdentifier, 'prelims')}>
                        <X className="h-3 w-3" />
                    </Button>
                </Badge>
            )}
            
            {/* Finals Date Badge */}
            {finalsDate && (
                <Badge variant="outline" className="flex items-center gap-1 border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <Trophy className="h-3 w-3" />
                    <span className="font-semibold text-[10px] uppercase">Finals</span>
                    <span className="text-xs">{format(parseLocalDate(finalsDate), 'EEE, MMM d')}</span>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:bg-emerald-500/20" onClick={() => onDateClear(divisionIdentifier, 'finals')}>
                        <X className="h-3 w-3" />
                    </Button>
                </Badge>
            )}
            
            <div className="flex items-center gap-1 ml-auto">
                {getAssociationBadges()}
            </div>
        </div>
    );
};

export const ScheduleOrganizer = ({ pbbDiscipline, setFormData, formData, associationsData }) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const [selectedDivisions, setSelectedDivisions] = useState([]);
    const [prelimsDateForPopover, setPrelimsDateForPopover] = useState(null);
    const [finalsDateForPopover, setFinalsDateForPopover] = useState(null);

    const divisionsWithData = useMemo(() => {
        if (!pbbDiscipline) return [];
        return (pbbDiscipline.divisionOrder || []).map(divId => ({
            id: divId,
            prelimsDate: (pbbDiscipline.divisionPrelimsDates && pbbDiscipline.divisionPrelimsDates[divId]) || null,
            finalsDate: (pbbDiscipline.divisionFinalsDates && pbbDiscipline.divisionFinalsDates[divId]) || null,
            // Keep legacy support for old date format
            legacyDate: (pbbDiscipline.divisionDates && pbbDiscipline.divisionDates[divId]) || null,
            customTitle: (pbbDiscipline.divisionPrintTitles && pbbDiscipline.divisionPrintTitles[divId]) || ''
        }));
    }, [pbbDiscipline]);

    // Group divisions by their scheduling status
    const groupedDivisions = useMemo(() => {
        const groups = {
            'Unscheduled': [],
            'Scheduled': []
        };
        
        divisionsWithData.forEach(division => {
            const hasAnyDate = division.prelimsDate || division.finalsDate || division.legacyDate;
            if (hasAnyDate) {
                groups['Scheduled'].push(division);
            } else {
                groups['Unscheduled'].push(division);
            }
        });
        
        // Remove empty groups
        if (groups['Unscheduled'].length === 0) delete groups['Unscheduled'];
        if (groups['Scheduled'].length === 0) delete groups['Scheduled'];
        
        return groups;
    }, [divisionsWithData]);

    if (!pbbDiscipline) {
        return <div className="text-center p-4">Loading discipline data...</div>;
    }

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setFormData(prev => {
                const newDisciplines = prev.disciplines.map(disc => {
                    if (disc.id === pbbDiscipline.id) {
                        const oldIndex = disc.divisionOrder.findIndex(id => id === active.id);
                        const newIndex = disc.divisionOrder.findIndex(id => id === over.id);
                        const newDivisionOrder = arrayMove(disc.divisionOrder, oldIndex, newIndex);
                        return { ...disc, divisionOrder: newDivisionOrder };
                    }
                    return disc;
                });
                return { ...prev, disciplines: newDisciplines };
            });
        }
    };

    const handleSelectionChange = (divisionId, isChecked) => {
        setSelectedDivisions(prev => isChecked ? [...prev, divisionId] : prev.filter(id => id !== divisionId));
    };
    
    const handleApplyPrelimsDate = (date) => {
        if (!date || selectedDivisions.length === 0) return;
        const dateString = format(date, 'yyyy-MM-dd');

        setFormData(prev => {
            const newDisciplines = prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newDivisionPrelimsDates = { ...(disc.divisionPrelimsDates || {}) };
                    selectedDivisions.forEach(divId => {
                        newDivisionPrelimsDates[divId] = dateString;
                    });
                    return { ...disc, divisionPrelimsDates: newDivisionPrelimsDates };
                }
                return disc;
            });
            return { ...prev, disciplines: newDisciplines };
        });
        setSelectedDivisions([]);
    };

    const handleApplyFinalsDate = (date) => {
        if (!date || selectedDivisions.length === 0) return;
        const dateString = format(date, 'yyyy-MM-dd');

        setFormData(prev => {
            const newDisciplines = prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newDivisionFinalsDates = { ...(disc.divisionFinalsDates || {}) };
                    selectedDivisions.forEach(divId => {
                        newDivisionFinalsDates[divId] = dateString;
                    });
                    return { ...disc, divisionFinalsDates: newDivisionFinalsDates };
                }
                return disc;
            });
            return { ...prev, disciplines: newDisciplines };
        });
        setSelectedDivisions([]);
    };
    
    const handleDateClear = (divisionId, dateType) => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    if (dateType === 'prelims') {
                        const newDivisionPrelimsDates = { ...(disc.divisionPrelimsDates || {}) };
                        delete newDivisionPrelimsDates[divisionId];
                        return { ...disc, divisionPrelimsDates: newDivisionPrelimsDates };
                    } else if (dateType === 'finals') {
                        const newDivisionFinalsDates = { ...(disc.divisionFinalsDates || {}) };
                        delete newDivisionFinalsDates[divisionId];
                        return { ...disc, divisionFinalsDates: newDivisionFinalsDates };
                    }
                }
                return disc;
            })
        }));
    };

    const handlePrintTitleChange = (divisionId, newTitle) => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newDivisionPrintTitles = { ...(disc.divisionPrintTitles || {}) };
                    if (newTitle) {
                        newDivisionPrintTitles[divisionId] = newTitle;
                    } else {
                        delete newDivisionPrintTitles[divisionId];
                    }
                    return { ...disc, divisionPrintTitles: newDivisionPrintTitles };
                }
                return disc;
            })
        }));
    };
    
    const handleOverallPrintTitleChange = (e) => {
        const newTitle = e.target.value;
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => 
                disc.id === pbbDiscipline.id ? { ...disc, printTitle: newTitle } : disc
            )
        }));
    };

    const areAllSelected = divisionsWithData.length > 0 && selectedDivisions.length === divisionsWithData.length;

    const toggleSelectAll = (checked) => {
        if (checked) {
            setSelectedDivisions(divisionsWithData.map(d => d.id));
        } else {
            setSelectedDivisions([]);
        }
    };

    return (
        <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
                Organize the general class schedule. Drag to reorder. Select classes to apply Prelims or Finals dates.
            </p>

            <div className="p-3 border rounded-lg bg-background space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id={`select-all-${pbbDiscipline.id}`} checked={areAllSelected} onCheckedChange={toggleSelectAll} />
                            <Label htmlFor={`select-all-${pbbDiscipline.id}`} className="text-sm font-medium">Select All</Label>
                        </div>
                    </div>
                    
                    {/* Date Selection Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Prelims Date Picker */}
                        <Popover onOpenChange={(open) => {
                            if (open && selectedDivisions.length > 0) {
                                const firstSelectedDiv = divisionsWithData.find(d => d.id === selectedDivisions[0]);
                                if (firstSelectedDiv?.prelimsDate) {
                                    setPrelimsDateForPopover(parseLocalDate(firstSelectedDiv.prelimsDate));
                                } else {
                                    setPrelimsDateForPopover(null);
                                }
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={selectedDivisions.length === 0}
                                    className="border-amber-500 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                                >
                                    <Flag className="mr-2 h-4 w-4" />
                                    Set Prelims ({selectedDivisions.length})
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <div className="p-2 border-b bg-amber-500/10">
                                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                        <Flag className="h-3 w-3" />
                                        Select Prelims Date
                                    </p>
                                </div>
                                <Calendar
                                    mode="single"
                                    selected={prelimsDateForPopover}
                                    onSelect={(newDate) => {
                                        setPrelimsDateForPopover(newDate);
                                        handleApplyPrelimsDate(newDate);
                                    }}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                />
                            </PopoverContent>
                        </Popover>

                        {/* Finals Date Picker */}
                        <Popover onOpenChange={(open) => {
                            if (open && selectedDivisions.length > 0) {
                                const firstSelectedDiv = divisionsWithData.find(d => d.id === selectedDivisions[0]);
                                if (firstSelectedDiv?.finalsDate) {
                                    setFinalsDateForPopover(parseLocalDate(firstSelectedDiv.finalsDate));
                                } else {
                                    setFinalsDateForPopover(null);
                                }
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={selectedDivisions.length === 0}
                                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                                >
                                    <Trophy className="mr-2 h-4 w-4" />
                                    Set Finals ({selectedDivisions.length})
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <div className="p-2 border-b bg-emerald-500/10">
                                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                        <Trophy className="h-3 w-3" />
                                        Select Finals Date
                                    </p>
                                </div>
                                <Calendar
                                    mode="single"
                                    selected={finalsDateForPopover}
                                    onSelect={(newDate) => {
                                        setFinalsDateForPopover(newDate);
                                        handleApplyFinalsDate(newDate);
                                    }}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    
                    {formData?.showName && (
                        <div className="text-xs font-medium text-muted-foreground">
                            Horse Show: {formData.showName}
                        </div>
                    )}
                </div>

                <div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={divisionsWithData.map(d => d.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                                 {Object.entries(groupedDivisions).map(([groupKey, divisions]) => (
                                    <div key={groupKey}>
                                        <h4 className="font-semibold text-xs mb-1.5 pb-1 border-b flex items-center gap-2">
                                            {groupKey === 'Unscheduled' ? (
                                                <span className="text-muted-foreground">Unscheduled</span>
                                            ) : (
                                                <span className="text-primary">Scheduled Classes</span>
                                            )}
                                            <Badge variant="secondary" className="text-xs">
                                                {divisions.length}
                                            </Badge>
                                        </h4>
                                        <div className="space-y-1.5">
                                            {divisions.map(({ id, prelimsDate, finalsDate, customTitle }) => (
                                                <SortableDivisionItem
                                                    key={id}
                                                    divisionIdentifier={id}
                                                    isSelected={selectedDivisions.includes(id)}
                                                    onSelectionChange={handleSelectionChange}
                                                    prelimsDate={prelimsDate}
                                                    finalsDate={finalsDate}
                                                    customTitle={customTitle}
                                                    onTitleChange={handlePrintTitleChange}
                                                    onDateClear={handleDateClear}
                                                    formData={formData}
                                                    pbbDiscipline={pbbDiscipline}
                                                    associationsData={associationsData}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
        </div>
    );
};
