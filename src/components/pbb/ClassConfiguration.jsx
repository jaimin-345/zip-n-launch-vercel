import React, { useState, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GripVertical, Loader2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { ClassTabs } from '@/components/pbb/ClassTabs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

    if (hasPattern) {
        return selectedDivisions.size > 0;
    }

    const groupedDivisions = new Set((pbbDiscipline.patternGroups || []).flatMap(g => g.divisions.map(d => d.id)));

    if (selectedDivisions.size === 0) {
        return false;
    }
    
    return selectedDivisions.size === groupedDivisions.size && [...selectedDivisions].every(d => groupedDivisions.has(d));
};

const MergedDisciplineItem = ({ disciplineName, disciplineGroup, children, isOpenShowMode, formData, associationsData, divisionsData, setFormData }) => {
    const firstDiscipline = disciplineGroup[0];
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: firstDiscipline.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Check completion status for all disciplines in group
    const allComplete = disciplineGroup.every(d => isDisciplineComplete(d, isOpenShowMode));
    const anyComplete = disciplineGroup.some(d => isDisciplineComplete(d, isOpenShowMode));

    // Get division counts for all disciplines in group
    const getDivisionCountsForGroup = () => {
        const counts = [];
        
        disciplineGroup.forEach(pbbDiscipline => {
            if (!pbbDiscipline || !pbbDiscipline.divisions) return;
        
            if (isOpenShowMode) {
                const openShowDivs = pbbDiscipline.divisions['open-show'] || {};
                const count = Object.values(openShowDivs).reduce((acc, levels) => acc + (Array.isArray(levels) ? levels.length : 0), 0);
                if (count > 0) {
                    counts.push({ id: 'open-show', name: 'Open Show', abbreviation: 'Open', count });
                }
            } else {
                Object.entries(pbbDiscipline.divisions).forEach(([assocId, assocDivs]) => {
                    const count = Object.keys(assocDivs || {}).length;
                    if (count === 0) return;
        
                    const assoc = associationsData.find(a => a.id === assocId);
                    const existing = counts.find(c => c.id === assocId);
                    if (existing) {
                        existing.count += count;
                    } else {
                        counts.push({
                            id: assocId,
                            name: assoc?.name || assocId,
                            abbreviation: assoc?.abbreviation || assocId,
                            count,
                            color: assoc?.color || 'secondary'
                        });
                    }
                });
            }
        });

        return counts.sort((a,b) => a.name.localeCompare(b.name));
    };

    const divisionCounts = getDivisionCountsForGroup();
    const [activeTab, setActiveTab] = useState(disciplineGroup[0]?.id);

    return (
        <div ref={setNodeRef} style={style} className="bg-card rounded-lg border">
            <AccordionItem value={firstDiscipline.id} className="border-b-0">
                <AccordionTrigger className="w-full px-3 py-2 hover:no-underline">
                    <div className="flex items-center w-full gap-3">
                        <div {...attributes} {...listeners} className="cursor-grab p-1">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="flex-grow text-left font-semibold text-sm">{disciplineName}</span>
                        <span className={`text-xs font-semibold ${allComplete ? 'text-green-600' : 'text-red-600'}`}>
                            - {allComplete ? 'complete' : 'incomplete'}
                        </span>
                        <div className="flex items-center gap-1 mr-2">
                            {divisionCounts.length > 0 ? (
                                divisionCounts.map(item => (
                                    <Badge key={item.id} variant={item.color || "default"} className="whitespace-nowrap text-xs px-2 py-0">
                                        {item.abbreviation}: {item.count}
                                    </Badge>
                                ))
                            ) : (
                                <Badge variant="outline" className="whitespace-nowrap text-xs px-2 py-0">0 Divisions</Badge>
                            )}
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-3 border-t">
                    {disciplineGroup.length === 1 ? (
                        <ClassTabs
                            pbbDiscipline={disciplineGroup[0]}
                            setFormData={setFormData}
                            isOpenShowMode={isOpenShowMode}
                            formData={formData}
                            associationsData={associationsData}
                            divisionsData={divisionsData}
                        />
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="w-full justify-start mb-3 bg-muted/50">
                                {disciplineGroup.map(d => {
                                    const assoc = associationsData.find(a => a.id === d.association_id);
                                    const isComplete = isDisciplineComplete(d, isOpenShowMode);
                                    return (
                                        <TabsTrigger key={d.id} value={d.id} className="flex items-center gap-2">
                                            <span>{assoc?.abbreviation || d.association_id}</span>
                                            <span className={`text-[10px] ${isComplete ? 'text-green-600' : 'text-red-500'}`}>
                                                ({isComplete ? '✓' : '○'})
                                            </span>
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                            {disciplineGroup.map(d => (
                                <TabsContent key={d.id} value={d.id} className="mt-0">
                                    <ClassTabs
                                        pbbDiscipline={d}
                                        setFormData={setFormData}
                                        isOpenShowMode={isOpenShowMode}
                                        formData={formData}
                                        associationsData={associationsData}
                                        divisionsData={divisionsData}
                                    />
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </AccordionContent>
            </AccordionItem>
        </div>
    );
};

export const ClassConfiguration = ({ formData, setFormData, isOpenShowMode, associationsData, divisionsData }) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const [openAccordion, setOpenAccordion] = useState(null);

    const disciplines = formData?.disciplines || [];

    // Group disciplines by name
    const groupedDisciplines = useMemo(() => {
        const groups = {};
        const orderedNames = [];
        
        disciplines.forEach(d => {
            if (!groups[d.name]) {
                groups[d.name] = [];
                orderedNames.push(d.name);
            }
            groups[d.name].push(d);
        });
        
        return orderedNames.map(name => ({
            name,
            disciplines: groups[name]
        }));
    }, [disciplines]);

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
                    {groupedDisciplines.map(group => (
                        <MergedDisciplineItem 
                            key={group.name} 
                            disciplineName={group.name}
                            disciplineGroup={group.disciplines}
                            isOpenShowMode={isOpenShowMode}
                            formData={formData}
                            associationsData={associationsData}
                            divisionsData={divisionsData}
                            setFormData={setFormData}
                        />
                    ))}
                </Accordion>
            </SortableContext>
        </DndContext>
    );
};
