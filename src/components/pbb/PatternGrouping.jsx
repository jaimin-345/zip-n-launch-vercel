import React, { useState, useMemo } from 'react';
import { PlusCircle, Move, Info, Undo2, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { DndContext, closestCenter, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useToast } from '@/components/ui/use-toast';
import { isWalkTrotDivision, cn } from '@/lib/utils';
import DraggableDivision from './DraggableDivision';
import DropZoneGroup from './DropZoneGroup';

const UNGROUPED_ID = 'ungrouped-divisions-drop-zone';

export const PatternGrouping = ({ pbbDiscipline, setFormData, isCustomOpenShow, formData, associationsData }) => {
  const [selectedForBulkMove, setSelectedForBulkMove] = useState([]);
  const { toast } = useToast();
  
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
    
    const activeId = active.id;
    const overId = over.id;

    // Case 1: Reordering groups
    if (active.data.current?.sortable?.containerId === 'groups-container' && over.data.current?.sortable?.containerId === 'groups-container') {
        if (activeId !== overId) {
            setFormData(prev => ({
                ...prev,
                disciplines: prev.disciplines.map(disc => {
                    if (disc.id === pbbDiscipline.id) {
                        const oldIndex = (disc.patternGroups || []).findIndex(g => g.id === activeId);
                        const newIndex = (disc.patternGroups || []).findIndex(g => g.id === overId);
                        const newPatternGroups = arrayMove(disc.patternGroups, oldIndex, newIndex);
                        return { ...disc, patternGroups: newPatternGroups };
                    }
                    return disc;
                })
            }));
        }
        return;
    }

    // Case 2: Reordering divisions within the same group
    if (active.data.current?.sortable?.containerId === over.data.current?.sortable?.containerId) {
         const groupId = active.data.current.sortable.containerId;
         setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newPatternGroups = (disc.patternGroups || []).map(g => {
                        if (g.id === groupId) {
                            const oldIndex = g.divisions.findIndex(d => d.id === activeId);
                            const newIndex = g.divisions.findIndex(d => d.id === overId);
                            if (oldIndex > -1 && newIndex > -1) {
                                const reorderedDivisions = arrayMove(g.divisions, oldIndex, newIndex);
                                return { ...g, divisions: reorderedDivisions };
                            }
                        }
                        return g;
                    });
                    return { ...disc, patternGroups: newPatternGroups };
                }
                return disc;
            })
         }));
         return;
    }

    // Case 3: Moving a division between groups or from ungrouped
    const sourceGroupId = active.data.current?.sortable?.containerId;
    const targetGroupId = over.data.current?.sortable?.containerId || over.id;
    
    const divisionToMove = active.data.current?.division;
    if (!divisionToMove) return;

    // Prevent invalid grouping based on Walk/Trot rules
    if (AFFECTED_CLASSES_FOR_WT_RULE.includes(pbbDiscipline.name)) {
        const isWt = isWalkTrotDivision(divisionToMove.division);
        const targetGroup = (pbbDiscipline.patternGroups || []).find(g => g.id === targetGroupId);
        if (targetGroup && targetGroup.divisions.length > 0) {
            const groupHasWt = targetGroup.divisions.some(d => isWalkTrotDivision(d.division));
            if (isWt && !groupHasWt) {
                toast({ variant: 'destructive', title: 'Invalid Grouping', description: 'Walk-Trot divisions cannot be grouped with loping/cantering divisions.' });
                return;
            } else if (!isWt && groupHasWt) {
                toast({ variant: 'destructive', title: 'Invalid Grouping', description: 'Loping/cantering divisions cannot be grouped with Walk-Trot divisions.' });
                return;
            }
        }
    }

    setFormData(prev => ({
        ...prev,
        disciplines: prev.disciplines.map(disc => {
            if (disc.id === pbbDiscipline.id) {
                let newPatternGroups = [...(disc.patternGroups || [])];
                
                // Remove from source group if it's not ungrouped
                if (sourceGroupId && sourceGroupId !== 'ungrouped-list') {
                    const sourceGroupIndex = newPatternGroups.findIndex(g => g.id === sourceGroupId);
                    if (sourceGroupIndex > -1) {
                        newPatternGroups[sourceGroupIndex] = {
                            ...newPatternGroups[sourceGroupIndex],
                            divisions: newPatternGroups[sourceGroupIndex].divisions.filter(d => d.id !== divisionToMove.id)
                        };
                    }
                }

                // Add to target group if it's not the ungrouped list
                if (targetGroupId && targetGroupId !== UNGROUPED_ID) {
                    const targetGroupIndex = newPatternGroups.findIndex(g => g.id === targetGroupId);
                     if (targetGroupIndex > -1) {
                        const targetGroup = newPatternGroups[targetGroupIndex];
                        
                        // Find where to insert
                        const overIndex = over.data.current?.sortable?.index;
                        const newDivisions = [...targetGroup.divisions];
                        if (overIndex !== undefined && overId !== targetGroupId) {
                            newDivisions.splice(overIndex, 0, divisionToMove);
                        } else {
                            newDivisions.push(divisionToMove);
                        }
                        
                        newPatternGroups[targetGroupIndex] = { ...targetGroup, divisions: newDivisions };
                    }
                }
                
                return { ...disc, patternGroups: newPatternGroups };
            }
            return disc;
        })
    }));
  };

  const handleBulkMove = (disciplineId, targetGroupId) => {
    if (selectedForBulkMove.length === 0 || !pbbDiscipline) return;
    
    const divisionsToMove = ungroupedDivisions.filter(d => selectedForBulkMove.includes(d.id));
    const simpleDivs = divisionsToMove.map(d => ({id: d.id, assocId: d.assocId, division: d.division}));

    const containsWt = simpleDivs.some(d => isWalkTrotDivision(d.division));
    const containsNonWt = simpleDivs.some(d => !isWalkTrotDivision(d.division));

    if(containsWt && containsNonWt && AFFECTED_CLASSES_FOR_WT_RULE.includes(pbbDiscipline.name)){
        toast({variant: 'destructive', title: 'Invalid Selection', description: 'Cannot bulk move Walk-Trot and non-Walk-Trot divisions together.'});
        return;
    }

    const targetGroup = pbbDiscipline.patternGroups.find(g => g.id === targetGroupId);
    if(targetGroup && targetGroup.divisions.length > 0 && AFFECTED_CLASSES_FOR_WT_RULE.includes(pbbDiscipline.name)){
        const targetGroupHasWt = targetGroup.divisions.some(d => isWalkTrotDivision(d.division));
        if(containsWt && !targetGroupHasWt){
            toast({variant: 'destructive', title: 'Invalid Grouping', description: 'Cannot move Walk-Trot divisions into a non-Walk-Trot group.'});
            return;
        }
        if(!containsWt && targetGroupHasWt){
            toast({variant: 'destructive', title: 'Invalid Grouping', description: 'Cannot move non-Walk-Trot divisions into a Walk-Trot group.'});
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
                        return {...g, divisions: [...g.divisions, ...newDivsToAdd]};
                    }
                    return g;
                });
                
                if (AFFECTED_CLASSES_FOR_WT_RULE.includes(pbbDiscipline.name)) {
                    let wtGroupIndex = -1;
                    updatedGroups.forEach((g, index) => {
                        if (g.divisions.some(d => isWalkTrotDivision(d.division))) wtGroupIndex = index;
                    });
                    if (wtGroupIndex !== -1 && updatedGroups.length > 1 && wtGroupIndex < updatedGroups.length - 1) {
                       toast({ title: 'Hierarchy Rule', description: 'Walk-Trot group must be the lowest hierarchy. Reordering groups.' });
                       const wtGroup = updatedGroups.splice(wtGroupIndex, 1)[0];
                       updatedGroups.push(wtGroup);
                    }
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
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <div className="flex justify-end mb-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs">
                        <Info className="h-4 w-4 mr-2" /> How does this work?
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="text-sm w-80">{hierarchyInfoText}</PopoverContent>
            </Popover>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div ref={setUngroupedNodeRef} className={cn('lg:col-span-1 p-4 border rounded-xl bg-muted/20 transition-colors', isOverUngrouped ? 'border-primary bg-primary/10' : 'border-dashed')}>
            <div className="flex justify-between items-center mb-3">
                <div>
                    <Label className="font-semibold flex items-center text-base">
                        <Undo2 className="h-5 w-5 mr-2 text-muted-foreground"/>
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
        <div className="lg:col-span-2 space-y-4">
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