import React, { useMemo } from 'react';
    import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Label } from '@/components/ui/label';
    import { Badge } from '@/components/ui/badge';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
    import { Input } from '@/components/ui/input';
    import { Button } from '@/components/ui/button';
    import { PlusCircle, Trash2 } from 'lucide-react';
    import { PatternGrouping } from '@/components/pbb/PatternGrouping';
    import { ScheduleOrganizer } from '@/components/pbb/ScheduleOrganizer';
    
    const CustomDivisionManager = ({ pbbDiscipline, setFormData }) => {
        const [customDivisionName, setCustomDivisionName] = React.useState('');
        const [isCustomDivisionModalOpen, setIsCustomDivisionModalOpen] = React.useState(false);

        const openShowSuggestions = useMemo(() => {
            return {
                divisions: [
                    { group: 'Walk-Trot', levels: ['All'] },
                    { group: 'Youth', levels: ['All', '13 & Under', '14-18'] },
                    { group: 'Amateur', levels: ['All', 'Select'] },
                    { group: 'Open', levels: ['All', 'Junior Horse', 'Senior Horse'] },
                ]
            };
        }, []);
    
        const handleDivisionChange = (groupName, level, isChecked) => {
            setFormData(prev => {
                const newDisciplines = prev.disciplines.map(disc => {
                    if (disc.id === pbbDiscipline.id) {
                        const newDivisions = JSON.parse(JSON.stringify(disc.divisions || {}));
                        if (!newDivisions['open-show']) newDivisions['open-show'] = {};
                        if (!newDivisions['open-show'][groupName]) newDivisions['open-show'][groupName] = [];
    
                        if (isChecked) {
                            if (!newDivisions['open-show'][groupName].includes(level)) {
                                newDivisions['open-show'][groupName].push(level);
                            }
                        } else {
                            newDivisions['open-show'][groupName] = newDivisions['open-show'][groupName].filter(l => l !== level);
                            if (newDivisions['open-show'][groupName].length === 0) {
                                delete newDivisions['open-show'][groupName];
                            }
                        }
                        return { ...disc, divisions: newDivisions };
                    }
                    return disc;
                });
                return { ...prev, disciplines: newDisciplines };
            });
        };
    
        const handleAddCustomDivision = () => {
            if (!customDivisionName.trim()) return;
            handleDivisionChange(customDivisionName, 'All', true);
            setCustomDivisionName('');
            setIsCustomDivisionModalOpen(false);
        };
    
        const currentDivisions = pbbDiscipline.divisions && pbbDiscipline.divisions['open-show'] ? pbbDiscipline.divisions['open-show'] : {};
    
        return (
            <div className="space-y-4">
                <h4 className="font-semibold text-lg">Select Divisions for "{pbbDiscipline.name}"</h4>
                <div className="space-y-3">
                    {openShowSuggestions.divisions.map(group => (
                        <div key={group.group}>
                            <p className="text-sm font-medium text-muted-foreground">{group.group}</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-1">
                                {group.levels.map(level => (
                                    <div key={level} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`div-${pbbDiscipline.id}-open-${group.group}-${level}`}
                                            checked={!!currentDivisions[group.group]?.includes(level)}
                                            onCheckedChange={(c) => handleDivisionChange(group.group, level, c)}
                                        />
                                        <Label htmlFor={`div-${pbbDiscipline.id}-open-${group.group}-${level}`} className="font-normal text-xs">{level}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <Dialog open={isCustomDivisionModalOpen} onOpenChange={setIsCustomDivisionModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-4"><PlusCircle className="h-4 w-4 mr-2" />Add Custom Division</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Custom Division</DialogTitle>
                            <DialogDescription>Enter a name for a new division group (e.g., Leadline).</DialogDescription>
                        </DialogHeader>
                        <Input value={customDivisionName} onChange={(e) => setCustomDivisionName(e.target.value)} placeholder="Division Name" />
                        <DialogFooter>
                            <Button onClick={handleAddCustomDivision}>Add Division</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    };
    
    export const ClassTabs = ({ pbbDiscipline, setFormData, isOpenShowMode, formData, associationsData, divisionsData }) => {
        const [customDivisionName, setCustomDivisionName] = React.useState('');
        const [isCustomDivisionModalOpen, setIsCustomDivisionModalOpen] = React.useState(false);
        const [customDivisionAssocId, setCustomDivisionAssocId] = React.useState(null);
    
        const handleDisciplineConfigChange = (disciplineId, configKey, value) => {
            setFormData(prev => ({ ...prev, disciplines: prev.disciplines.map(c => c.id === disciplineId ? { ...c, [configKey]: value } : c) }));
        };
    
        const handleAddCustomDivision = () => {
            if (!customDivisionName.trim() || !customDivisionAssocId) return;
            setFormData(prev => ({
                ...prev,
                disciplines: prev.disciplines.map(disc => {
                    if (disc.id === pbbDiscipline.id) {
                        const newCustomDivisions = Array.isArray(disc.customDivisions) ? [...disc.customDivisions] : [];
                        const newDivision = { name: customDivisionName, assocId: customDivisionAssocId };
                        if (!newCustomDivisions.some(d => d.name === newDivision.name && d.assocId === newDivision.assocId)) {
                            newCustomDivisions.push(newDivision);
                        }
                        return { ...disc, customDivisions: newCustomDivisions };
                    }
                    return disc;
                })
            }));
            setCustomDivisionName('');
            setIsCustomDivisionModalOpen(false);
            setCustomDivisionAssocId(null);
        };
    
        const handleRemoveCustomDivision = (disciplineId, divisionName, assocId) => {
            setFormData(prev => ({
                ...prev,
                disciplines: prev.disciplines.map(disc => {
                    if (disc.id === disciplineId) {
                        const newCustomDivisions = (disc.customDivisions || []).filter(d => !(d.name === divisionName && d.assocId === assocId));
                        const newDivisions = { ...disc.divisions };
                        if (newDivisions[assocId]) {
                            delete newDivisions[assocId][`custom-${divisionName}`];
                        }
                        return { ...disc, customDivisions: newCustomDivisions, divisions: newDivisions };
                    }
                    return disc;
                })
            }));
        };
    
        const handleDivisionChange = (disciplineId, assocId, groupName, level, isChecked, isCustom = false) => {
            setFormData(prev => {
                return {
                    ...prev,
                    disciplines: prev.disciplines.map(disc => {
                        if (disc.id === disciplineId) {
                            const newDivisions = { ...(disc.divisions || {}) };
                            if (!newDivisions[assocId]) newDivisions[assocId] = {};
                            const key = isCustom ? `custom-${groupName}` : `${groupName} - ${level}`;
                            if (isChecked) {
                                newDivisions[assocId][key] = true;
                            } else {
                                delete newDivisions[assocId][key];
                            }
                            
                            let newDivisionOrder = disc.divisionOrder ? [...disc.divisionOrder] : [];
                            const divisionIdentifier = `${assocId}-${key}`;
    
                            if (isChecked) {
                                if (!newDivisionOrder.includes(divisionIdentifier)) {
                                    newDivisionOrder.push(divisionIdentifier);
                                }
                            } else {
                                newDivisionOrder = newDivisionOrder.filter(d => d !== divisionIdentifier);
                            }

                            return { ...disc, divisions: newDivisions, divisionOrder: newDivisionOrder };
                        }
                        return disc;
                    })
                }
            });
        };
    
        const getDivisionsForDiscipline = useMemo(() => {
            if (!pbbDiscipline || !associationsData || !divisionsData) return {};
        
            let relevantAssocIds = Object.keys(pbbDiscipline.selectedAssociations || {});
        
            const isStandaloneMode = formData.nsbaApprovalType === 'standalone' || formData.nsbaApprovalType === 'both';
            if (isStandaloneMode && pbbDiscipline.selectedAssociations['NSBA'] && !relevantAssocIds.includes('NSBA')) {
                relevantAssocIds.push('NSBA');
            }
        
            const divisionMap = {};
            const noOpenDisciplines = ['Showmanship at Halter', 'Hunt Seat Equitation', 'Western Horsemanship'];
            // Also hide open categories for disciplines containing "Amateur"
            const shouldHideOpenCategories = noOpenDisciplines.includes(pbbDiscipline.name) || 
                                            (pbbDiscipline.name && pbbDiscipline.name.toLowerCase().includes('amateur'));
        
            relevantAssocIds.forEach(assocId => {
                const assocData = associationsData.find(a => a.id === assocId);
                if (assocData && divisionsData[assocId]) {
                    let divisions = divisionsData[assocId];
        
                    // Support multiple sub-association types
                    const selectedSubTypes = formData.subAssociationSelections?.[assocId]?.types || [];
                    
                    // Filter divisions based on the discipline's sub_association_type
                    // If the discipline has a sub_association_type, only show divisions for that type
                    if (pbbDiscipline.sub_association_type) {
                        divisions = divisions.filter(d => 
                            d.sub_association_type === pbbDiscipline.sub_association_type || 
                            !d.sub_association_type
                        );
                    } else if (selectedSubTypes.length > 0) {
                        // If no specific sub-type on discipline but association has selected sub-types,
                        // show divisions without sub-type restrictions
                        divisions = divisions.filter(d => !d.sub_association_type);
                    }
                    
                    // Filter Non-Pro levels for AQHA based on discipline name
                    const isAQHA = assocId === 'AQHA';
                    const aqhaCustomDisciplines = ['Showmanship at Halter', 'Horsemanship', 'Hunt Seat Equitation'];
                    const shouldFilterNonPro = isAQHA && aqhaCustomDisciplines.includes(pbbDiscipline.name);
                    
                    divisionMap[assocId] = divisions
                        .filter(d => {
                            if (shouldHideOpenCategories) {
                                return d.group.toLowerCase() !== 'open';
                            }
                            return true;
                        })
                        .map(d => {
                            // Filter Non-Pro levels to only show matching discipline
                            if (shouldFilterNonPro && d.group === 'Non-Pro') {
                                return {
                                    ...d,
                                    levels: d.levels.filter(level => {
                                        // Match the level to the current discipline
                                        const disciplineKeyword = pbbDiscipline.name.replace(' at Halter', '');
                                        return level.includes(disciplineKeyword);
                                    })
                                };
                            }
                            return d;
                        });
                } else if (assocData) {
                    divisionMap[assocId] = [];
                }
            });
            return divisionMap;
        }, [pbbDiscipline, associationsData, divisionsData, formData.nsbaApprovalType, formData.subAssociationSelections]);
    
        const hasSelectedDivisions = pbbDiscipline.divisions && Object.values(pbbDiscipline.divisions).some(divs => {
            if (isOpenShowMode && pbbDiscipline.isCustom) {
                return Object.values(divs || {}).some(levels => Array.isArray(levels) && levels.length > 0);
            }
            return Object.keys(divs || {}).length > 0;
        });
    
        const isCustomOpenShowDiscipline = pbbDiscipline.isCustom && isOpenShowMode;
    
        const hasScheduled = pbbDiscipline.divisionOrder && pbbDiscipline.divisionOrder.length > 0;

        const nsbaDualApprovedWith = formData.nsbaDualApprovedWith || [];

        return (
            <Tabs defaultValue="divisions">
                {!isCustomOpenShowDiscipline && pbbDiscipline.category?.startsWith('pattern') && (
                    <div className="flex gap-6 mb-4">
                        <div className="flex items-center space-x-2"><Checkbox id={`pat-${pbbDiscipline.id}`} checked={pbbDiscipline.pattern} onCheckedChange={(c) => handleDisciplineConfigChange(pbbDiscipline.id, 'pattern', c)}/><Label htmlFor={`pat-${pbbDiscipline.id}`} className="font-normal">Pattern</Label></div>
                        <div className="flex items-center space-x-2"><Checkbox id={`sco-${pbbDiscipline.id}`} checked={pbbDiscipline.scoresheet} onCheckedChange={(c) => handleDisciplineConfigChange(pbbDiscipline.id, 'scoresheet', c)}/><Label htmlFor={`sco-${pbbDiscipline.id}`} className="font-normal">Scoresheet</Label></div>
                    </div>
                )}
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="divisions">1. Select Divisions</TabsTrigger>
                    <TabsTrigger value="schedule" disabled={!hasSelectedDivisions}>2. Add Dates &amp; Arrange Classes</TabsTrigger>
                    <TabsTrigger value="grouping" disabled={!pbbDiscipline.pattern || !hasScheduled}>3. Sort Classes by Pattern Level</TabsTrigger>
                </TabsList>
                <TabsContent value="divisions" className="mt-4">
                    {isCustomOpenShowDiscipline ? (
                        <CustomDivisionManager pbbDiscipline={pbbDiscipline} setFormData={setFormData} />
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(getDivisionsForDiscipline).map(([assocId, divisionGroups]) => {
                                const assoc = associationsData.find(a => a.id === assocId);
                                const subTypeId = pbbDiscipline.sub_association_type;
                                const subTypeName = subTypeId && assoc?.sub_association_info?.types.find(t => t.id === subTypeId)?.name;
                                
                                return (
                                    <div key={assocId} className="p-3 border rounded-md">
                                        <div className="flex items-center space-x-2 mb-2 flex-wrap">
                                            <Badge variant={assoc?.color || 'secondary'}>
                                                {assoc?.name || assocId}
                                            </Badge>
                                            {subTypeName && (
                                                <Badge variant="outline" className="bg-primary/10">
                                                    {subTypeName}
                                                </Badge>
                                            )}
                                            {pbbDiscipline.isDualApproved && nsbaDualApprovedWith.includes(assocId) && <Badge variant="dualApproved">NSBA Dual-Approved</Badge>}
                                            {pbbDiscipline.isNsbaStandalone && assocId === 'NSBA' && <Badge variant="standalone">NSBA Standalone</Badge>}
                                        </div>
                                        {divisionGroups && Array.isArray(divisionGroups) && divisionGroups.length > 0 ? divisionGroups.map((group, index) => (
                                            <div key={`${assocId}-${group.group}-${index}`} className="mt-2 pl-2">
                                                <p className="text-sm font-medium text-muted-foreground">{group.group}</p>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-1">
                                                    {group.levels.map(level => {
                                                        const key = `${group.group} - ${level}`;
                                                        return (
                                                            <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )) : <p className="text-xs text-muted-foreground pl-2">No divisions found for this association.</p>}
     
                                        <div className="mt-2 pl-2">
                                            <p className="text-sm font-medium text-muted-foreground">Custom Divisions</p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-1">
                                                {(pbbDiscipline.customDivisions || []).filter(d => d.assocId === assocId).map(customDiv => (
                                                    <div key={customDiv.name} className="flex items-center space-x-2 bg-muted/50 p-1 rounded-md">
                                                        <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${customDiv.name}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][`custom-${customDiv.name}`])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, customDiv.name, '', c, true)} />
                                                        <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${customDiv.name}`} className="font-normal text-xs flex-grow">{customDiv.name}</Label>
                                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemoveCustomDivision(pbbDiscipline.id, customDiv.name, assocId)}>
                                                            <Trash2 className="h-3 w-3 text-destructive" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div >
                                        <Button variant="outline" size="sm" className="mt-2" onClick={() => { setCustomDivisionAssocId(assocId); setIsCustomDivisionModalOpen(true); }}>
                                            <PlusCircle className="h-4 w-4 mr-2" />Add Custom Division
                                        </Button>
                                    </div>
                                );
                            })}
                             <Dialog open={isCustomDivisionModalOpen} onOpenChange={setIsCustomDivisionModalOpen}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Custom Division</DialogTitle>
                                        <DialogDescription>Enter a name for a new division for {associationsData.find(a => a.id === customDivisionAssocId)?.name || customDivisionAssocId}.</DialogDescription>
                                    </DialogHeader>
                                    <Input value={customDivisionName} onChange={(e) => setCustomDivisionName(e.target.value)} placeholder="E.g., Leadline 8 & Under" />
                                    <DialogFooter>
                                        <Button onClick={handleAddCustomDivision}>Add Division</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="schedule" className="mt-4">
                    <ScheduleOrganizer
                        pbbDiscipline={pbbDiscipline}
                        setFormData={setFormData}
                        formData={formData}
                        associationsData={associationsData}
                    />
                </TabsContent>
                <TabsContent value="grouping" className="mt-4">
                    <PatternGrouping
                        pbbDiscipline={pbbDiscipline}
                        setFormData={setFormData}
                        isCustomOpenShow={isCustomOpenShowDiscipline}
                        formData={formData}
                        associationsData={associationsData}
                    />
                </TabsContent>
            </Tabs>
        );
    };