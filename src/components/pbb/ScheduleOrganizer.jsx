import React, { useState, useMemo } from 'react';
    import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
    import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
    import { CSS } from '@dnd-kit/utilities';
    import { GripVertical, Calendar as CalendarIcon, Pencil, Check, X } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Badge } from '@/components/ui/badge';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Label } from '@/components/ui/label';
    import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
    import { Calendar } from '@/components/ui/calendar';
    import { format } from 'date-fns';
    import { ScrollArea } from '@/components/ui/scroll-area';
    import { parseLocalDate } from '@/lib/utils';

    const SortableDivisionItem = ({ 
        divisionIdentifier, 
        onSelectionChange, 
        isSelected, 
        date, 
        customTitle,
        onTitleChange,
        onDateClear,
        formData,
        pbbDiscipline,
        associationsData,
    }) => {
        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: divisionIdentifier });
        const style = { transform: CSS.Transform.toString(transform), transition };
        const [isEditing, setIsEditing] = useState(false);
        const [title, setTitle] = useState(customTitle || '');

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

    const handleTitleSave = () => {
        onTitleChange(divisionIdentifier, title);
        setIsEditing(false);
    };
    
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
            {isEditing ? (
                <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    placeholder={customTitle || divisionName}
                    className="h-8"
                    autoFocus
                />
            ) : (
                <Label htmlFor={`select-${divisionIdentifier}`} className="font-normal">
                    {customTitle || divisionName}
                </Label>
            )}
        </div>
        {divisionTag && (
            <Badge variant="outline" className="text-xs rounded-full px-2">
                {divisionTag}
            </Badge>
        )}
                {date && (
                    <Badge variant="outline" className="flex items-center gap-1 border-info bg-info/10 text-info-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        {format(parseLocalDate(date), 'EEE, MMM d')}
                        <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={() => onDateClear(divisionIdentifier)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                )}
                <div className="flex items-center gap-1 ml-auto">
                    {getAssociationBadges()}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => isEditing ? handleTitleSave() : setIsEditing(true)}>
                    {isEditing ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Pencil className="h-3.5 w-3.5" />}
                </Button>
            </div>
        );
    };

    export const ScheduleOrganizer = ({ pbbDiscipline, allDisciplines = [], setFormData, formData, associationsData }) => {
        const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
        const [selectedDivisions, setSelectedDivisions] = useState([]);
        const [dateForPopover, setDateForPopover] = useState(null);

        // Use allDisciplines if provided, otherwise use single discipline
        const disciplinesToUse = allDisciplines.length > 0 ? allDisciplines : [pbbDiscipline];

        const divisionsWithData = useMemo(() => {
            const allDivisions = [];
            disciplinesToUse.forEach(disc => {
                if (!disc) return;
                (disc.divisionOrder || []).forEach(divId => {
                    allDivisions.push({
                        id: divId,
                        date: (disc.divisionDates && disc.divisionDates[divId]) || null,
                        customTitle: (disc.divisionPrintTitles && disc.divisionPrintTitles[divId]) || '',
                        disciplineId: disc.id,
                        discipline: disc
                    });
                });
            });
            return allDivisions;
        }, [disciplinesToUse]);

        const groupedDivisions = useMemo(() => {
            const groups = divisionsWithData.reduce((acc, division) => {
                const dateKey = division.date || 'Unscheduled';
                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }
                acc[dateKey].push(division);
                return acc;
            }, {});

            const sortedKeys = Object.keys(groups).sort((a, b) => {
                if (a === 'Unscheduled') return 1;
                if (b === 'Unscheduled') return -1;
                return parseLocalDate(a) - parseLocalDate(b);
            });

            const finalGroups = {};
            sortedKeys.forEach(key => {
                finalGroups[key] = groups[key];
            });
            return finalGroups;
        }, [divisionsWithData]);

        if (disciplinesToUse.length === 0 || !disciplinesToUse[0]) {
            return <div className="text-center p-4">Loading discipline data...</div>;
        }

        // Build a map of division ID to discipline ID for quick lookups
        const divisionToDisciplineMap = useMemo(() => {
            const map = {};
            divisionsWithData.forEach(div => {
                map[div.id] = div.disciplineId;
            });
            return map;
        }, [divisionsWithData]);

        const handleDragEnd = (event) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            
            // Find which discipline each division belongs to
            const activeDisciplineId = divisionToDisciplineMap[active.id];
            const overDisciplineId = divisionToDisciplineMap[over.id];
            
            // Only allow reordering within the same discipline
            if (activeDisciplineId !== overDisciplineId) return;
            
            setFormData(prev => {
                const newDisciplines = prev.disciplines.map(disc => {
                    if (disc.id === activeDisciplineId) {
                        const oldIndex = disc.divisionOrder.findIndex(id => id === active.id);
                        const newIndex = disc.divisionOrder.findIndex(id => id === over.id);
                        if (oldIndex === -1 || newIndex === -1) return disc;
                        const newDivisionOrder = arrayMove(disc.divisionOrder, oldIndex, newIndex);
                        return { ...disc, divisionOrder: newDivisionOrder };
                    }
                    return disc;
                });
                return { ...prev, disciplines: newDisciplines };
            });
        };

        const handleSelectionChange = (divisionId, isChecked) => {
            setSelectedDivisions(prev => isChecked ? [...prev, divisionId] : prev.filter(id => id !== divisionId));
        };
        
        const handleApplyDateToSelected = (date) => {
            if (!date || selectedDivisions.length === 0) return;
            const dateString = format(date, 'yyyy-MM-dd');

            setFormData(prev => {
                const newDisciplines = prev.disciplines.map(disc => {
                    // Check if any selected divisions belong to this discipline
                    const divisionsForThisDisc = selectedDivisions.filter(divId => divisionToDisciplineMap[divId] === disc.id);
                    if (divisionsForThisDisc.length === 0) return disc;
                    
                    const newDivisionDates = { ...(disc.divisionDates || {}) };
                    divisionsForThisDisc.forEach(divId => {
                        newDivisionDates[divId] = dateString;
                    });
                    return { ...disc, divisionDates: newDivisionDates };
                });
                return { ...prev, disciplines: newDisciplines };
            });
            setSelectedDivisions([]);
        };
        
        const handleDateClear = (divisionId) => {
            const disciplineId = divisionToDisciplineMap[divisionId];
            setFormData(prev => ({
                ...prev,
                disciplines: prev.disciplines.map(disc => {
                    if (disc.id === disciplineId) {
                        const newDivisionDates = { ...(disc.divisionDates || {}) };
                        delete newDivisionDates[divisionId];
                        return { ...disc, divisionDates: newDivisionDates };
                    }
                    return disc;
                })
            }));
        };

        const handlePrintTitleChange = (divisionId, newTitle) => {
            const disciplineId = divisionToDisciplineMap[divisionId];
            setFormData(prev => ({
                ...prev,
                disciplines: prev.disciplines.map(disc => {
                    if (disc.id === disciplineId) {
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
            // Apply to all disciplines in the group
            setFormData(prev => ({
                ...prev,
                disciplines: prev.disciplines.map(disc => {
                    if (disciplinesToUse.some(d => d.id === disc.id)) {
                        return { ...disc, printTitle: newTitle };
                    }
                    return disc;
                })
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
                    Organize the general class schedule. Drag to reorder, and click the pencil to rename individual classes. Select classes to apply a date.
                </p>

                <div className="p-3 border rounded-lg bg-background space-y-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id={`select-all-merged`} checked={areAllSelected} onCheckedChange={toggleSelectAll} />
                                <Label htmlFor={`select-all-merged`} className="text-sm font-medium">Select All</Label>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <Popover onOpenChange={(open) => {
                                if (open && selectedDivisions.length > 0) {
                                    // When popover opens, set the calendar to show the first selected division's date
                                    const firstSelectedDiv = divisionsWithData.find(d => d.id === selectedDivisions[0]);
                                    if (firstSelectedDiv?.date) {
                                        setDateForPopover(new Date(firstSelectedDiv.date));
                                    } else {
                                        setDateForPopover(null);
                                    }
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={selectedDivisions.length === 0}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        Apply Date to Selected ({selectedDivisions.length})
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dateForPopover}
                                        onSelect={(newDate) => {
                                            setDateForPopover(newDate);
                                            handleApplyDateToSelected(newDate);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {formData?.showName && (
                                <div className="text-xs font-medium text-muted-foreground">
                                    Horse Show: {formData.showName}
                                </div>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="h-60">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={divisionsWithData.map(d => d.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2 pr-3">
                                     {Object.entries(groupedDivisions).map(([dateKey, divisions]) => (
                                        <div key={dateKey}>
                                            <h4 className="font-semibold text-xs mb-1.5 pb-1 border-b">
                                                {dateKey === 'Unscheduled' ? 'Unscheduled' : format(parseLocalDate(dateKey), 'EEEE, MMMM d, yyyy')}
                                            </h4>
                                            <div className="space-y-1.5">
                                                {divisions.map(({ id, date, customTitle }) => (
                                                    <SortableDivisionItem
                                                        key={id}
                                                        divisionIdentifier={id}
                                                        isSelected={selectedDivisions.includes(id)}
                                                        onSelectionChange={handleSelectionChange}
                                                        date={date}
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
                    </ScrollArea>
                </div>
            </div>
        );
    };