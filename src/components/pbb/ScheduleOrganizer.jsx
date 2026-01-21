import React, { useState, useMemo } from 'react';

    import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
    import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
    import { CSS } from '@dnd-kit/utilities';
    import { GripVertical, Calendar as CalendarIcon, X } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Badge } from '@/components/ui/badge';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Label } from '@/components/ui/label';
    import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
    import { Calendar } from '@/components/ui/calendar';
    import { format } from 'date-fns';
    import { parseLocalDate } from '@/lib/utils';

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
                {prelimsDate && (
                    <Badge variant="outline" className="flex items-center gap-1 border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        <CalendarIcon className="h-3 w-3" />
                        <span className="font-medium">Prelims:</span>
                        {format(parseLocalDate(prelimsDate), 'EEE, MMM d')}
                        <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:bg-amber-100 dark:hover:bg-amber-900/40" onClick={() => onDateClear(divisionIdentifier, 'prelims')}>
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                )}
                {finalsDate && (
                    <Badge variant="outline" className="flex items-center gap-1 border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                        <CalendarIcon className="h-3 w-3" />
                        <span className="font-medium">Finals:</span>
                        {format(parseLocalDate(finalsDate), 'EEE, MMM d')}
                        <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" onClick={() => onDateClear(divisionIdentifier, 'finals')}>
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
                customTitle: (pbbDiscipline.divisionPrintTitles && pbbDiscipline.divisionPrintTitles[divId]) || ''
            }));
        }, [pbbDiscipline]);

        const groupedDivisions = useMemo(() => {
            const groups = divisionsWithData.reduce((acc, division) => {
                // Use prelims date as primary grouping, or finals if no prelims, or 'Unscheduled'
                const dateKey = division.prelimsDate || division.finalsDate || 'Unscheduled';
                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }
                acc[dateKey].push(division);
                return acc;
            }, {});

            const sortedKeys = Object.keys(groups).sort((a, b) => {
                if (a === 'Unscheduled') return -1;
                if (b === 'Unscheduled') return 1;
                return parseLocalDate(a) - parseLocalDate(b);
            });

            const finalGroups = {};
            sortedKeys.forEach(key => {
                finalGroups[key] = groups[key];
            });
            return finalGroups;
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
                        } else {
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
                    Organize the general class schedule. Drag to reorder. Select classes to apply a date.
                </p>

                <div className="p-3 border rounded-lg bg-background space-y-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id={`select-all-${pbbDiscipline.id}`} checked={areAllSelected} onCheckedChange={toggleSelectAll} />
                                <Label htmlFor={`select-all-${pbbDiscipline.id}`} className="text-sm font-medium">Select All</Label>
                            </div>
                            <Popover onOpenChange={(open) => {
                                if (open && selectedDivisions.length > 0) {
                                    const firstSelectedDiv = divisionsWithData.find(d => d.id === selectedDivisions[0]);
                                    if (firstSelectedDiv?.prelimsDate) {
                                        setPrelimsDateForPopover(new Date(firstSelectedDiv.prelimsDate));
                                    } else {
                                        setPrelimsDateForPopover(null);
                                    }
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={selectedDivisions.length === 0}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        Prelims ({selectedDivisions.length})
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={prelimsDateForPopover}
                                        onSelect={(newDate) => {
                                            setPrelimsDateForPopover(newDate);
                                            handleApplyPrelimsDate(newDate);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Popover onOpenChange={(open) => {
                                if (open && selectedDivisions.length > 0) {
                                    const firstSelectedDiv = divisionsWithData.find(d => d.id === selectedDivisions[0]);
                                    if (firstSelectedDiv?.finalsDate) {
                                        setFinalsDateForPopover(new Date(firstSelectedDiv.finalsDate));
                                    } else {
                                        setFinalsDateForPopover(null);
                                    }
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={selectedDivisions.length === 0}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        Finals ({selectedDivisions.length})
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={finalsDateForPopover}
                                        onSelect={(newDate) => {
                                            setFinalsDateForPopover(newDate);
                                            handleApplyFinalsDate(newDate);
                                        }}
                                        initialFocus
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
                                <div className="space-y-2">
                                     {Object.entries(groupedDivisions).map(([dateKey, divisions]) => (
                                        <div key={dateKey}>
                                            <h4 className="font-semibold text-xs mb-1.5 pb-1 border-b">
                                                {dateKey === 'Unscheduled' ? 'Unscheduled' : format(parseLocalDate(dateKey), 'EEEE, MMMM d, yyyy')}
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