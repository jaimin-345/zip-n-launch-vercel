import React, { useState, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GripVertical, Loader2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { ClassTabs } from '@/components/pbb/ClassTabs';

const isDisciplineComplete = (pbbDiscipline, isOpenShowMode) => {
    if (!pbbDiscipline) return false;

    const getSelectedDivisionsSet = () => {
        const divisions = new Set();
        if (!pbbDiscipline.divisions) return divisions;

        if (pbbDiscipline.isCustom && isOpenShowMode) {
            const openShowDivs = pbbDiscipline.divisions['open-show'] || {};
            Object.entries(openShowDivs).forEach(([group, levels]) => {
                if (Array.isArray(levels)) {
                    levels.forEach(level => divisions.add(`open-show-${group} - ${level}`));
                }
            });
        } else {
            Object.entries(pbbDiscipline.divisions).forEach(([assocId, divs]) => {
                Object.keys(divs || {}).filter(d => divs[d]).forEach(divisionKey => {
                     const cleanDivisionName = divisionKey.startsWith('custom-') ? divisionKey.substring(7) : divisionKey;
                     divisions.add(`${assocId}-${cleanDivisionName}`);
                });
            });
        }
        return divisions;
    };
    
    const selectedDivisions = getSelectedDivisionsSet();
    const hasPattern = pbbDiscipline.pattern_type === 'none' || pbbDiscipline.pattern_type === 'scoresheet_only' || !pbbDiscipline.pattern;

    if (hasPattern) { // For disciplines without patterns, only division selection matters.
        return selectedDivisions.size > 0;
    }

    // For disciplines with patterns, all selected divisions must be grouped.
    const groupedDivisions = new Set((pbbDiscipline.patternGroups || []).flatMap(g => g.divisions.map(d => d.id)));

    if (selectedDivisions.size === 0) {
        return false;
    }
    
    // Check if every selected division has been placed into a group.
    return selectedDivisions.size === groupedDivisions.size && [...selectedDivisions].every(d => groupedDivisions.has(d));
};


const SortableDisciplineItem = ({ pbbDiscipline, mergedDisciplines, isOpenShowMode, formData, associationsData, divisionsData, setFormData }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: pbbDiscipline.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    // Check completion for all merged disciplines - aggregate divisions and groups across all
    const allDisciplines = mergedDisciplines || [pbbDiscipline];
    
    // Get pattern selection info for this discipline
    const patternSelectionInfo = useMemo(() => {
        const disciplineId = pbbDiscipline?.id;
        const selections = formData?.patternSelections?.[disciplineId];
        if (!selections) return null;
        
        // Find the first group with a pattern selection (check patternId or setNumber)
        const groupsWithPatterns = Object.entries(selections).filter(([_, sel]) => sel?.patternId || sel?.setNumber);
        if (groupsWithPatterns.length === 0) return null;
        
        // Get all group pattern selections with their group names
        const allPatternSelections = groupsWithPatterns.map(([groupId, sel]) => {
            const patternName = sel.patternName || '';
            const match = patternName.match(/PATTERN\s*\d+/i);
            const shortName = match ? match[0].toUpperCase() : patternName;
            const version = sel.version || '';
            return {
                groupId,
                shortName,
                version,
                displayText: version ? `${shortName} (${version})` : shortName
            };
        });
        
        // Create display text showing all patterns
        const displayTexts = allPatternSelections.map(p => p.displayText).filter(Boolean);
        
        return {
            count: groupsWithPatterns.length,
            allPatterns: allPatternSelections,
            displayText: displayTexts.join(' | '),
            hasMultiple: displayTexts.length > 1
        };
    }, [pbbDiscipline?.id, formData?.patternSelections]);
    
    const isComplete = useMemo(() => {
        // Use divisionOrder as source of truth - if divisions exist in divisionOrder, 
        // they are "selected". If they're all in patternGroups, they're "complete"
        const allSelectedDivisions = new Set();
        const allGroupedDivisions = new Set();
        
        allDisciplines.forEach(disc => {
            if (!disc) return;
            
            // Use divisionOrder as the definitive list of selected divisions
            if (disc.divisionOrder && disc.divisionOrder.length > 0) {
                disc.divisionOrder.forEach(divId => allSelectedDivisions.add(divId));
            }
            
            // Get grouped divisions for this discipline
            const groups = disc.patternGroups || [];
            groups.forEach(g => {
                (g.divisions || []).forEach(d => allGroupedDivisions.add(d.id));
            });
        });
        
        // If no divisions selected, mark as incomplete
        if (allSelectedDivisions.size === 0) {
            return false;
        }
        
        // All selected divisions must be grouped
        const allGrouped = allSelectedDivisions.size === allGroupedDivisions.size && 
               [...allSelectedDivisions].every(d => allGroupedDivisions.has(d));
        
        return allGrouped;
    }, [allDisciplines, isOpenShowMode]);

    const getDivisionCounts = () => {
        // Get associations that this discipline belongs to (from merged disciplines)
        const disciplineAssocIds = new Set();
        allDisciplines.forEach(disc => {
            if (disc.selectedAssociations) {
                Object.keys(disc.selectedAssociations).filter(id => disc.selectedAssociations[id]).forEach(id => disciplineAssocIds.add(id));
            }
            if (disc.association_id) {
                disciplineAssocIds.add(disc.association_id);
            }
        });
        
        // Initialize counts with only discipline's associations (count 0 by default)
        const countsMap = {};
        disciplineAssocIds.forEach(assocId => {
            const assoc = associationsData.find(a => a.id === assocId);
            if (assoc) {
                countsMap[assocId] = {
                    id: assocId,
                    name: assoc.name || assocId,
                    abbreviation: assoc.abbreviation || assocId,
                    count: 0,
                    color: assoc.color || 'secondary'
                };
            }
        });
        
        // Aggregate division counts from all merged disciplines
        allDisciplines.forEach(disc => {
            if (!disc || !disc.divisions) return;
        
            if (isOpenShowMode) {
                const openShowDivs = disc.divisions['open-show'] || {};
                const count = Object.values(openShowDivs).reduce((acc, levels) => acc + (Array.isArray(levels) ? levels.length : 0), 0);
                if (count > 0) {
                    if (countsMap['open-show']) {
                        countsMap['open-show'].count += count;
                    } else {
                        countsMap['open-show'] = { id: 'open-show', name: 'Open Show', abbreviation: 'Open', count };
                    }
                }
            } else {
                Object.entries(disc.divisions).forEach(([assocId, assocDivs]) => {
                    const count = Object.keys(assocDivs || {}).length;
                    if (count === 0) return;
        
                    if (countsMap[assocId]) {
                        countsMap[assocId].count += count;
                    }
                });
            }
        });
        
        return Object.values(countsMap).sort((a,b) => a.name.localeCompare(b.name));
    };

    const divisionCounts = getDivisionCounts();


    // Get dual-approved info - returns which associations have dual-approved with which options
    const getDualApprovedInfo = () => {
        const dualApprovedSelections = formData.dualApprovedSelections || {};
        const dualApprovedWith = formData.subAssociationSelections?.nsba?.dualApprovedWith || [];
        const result = []; // { assocAbbrev: 'AQHA', dualWith: 'NSBA' }
        
        allDisciplines.forEach(disc => {
            // Only check if this discipline's association is in the dualApprovedWith list
            if (!dualApprovedWith.includes(disc.association_id)) return;
            
            const disciplineKey = `${disc.association_id}-${disc.sub_association_type || 'none'}-${disc.name}`;
            const dualSelections = dualApprovedSelections[disciplineKey] || {};
            
            Object.entries(dualSelections).forEach(([dualAssocId, isSelected]) => {
                if (isSelected) {
                    const assoc = associationsData.find(a => a.id === disc.association_id);
                    const assocAbbrev = assoc?.abbreviation || disc.association_id;
                    // Check if this association is already added
                    if (!result.some(r => r.assocAbbrev === assocAbbrev && r.dualWith === dualAssocId)) {
                        result.push({ assocAbbrev, dualWith: dualAssocId });
                    }
                }
            });
        });
        
        return result;
    };
    
    const dualApprovedInfo = getDualApprovedInfo();

    return (
        <div ref={setNodeRef} style={style} className="bg-card rounded-lg border">
            <AccordionItem value={pbbDiscipline.id} className="border-b-0">
                <AccordionTrigger className="w-full px-3 py-2 hover:no-underline">
                    <div className="flex items-center w-full gap-3">
                        <div {...attributes} {...listeners} className="cursor-grab p-1">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-grow text-left min-w-0">
                            <span className="font-semibold text-sm">{pbbDiscipline.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                {divisionCounts.map(item => (
                                    <span key={item.id} className="text-xs text-amber-600 font-medium">{item.abbreviation}</span>
                                ))}
                                {dualApprovedInfo.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        • <span className="text-amber-600 font-medium">{dualApprovedInfo[0].assocAbbrev}</span>
                                        {' '}Dual-Approved: <span className="text-green-600 font-medium">{dualApprovedInfo[0].dualWith}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {/* Pattern Selection Display - Show all group patterns */}
                        {patternSelectionInfo && patternSelectionInfo.displayText && (
                            <div className="flex items-center gap-1 flex-wrap">
                                {patternSelectionInfo.allPatterns?.map((pattern, idx) => (
                                    <Badge key={idx} className="bg-green-100 text-green-800 border-green-200 text-xs whitespace-nowrap">
                                        {pattern.displayText}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        
                        <span className={`text-xs font-semibold ${isComplete ? 'text-green-600' : 'text-red-600'}`}>
                            - {isComplete ? 'complete' : 'incomplete'}
                        </span>
                        <div className="flex items-center gap-1.5 mr-2">
                            {divisionCounts.length > 0 ? (
                                divisionCounts.map(item => (
                                    <Badge 
                                        key={item.id} 
                                        variant="secondary" 
                                        className="whitespace-nowrap text-xs px-2 py-0.5 bg-sky-100 text-sky-700 border border-sky-200"
                                    >
                                        {item.abbreviation}: {item.count}
                                    </Badge>
                                ))
                            ) : (
                                <Badge variant="secondary" className="whitespace-nowrap text-xs px-2 py-0.5 bg-sky-100 text-sky-700 border border-sky-200">0 Divisions</Badge>
                            )}
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-3 border-t">
                    <ClassTabs
                        pbbDiscipline={pbbDiscipline}
                        mergedDisciplines={allDisciplines}
                        setFormData={setFormData}
                        isOpenShowMode={isOpenShowMode}
                        formData={formData}
                        associationsData={associationsData}
                        divisionsData={divisionsData}
                    />
                </AccordionContent>
            </AccordionItem>
        </div>
    );
};

export const ClassConfiguration = ({ formData, setFormData, isOpenShowMode, associationsData, divisionsData }) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const [openAccordion, setOpenAccordion] = useState(null);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setFormData(prev => {
                const disciplines = prev.disciplines || [];
                const oldIndex = disciplines.findIndex(c => c.id === active.id);
                const newIndex = disciplines.findIndex(c => c.id === over.id);
                if (oldIndex === -1 || newIndex === -1) return prev;
                return { ...prev, disciplines: arrayMove(disciplines, oldIndex, newIndex) };
            });
        }
    };

    const disciplines = formData?.disciplines || [];

    // Group disciplines by name for merging display
    const groupedDisciplines = useMemo(() => {
        const groups = {};
        disciplines.forEach(disc => {
            const name = disc.name;
            if (!groups[name]) {
                groups[name] = [];
            }
            groups[name].push(disc);
        });
        return groups;
    }, [disciplines]);

    // Get unique discipline names in order (preserving first occurrence order)
    const uniqueNames = useMemo(() => {
        const seen = new Set();
        return disciplines.map(d => d.name).filter(name => {
            if (seen.has(name)) return false;
            seen.add(name);
            return true;
        });
    }, [disciplines]);

    if (!associationsData || !divisionsData) {
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (disciplines.length === 0) {
        return (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No disciplines to configure.</p>
                <p className="text-sm text-muted-foreground mt-1">Go back to Step 2 to add disciplines.</p>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={disciplines.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <Accordion type="single" collapsible className="w-full space-y-1.5" value={openAccordion} onValueChange={setOpenAccordion}>
                    {uniqueNames.map(name => {
                        const mergedDisciplines = groupedDisciplines[name];
                        const primaryDiscipline = mergedDisciplines[0];
                        
                        return (
                            <SortableDisciplineItem 
                                key={primaryDiscipline.id} 
                                pbbDiscipline={primaryDiscipline}
                                mergedDisciplines={mergedDisciplines}
                                isOpenShowMode={isOpenShowMode}
                                formData={formData}
                                associationsData={associationsData}
                                divisionsData={divisionsData}
                                setFormData={setFormData}
                            />
                        );
                    })}
                </Accordion>
            </SortableContext>
        </DndContext>
    );
};