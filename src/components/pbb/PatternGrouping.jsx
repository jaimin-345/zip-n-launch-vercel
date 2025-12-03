import React, { useState, useMemo } from 'react';
import { PlusCircle, Move, Info, Undo2, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { DndContext, closestCenter, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useToast } from '@/components/ui/use-toast';
import { isWalkTrotDivision, cn } from '@/lib/utils';
import DraggableDivision from './DraggableDivision';
import DropZoneGroup from './DropZoneGroup';

const UNGROUPED_ID = 'ungrouped-list';

export const PatternGrouping = ({ pbbDiscipline, allDisciplines = [], setFormData, isCustomOpenShow, formData, associationsData }) => {
    const [selectedForBulkMove, setSelectedForBulkMove] = useState([]);
    const { toast } = useToast();

    // Use allDisciplines if provided, otherwise use single discipline
    const disciplinesToUse = allDisciplines.length > 0 ? allDisciplines : [pbbDiscipline];

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const { setNodeRef: setUngroupedNodeRef, isOver: isOverUngrouped } = useDroppable({ id: UNGROUPED_ID });

    const AFFECTED_CLASSES_FOR_WT_RULE = [
        "Showmanship at Halter", "Trail", "Western Horsemanship", "Hunter Hack",
        "In-Hand Trail", "Working Hunter", "Ranch Trail", "Equitation Over Fences",
        "VRH Ranch Trail", "Jumping"
    ];

    const handleAiAssistClick = () => {
        toast({
            title: "🚧 AI Verbiage Summarizer Coming Soon!",
            description: "This feature will automatically extract key maneuvers from verbiage and place them on the score sheet. Stay tuned! 🚀",
            duration: 6000,
        });
    };

    const handleAddPatternGroup = (disciplineId) => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === disciplineId) {
                    const patternGroups = disc.patternGroups || [];

                    // Maximum 5 pattern groups allowed
                    if (patternGroups.length >= 5) {
                        toast({
                            title: "Maximum Groups Reached",
                            description: "You can only create up to 5 pattern groups.",
                            variant: "destructive",
                        });
                        return disc;
                    }

                    const newGroupId = `pattern-group-${Date.now()}`;
                    const newGroup = {
                        id: newGroupId,
                        name: `Group ${patternGroups.length + 1}`,
                        divisions: [],
                        rulebookPatternId: '',
                    };
                    return { ...disc, patternGroups: [...patternGroups, newGroup] };
                }
                return disc;
            })
        }));
    };

    const handleRemovePatternGroup = (disciplineId, groupId) => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === disciplineId) {
                    const groupToRemove = disc.patternGroups.find(g => g.id === groupId);
                    if (!groupToRemove) return disc;

                    const newPatternGroups = disc.patternGroups.filter(g => g.id !== groupId);

                    return {
                        ...disc,
                        patternGroups: newPatternGroups
                    };
                }
                return disc;
            })
        }));
    };

    const handleGroupFieldChange = (disciplineId, groupId, field, value) => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === disciplineId) {
                    const newPatternGroups = (disc.patternGroups || []).map(g => g.id === groupId ? { ...g, [field]: value } : g);
                    return { ...disc, patternGroups: newPatternGroups };
                }
                return disc;
            })
        }));
    };

    const handleDragEnd = (event) => {
        const { over, active } = event;
        if (!over || !pbbDiscipline) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        const patternGroups = pbbDiscipline.patternGroups || [];

        // --- GROUP REORDERING (dragging whole Group 1, Group 2 etc.) ---
        if (activeType === 'group' && overType === 'group' && active.id !== over.id) {
            setFormData((prev) => ({
                ...prev,
                disciplines: prev.disciplines.map((disc) => {
                    if (disc.id !== pbbDiscipline.id) return disc;
                    const groups = disc.patternGroups || [];
                    const oldIndex = groups.findIndex((g) => g.id === active.id);
                    const newIndex = groups.findIndex((g) => g.id === over.id);
                    if (oldIndex === -1 || newIndex === -1) return disc;
                    return {
                        ...disc,
                        patternGroups: arrayMove(groups, oldIndex, newIndex),
                    };
                }),
            }));
            return;
        }

        // From here down we only care about division rows being dragged
        if (activeType !== 'division') return;

        const divisionToMove = active.data.current?.division;
        if (!divisionToMove) return;

        const activeContainerId = active.data.current?.sortable?.containerId;
        const overContainerId = over.data.current?.sortable?.containerId;

        // Helper: find which group (if any) a division currently belongs to
        const findGroupIdByDivisionId = (divisionId) => {
            const group = patternGroups.find((g) => g.divisions?.some((d) => d.id === divisionId));
            return group ? group.id : null;
        };

        const sourceGroupId =
            activeContainerId && activeContainerId !== UNGROUPED_ID
                ? activeContainerId
                : findGroupIdByDivisionId(active.id) || UNGROUPED_ID;

        let targetGroupId = UNGROUPED_ID;

        if (overType === 'division') {
            // Dropping on top of another division
            const viaDivisionGroupId =
                overContainerId && overContainerId !== UNGROUPED_ID
                    ? overContainerId
                    : findGroupIdByDivisionId(over.id);
            targetGroupId = viaDivisionGroupId || UNGROUPED_ID;
        } else if (overType === 'group') {
            // Dropping on a group header / empty group area
            targetGroupId = over.id;
        } else if (over.id === UNGROUPED_ID) {
            targetGroupId = UNGROUPED_ID;
        }

        // Walk-Trot Validation ONLY: WT can only mix with WT or Youth
        if (targetGroupId !== UNGROUPED_ID) {
            const targetGroup = patternGroups.find((g) => g.id === targetGroupId);

            if (targetGroup && targetGroup.divisions.length > 0) {
                const isYouth = (divName) => {
                    const lower = divName.toLowerCase();
                    return lower.includes('youth') || lower.includes('small fry') || lower.includes('leadline');
                };

                const isWt = isWalkTrotDivision(divisionToMove.division);
                const movingIsYouth = isYouth(divisionToMove.division);

                for (const groupDiv of targetGroup.divisions) {
                    const groupIsWt = isWalkTrotDivision(groupDiv.division);
                    const groupIsYouth = isYouth(groupDiv.division);

                    // If both are WT, or both are Non-WT, it's fine
                    if (isWt === groupIsWt) continue;

                    // If mixed (one WT, one Non-WT): allowed ONLY if the Non-WT one is Youth
                    const isCompatible = (isWt && groupIsYouth) || (groupIsWt && movingIsYouth);

                    if (!isCompatible) {
                        toast({
                            variant: 'destructive',
                            title: 'Invalid Grouping',
                            description: 'Walk-Trot divisions can only be grouped with other Walk-Trot divisions or Youth divisions.',
                        });
                        return;
                    }
                }
            }
        }

        // If nothing actually changes, bail out
        if (sourceGroupId === targetGroupId) {
            // Reorder within same group if dropped on a different division
            if (targetGroupId !== UNGROUPED_ID && overType === 'division' && active.id !== over.id) {
                setFormData((prev) => ({
                    ...prev,
                    disciplines: prev.disciplines.map((disc) => {
                        if (disc.id !== pbbDiscipline.id) return disc;
                        const groups = disc.patternGroups || [];
                        const groupIndex = groups.findIndex((g) => g.id === targetGroupId);
                        if (groupIndex === -1) return disc;
                        const group = groups[groupIndex];
                        const oldIndex = group.divisions.findIndex((d) => d.id === active.id);
                        const newIndex = group.divisions.findIndex((d) => d.id === over.id);
                        if (oldIndex === -1 || newIndex === -1) return disc;
                        const newDivisions = arrayMove(group.divisions, oldIndex, newIndex);
                        const newGroups = [...groups];
                        newGroups[groupIndex] = { ...group, divisions: newDivisions };
                        return { ...disc, patternGroups: newGroups };
                    }),
                }));
            }
            return;
        }

        // Move between containers (ungrouped <-> group, or group <-> group)
        setFormData((prev) => ({
            ...prev,
            disciplines: prev.disciplines.map((disc) => {
                if (disc.id !== pbbDiscipline.id) return disc;

                let newPatternGroups = [...(disc.patternGroups || [])];

                // 1) Remove from source group (if it currently lives in a group)
                if (sourceGroupId !== UNGROUPED_ID) {
                    const sourceIdx = newPatternGroups.findIndex((g) => g.id === sourceGroupId);
                    if (sourceIdx > -1) {
                        newPatternGroups[sourceIdx] = {
                            ...newPatternGroups[sourceIdx],
                            divisions: newPatternGroups[sourceIdx].divisions.filter(
                                (d) => d.id !== divisionToMove.id
                            ),
                        };
                    }
                }

                // 2) If target is a real group, insert there (end of list for simplicity)
                if (targetGroupId !== UNGROUPED_ID) {
                    const targetIdx = newPatternGroups.findIndex((g) => g.id === targetGroupId);
                    if (targetIdx > -1) {
                        const targetGroup = newPatternGroups[targetIdx];
                        const newDivisions = [...(targetGroup.divisions || [])];

                        // Avoid duplicates
                        if (!newDivisions.some((d) => d.id === divisionToMove.id)) {
                            newDivisions.push({
                                id: divisionToMove.id,
                                assocId: divisionToMove.assocId,
                                division: divisionToMove.division,
                            });
                        }

                        newPatternGroups[targetIdx] = { ...targetGroup, divisions: newDivisions };
                    }
                }

                return { ...disc, patternGroups: newPatternGroups };
            }),
        }));
    };

    const handleBulkMove = (disciplineId, targetGroupId) => {
        if (selectedForBulkMove.length === 0 || !pbbDiscipline) return;

        const divisionsToMove = ungroupedDivisions.filter(d => selectedForBulkMove.includes(d.id));
        const simpleDivs = divisionsToMove.map(d => ({ id: d.id, assocId: d.assocId, division: d.division }));

        const targetGroup = pbbDiscipline.patternGroups.find(g => g.id === targetGroupId);

        // Walk-Trot Validation ONLY for Bulk Move
        if (targetGroup) {
            const isYouth = (divName) => {
                const lower = divName.toLowerCase();
                return lower.includes('youth') || lower.includes('small fry') || lower.includes('leadline');
            };

            // Check Walk-Trot: WT can only mix with WT or Youth
            const groupDivs = targetGroup.divisions;
            const allDivsToCheck = [...simpleDivs, ...groupDivs];

            const hasWt = allDivsToCheck.some(d => isWalkTrotDivision(d.division));
            const hasNonWtNonYouth = allDivsToCheck.some(d => !isWalkTrotDivision(d.division) && !isYouth(d.division));

            if (hasWt && hasNonWtNonYouth) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid Grouping',
                    description: 'Walk-Trot divisions can only be grouped with other Walk-Trot divisions or Youth divisions.',
                });
                return;
            }
        }

        setFormData(prev => {
            let updatedDisciplines = prev.disciplines.map(disc => {
                if (disc.id === disciplineId) {

                    let updatedGroups = disc.patternGroups.map(g => {
                        if (g.id === targetGroupId) {
                            const existingDivs = new Set(g.divisions.map(d => d.id));
                            const newDivsToAdd = simpleDivs.filter(d => !existingDivs.has(d.id));
                            return { ...g, divisions: [...g.divisions, ...newDivsToAdd] };
                        }
                        return g;
                    });

                    // Global Hierarchy Rule for WT
                    let wtGroupIndex = -1;
                    updatedGroups.forEach((g, index) => {
                        if (g.divisions.some(d => isWalkTrotDivision(d.division))) wtGroupIndex = index;
                    });
                    if (wtGroupIndex !== -1 && updatedGroups.length > 1 && wtGroupIndex < updatedGroups.length - 1) {
                        toast({ title: 'Hierarchy Rule', description: 'Walk-Trot group must be the lowest hierarchy. Reordering groups.' });
                        const wtGroup = updatedGroups.splice(wtGroupIndex, 1)[0];
                        updatedGroups.push(wtGroup);
                    }

                    return { ...disc, patternGroups: updatedGroups };
                }
                return disc;
            });
            return { ...prev, disciplines: updatedDisciplines };
        });
        setSelectedForBulkMove([]);
    };

    const handleBulkSelectChange = (divisionId, isChecked) => {
        if (isChecked) {
            setSelectedForBulkMove(prev => [...prev, divisionId]);
        } else {
            setSelectedForBulkMove(prev => prev.filter(id => id !== divisionId));
        }
    };

    const handleSelectAll = (isChecked) => {
        if (isChecked) {
            setSelectedForBulkMove(ungroupedDivisions.map(d => d.id));
        } else {
            setSelectedForBulkMove([]);
        }
    };

    const handleAutoGroup = () => {
        if (ungroupedDivisions.length === 0) {
            toast({ title: 'Nothing to group!', description: 'There are no ungrouped divisions.' });
            return;
        }

        const isWtAffected = AFFECTED_CLASSES_FOR_WT_RULE.includes(pbbDiscipline.name);
        const wtDivisions = isWtAffected ? ungroupedDivisions.filter(d => isWalkTrotDivision(d.division)) : [];
        const nonWtDivisions = isWtAffected ? ungroupedDivisions.filter(d => !isWalkTrotDivision(d.division)) : [...ungroupedDivisions];

        setFormData(prev => {
            const newDisciplines = prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    let newPatternGroups = [...(disc.patternGroups || [])].filter(g => g.divisions.length > 0);
                    let nextPatternNum = newPatternGroups.length + 1;

                    if (nonWtDivisions.length > 0) {
                        newPatternGroups.push({
                            id: `pattern-group-${Date.now()}`,
                            name: `Group ${nextPatternNum++}`,
                            divisions: nonWtDivisions.map(d => ({ id: d.id, assocId: d.assocId, division: d.division })),
                            rulebookPatternId: '',
                        });
                    }

                    if (wtDivisions.length > 0) {
                        newPatternGroups.push({
                            id: `pattern-group-${Date.now() + 1}`,
                            name: `Group ${nextPatternNum++}`,
                            divisions: wtDivisions.map(d => ({ id: d.id, assocId: d.assocId, division: d.division })),
                            rulebookPatternId: '',
                        });
                    }

                    return { ...disc, patternGroups: newPatternGroups };
                }
                return disc;
            });
            return { ...prev, disciplines: newDisciplines };
        });

        toast({ title: 'Auto-Grouping Complete!', description: 'Divisions have been automatically grouped.' });
    };

    const allDivisions = useMemo(() => {
        if (!pbbDiscipline?.divisionOrder) return [];
        return (pbbDiscipline.divisionOrder || []).map(divId => {
            const [assocId, ...divisionParts] = divId.split('-');
            const divisionName = divisionParts.join('-');
            const date = (pbbDiscipline.divisionDates && pbbDiscipline.divisionDates[divId]) || null;
            const customTitle = (pbbDiscipline.divisionPrintTitles && pbbDiscipline.divisionPrintTitles[divId]) || null;
            return { id: divId, assocId, division: divisionName, date, customTitle };
        });
    }, [pbbDiscipline]);

    const groupedDivisionsSet = new Set((pbbDiscipline?.patternGroups || []).flatMap(g => g.divisions.map(d => d.id)));

    const ungroupedDivisions = useMemo(() => {
        return allDivisions.filter(d => !groupedDivisionsSet.has(d.id));
    }, [allDivisions, groupedDivisionsSet]);

    const hierarchyInfoText = "Group divisions that will share the same same pattern. The order of groups determines the pattern order in your book. You can also re-order divisions within a group to set their display order in the pattern's title block.";

    if (!pbbDiscipline) {
        return <div className="text-center text-muted-foreground p-4">Loading configuration...</div>;
    }

    const patternGroups = pbbDiscipline.patternGroups || [];
    const allUngroupedSelected = ungroupedDivisions.length > 0 && selectedForBulkMove.length === ungroupedDivisions.length;

    return (
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter} sensors={sensors}>
            <div className="flex justify-between items-center mb-2">
                {formData?.showName && (
                    <div className="text-xs font-medium text-muted-foreground">
                        Horse Show: {formData.showName}
                    </div>
                )}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs">
                            <Info className="h-4 w-4 mr-2" /> How does this work?
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="text-sm w-80">{hierarchyInfoText}</PopoverContent>
                </Popover>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ungroupedDivisions.length > 0 && (
                    <div ref={setUngroupedNodeRef} className={cn('lg:col-span-1 p-4 border rounded-xl bg-muted/20 transition-colors', isOverUngrouped ? 'border-primary bg-primary/10' : 'border-dashed')}>
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <Label className="font-semibold flex items-center text-base">
                                    <Undo2 className="h-5 w-5 mr-2 text-muted-foreground" />
                                    Ungrouped Divisions
                                </Label>
                                <p className="text-xs text-muted-foreground">Drag, or select and move divisions.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleAutoGroup} disabled={ungroupedDivisions.length === 0}>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Auto-Group
                            </Button>
                        </div>

                        <div className="flex items-center justify-between bg-background p-2 rounded-md mb-3">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="select-all-ungrouped"
                                    checked={allUngroupedSelected}
                                    onCheckedChange={handleSelectAll}
                                    disabled={ungroupedDivisions.length === 0}
                                />
                                <Label htmlFor="select-all-ungrouped" className="text-xs font-normal">
                                    {selectedForBulkMove.length > 0 ? `${selectedForBulkMove.length} selected` : 'Select All'}
                                </Label>
                            </div>
                            {selectedForBulkMove.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="secondary" size="sm" className="h-8 text-xs">
                                            <Move className="h-3.5 w-3.5 mr-1.5" /> Move to...
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {patternGroups.map(group => (
                                            <DropdownMenuItem key={group.id} onSelect={() => handleBulkMove(pbbDiscipline.id, group.id)}>
                                                {group.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        <div className="space-y-2 min-h-[100px] max-h-[400px] overflow-y-auto pr-2">
                            <SortableContext items={ungroupedDivisions.map(d => d.id)} id="ungrouped-list">
                                {ungroupedDivisions.map((div) => (
                                    <div key={div.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`bulk-${div.id}`}
                                            checked={selectedForBulkMove.includes(div.id)}
                                            onCheckedChange={c => handleBulkSelectChange(div.id, c)}
                                        />
                                        <div className="flex-grow">
                                            <DraggableDivision
                                                id={div.id}
                                                division={div}
                                                pbbDiscipline={pbbDiscipline}
                                                formData={formData}
                                                associationsData={associationsData}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </SortableContext>
                            {ungroupedDivisions.length === 0 && (
                                <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-10">
                                    <Check className="h-8 w-8 text-green-500 mb-2" />
                                    <p className="font-semibold">All divisions are grouped!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className={cn(ungroupedDivisions.length === 0 ? 'lg:col-span-2' : 'lg:col-span-1', 'space-y-4')}>
                    <SortableContext items={patternGroups.map(g => g.id)} strategy={verticalListSortingStrategy} id="groups-container">
                        {patternGroups.map((group, index) => (
                            <DropZoneGroup
                                key={group.id}
                                group={group}
                                index={index}
                                pbbDiscipline={pbbDiscipline}
                                handleGroupFieldChange={handleGroupFieldChange}
                                handleRemovePatternGroup={handleRemovePatternGroup}
                                handleAiAssistClick={handleAiAssistClick}
                                setFormData={setFormData}
                                formData={formData}
                                associationsData={associationsData}
                            />
                        ))}
                    </SortableContext>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleAddPatternGroup(pbbDiscipline.id)}><PlusCircle className="h-4 w-4 mr-2" />Add Pattern Group</Button>
                </div>
            </div>
        </DndContext>
    );
};
