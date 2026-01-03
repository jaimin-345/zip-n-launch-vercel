import React, { useMemo, useState, useEffect, useRef } from 'react';
    import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Label } from '@/components/ui/label';
    import { Badge } from '@/components/ui/badge';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
    import { Input } from '@/components/ui/input';
    import { Button } from '@/components/ui/button';
    import { PlusCircle, Trash2, CheckCircle2, Circle, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
    import { PatternGrouping } from '@/components/pbb/PatternGrouping';
    import { ScheduleOrganizer } from '@/components/pbb/ScheduleOrganizer';
    import { cn } from '@/lib/utils';
    import { supabase } from '@/lib/supabaseClient';
    import { useToast } from '@/components/ui/use-toast';
    
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
            <div className="space-y-3">
                <h4 className="font-semibold text-base">Select Divisions for "{pbbDiscipline.name}"</h4>
                <div className="space-y-2">
                    {openShowSuggestions.divisions.map(group => (
                        <div key={group.group}>
                            <p className="text-xs font-medium text-muted-foreground">{group.group}</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 mt-1">
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
    
    export const ClassTabs = ({ pbbDiscipline, mergedDisciplines, setFormData, isOpenShowMode, formData, associationsData, divisionsData, isComplete }) => {
        const [customDivisionName, setCustomDivisionName] = React.useState('');
        const [isCustomDivisionModalOpen, setIsCustomDivisionModalOpen] = React.useState(false);
        const [customDivisionAssocId, setCustomDivisionAssocId] = React.useState(null);
        const [activeAssocTab, setActiveAssocTab] = React.useState(null);
        const [activeTab, setActiveTab] = React.useState('divisions');
        const prevDisciplineIdRef = React.useRef(null);
        const [nextStepHighlight, setNextStepHighlight] = useState(null);
        const [hasJustCompleted, setHasJustCompleted] = useState(false);
        const scheduleTabRef = useRef(null);
        const groupingTabRef = useRef(null);
        const prevHasSelectedDivisions = useRef(false);
        const prevHasScheduled = useRef(false);
        const [isSavingCustomDivision, setIsSavingCustomDivision] = useState(false);
        const { toast } = useToast();

        // Use mergedDisciplines if provided, otherwise just the single discipline
        const allDisciplines = mergedDisciplines && mergedDisciplines.length > 0 ? mergedDisciplines : [pbbDiscipline];
        
        // Get unique association IDs from all merged disciplines
        const associationTabsData = useMemo(() => {
            const assocMap = {};
            allDisciplines.forEach(disc => {
                const selectedAssocs = Object.keys(disc.selectedAssociations || {});
                selectedAssocs.forEach(assocId => {
                    if (!assocMap[assocId]) {
                        const assoc = associationsData?.find(a => a.id === assocId);
                        assocMap[assocId] = {
                            id: assocId,
                            name: assoc?.name || assocId,
                            abbreviation: assoc?.abbreviation || assocId,
                            discipline: disc
                        };
                    }
                });
            });
            return Object.values(assocMap);
        }, [allDisciplines, associationsData]);

        // Set default active tab if not set
        React.useEffect(() => {
            if (!activeAssocTab && associationTabsData.length > 0) {
                setActiveAssocTab(associationTabsData[0].id);
            }
        }, [activeAssocTab, associationTabsData]);

        // Get the currently active discipline based on selected tab
        const activeDiscipline = useMemo(() => {
            const activeAssocData = associationTabsData.find(a => a.id === activeAssocTab);
            return activeAssocData?.discipline || pbbDiscipline;
        }, [activeAssocTab, associationTabsData, pbbDiscipline]);
    
        const handleDisciplineConfigChange = (disciplineId, configKey, value) => {
            setFormData(prev => ({ ...prev, disciplines: prev.disciplines.map(c => c.id === disciplineId ? { ...c, [configKey]: value } : c) }));
        };
    
        const handleAddCustomDivision = async () => {
            if (!customDivisionName.trim() || !customDivisionAssocId) return;
            
            setIsSavingCustomDivision(true);
            
            try {
                // Save to database
                const { data: maxSortOrder } = await supabase
                    .from('divisions')
                    .select('sort_order')
                    .eq('association_id', customDivisionAssocId)
                    .order('sort_order', { ascending: false })
                    .limit(1)
                    .single();
                
                const newSortOrder = (maxSortOrder?.sort_order || 0) + 1;
                
                const { error: insertError } = await supabase
                    .from('divisions')
                    .insert({
                        name: customDivisionName.trim(),
                        association_id: customDivisionAssocId,
                        sort_order: newSortOrder
                    });
                
                if (insertError) {
                    console.error('Error saving custom division to DB:', insertError);
                    toast({
                        title: "Database Save Failed",
                        description: "Division was added locally but could not be saved to database.",
                        variant: "destructive",
                    });
                } else {
                    toast({
                        title: "Custom Division Added",
                        description: `"${customDivisionName.trim()}" has been saved to the database.`,
                    });
                }
                
                // Always update local state
                setFormData(prev => ({
                    ...prev,
                    disciplines: prev.disciplines.map(disc => {
                        if (disc.id === pbbDiscipline.id) {
                            const newCustomDivisions = Array.isArray(disc.customDivisions) ? [...disc.customDivisions] : [];
                            const newDivision = { name: customDivisionName.trim(), assocId: customDivisionAssocId };
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
            } catch (error) {
                console.error('Error in handleAddCustomDivision:', error);
                toast({
                    title: "Error",
                    description: "Failed to add custom division.",
                    variant: "destructive",
                });
            } finally {
                setIsSavingCustomDivision(false);
            }
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

                            // When unchecking, also remove division from pattern groups
                            let newPatternGroups = disc.patternGroups || [];
                            if (!isChecked) {
                                newPatternGroups = newPatternGroups.map(group => ({
                                    ...group,
                                    divisions: (group.divisions || []).filter(d => d.id !== divisionIdentifier)
                                }));
                                
                                // Also remove from divisionDates and divisionPrintTitles
                                const newDivisionDates = { ...(disc.divisionDates || {}) };
                                const newDivisionPrintTitles = { ...(disc.divisionPrintTitles || {}) };
                                delete newDivisionDates[divisionIdentifier];
                                delete newDivisionPrintTitles[divisionIdentifier];
                                
                                return { 
                                    ...disc, 
                                    divisions: newDivisions, 
                                    divisionOrder: newDivisionOrder, 
                                    patternGroups: newPatternGroups,
                                    divisionDates: newDivisionDates,
                                    divisionPrintTitles: newDivisionPrintTitles
                                };
                            }

                            return { ...disc, divisions: newDivisions, divisionOrder: newDivisionOrder };
                        }
                        return disc;
                    })
                }
            });
        };
    
        const getDivisionsForDiscipline = useMemo(() => {
            if (!associationsData || !divisionsData) return {};
        
            // Collect all relevant association IDs from all merged disciplines
            let relevantAssocIds = [];
            allDisciplines.forEach(disc => {
                const assocIds = Object.keys(disc.selectedAssociations || {});
                assocIds.forEach(id => {
                    if (!relevantAssocIds.includes(id)) {
                        relevantAssocIds.push(id);
                    }
                });
            });
        
            const isStandaloneMode = formData.nsbaApprovalType === 'standalone' || formData.nsbaApprovalType === 'both';
            allDisciplines.forEach(disc => {
                if (isStandaloneMode && disc.selectedAssociations?.['NSBA'] && !relevantAssocIds.includes('NSBA')) {
                    relevantAssocIds.push('NSBA');
                }
            });
        
            const divisionMap = {};
            const noOpenDisciplines = ['Showmanship at Halter', 'Hunt Seat Equitation', 'Western Horsemanship'];
            // Also hide open categories for disciplines containing "Amateur"
            const shouldHideOpenCategories = noOpenDisciplines.includes(pbbDiscipline.name) || 
                                            (pbbDiscipline.name && pbbDiscipline.name.toLowerCase().includes('amateur'));
        
            relevantAssocIds.forEach(assocId => {
                // Find the discipline that has this association
                const discForAssoc = allDisciplines.find(d => d.selectedAssociations?.[assocId]);
                const assocData = associationsData.find(a => a.id === assocId);
                if (assocData && divisionsData[assocId]) {
                    let divisions = divisionsData[assocId];
        
                    // Support multiple sub-association types
                    const selectedSubTypes = formData.subAssociationSelections?.[assocId]?.types || [];
                    
                    // Filter divisions based on the discipline's sub_association_type
                    // If the discipline has a sub_association_type, only show divisions for that type
                    if (discForAssoc?.sub_association_type) {
                        divisions = divisions.filter(d => 
                            d.sub_association_type === discForAssoc.sub_association_type || 
                            !d.sub_association_type
                        );
                    } else if (selectedSubTypes.length > 0) {
                        // If no specific sub-type on discipline but association has selected sub-types,
                        // show divisions without sub-type restrictions
                        divisions = divisions.filter(d => !d.sub_association_type);
                    }
                    
                    // Non-Pro divisions should only be shown for specific disciplines
                    const nonProAllowedDisciplines = ['Showmanship at Halter', 'Horsemanship', 'Hunt Seat Equitation'];
                    const shouldShowNonPro = nonProAllowedDisciplines.includes(pbbDiscipline.name);
                    
                    // Associations that should only show Open, Non-Pro, Youth (hide Amateur)
                    const openNonProYouthOnlyAssocs = ['SHTX', 'NRHA', 'NRCHA'];
                    const isOpenNonProYouthOnlyAssoc = openNonProYouthOnlyAssocs.includes(assocId);
                    
                    divisionMap[assocId] = divisions
                        .filter(d => {
                            if (shouldHideOpenCategories) {
                                return d.group.toLowerCase() !== 'open';
                            }
                            // Hide Non-Pro division group entirely unless discipline allows it (for non Open/Non-Pro/Youth only assocs)
                            if (d.group === 'Non-Pro' && !shouldShowNonPro && !isOpenNonProYouthOnlyAssoc) {
                                return false;
                            }
                            // Hide Amateur for SHTX/NRHA - only show Open, Non-Pro, Youth
                            if (isOpenNonProYouthOnlyAssoc && d.group === 'Amateur') {
                                return false;
                            }
                            return true;
                        })
                        .map(d => {
                            // Filter Non-Pro levels to only show matching discipline (for non Open/Non-Pro/Youth only assocs)
                            if (shouldShowNonPro && d.group === 'Non-Pro' && !isOpenNonProYouthOnlyAssoc) {
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
        }, [allDisciplines, pbbDiscipline, associationsData, divisionsData, formData.nsbaApprovalType, formData.subAssociationSelections]);
    
        // Check hasSelectedDivisions across all merged disciplines
        const hasSelectedDivisions = allDisciplines.some(disc => 
            disc.divisions && Object.values(disc.divisions).some(divs => {
                if (isOpenShowMode && disc.isCustom) {
                    return Object.values(divs || {}).some(levels => Array.isArray(levels) && levels.length > 0);
                }
                return Object.keys(divs || {}).length > 0;
            })
        );
    
        const isCustomOpenShowDiscipline = pbbDiscipline.isCustom && isOpenShowMode;
    
        // Check hasScheduled across all merged disciplines
        // Step 2 is complete when divisions have dates assigned, not just when they're in divisionOrder
        const hasScheduled = allDisciplines.some(disc => {
            if (!disc.divisionOrder || disc.divisionOrder.length === 0) return false;
            // Check if at least one division has a date assigned
            return disc.divisionOrder.some(divId => 
                disc.divisionDates && disc.divisionDates[divId]
            );
        });

        // Check if this is a scoresheet-only discipline
        const isScoresheetOnly = allDisciplines.some(disc => 
            disc && (disc.pattern_type === 'scoresheet_only' || (!disc.pattern && disc.scoresheet))
        );

        // Get dual-approved settings for NSBA, NRHA, and NRCHA
        const dualApprovedSettings = useMemo(() => {
            const subSelections = formData.subAssociationSelections || {};
            const settings = {};
            
            ['nsba', 'nrha', 'nrcha'].forEach(assocKey => {
                const approvalType = subSelections[assocKey]?.approvalType;
                const dualApprovedWith = subSelections[assocKey]?.dualApprovedWith || [];
                if ((approvalType === 'dual' || approvalType === 'both') && dualApprovedWith.length > 0) {
                    settings[assocKey.toUpperCase()] = dualApprovedWith;
                }
            });
            
            return settings;
        }, [formData.subAssociationSelections]);

        // Helper to find the correct discipline for a given association ID
        const getDisciplineForAssoc = (assocId) => {
            return allDisciplines.find(d => d.selectedAssociations?.[assocId]) || pbbDiscipline;
        };

        // Determine step completion status
        const step1Complete = hasSelectedDivisions;
        const step2Complete = hasScheduled;
        const step3Complete = !isScoresheetOnly && pbbDiscipline.pattern && hasScheduled && 
            (() => {
                // Check if all selected divisions are grouped
                const allSelectedDivisions = new Set();
                const allGroupedDivisions = new Set();
                allDisciplines.forEach(disc => {
                    if (disc.divisionOrder) {
                        disc.divisionOrder.forEach(divId => allSelectedDivisions.add(divId));
                    }
                    const groups = disc.patternGroups || [];
                    groups.forEach(g => {
                        (g.divisions || []).forEach(d => allGroupedDivisions.add(d.id));
                    });
                });
                return allSelectedDivisions.size > 0 && 
                       allSelectedDivisions.size === allGroupedDivisions.size && 
                       [...allSelectedDivisions].every(d => allGroupedDivisions.has(d));
            })();

        // Determine which step should be active/next based on current tab
        const getCurrentStep = () => {
            // Base current step on which tab is active, not just completion status
            if (activeTab === 'divisions') {
                return 1;
            } else if (activeTab === 'schedule') {
                return 2;
            } else if (activeTab === 'grouping') {
                return 3;
            }
            // Fallback: determine by completion status
            if (!step1Complete) return 1;
            if (!step2Complete) return 2;
            if (!step3Complete && !isScoresheetOnly && pbbDiscipline.pattern) return 3;
            return null; // All complete
        };

        const currentStep = getCurrentStep();
        const nextStep = currentStep ? currentStep + 1 : null;

        // Auto-switch to next step when current completes (only for Step 2 -> Step 3)
        useEffect(() => {
            const scheduleJustCompleted = !prevHasScheduled.current && hasScheduled;

            // Only auto-redirect from Step 2 to Step 3, not from Step 1 to Step 2
            if (scheduleJustCompleted && activeTab === 'schedule' && !isScoresheetOnly && pbbDiscipline.pattern) {
                setHasJustCompleted(true);
                setNextStepHighlight('grouping');
                // Auto-switch to grouping tab after a brief delay
                setTimeout(() => {
                    setActiveTab('grouping');
                    setHasJustCompleted(false);
                    // Scroll to grouping tab
                    setTimeout(() => {
                        groupingTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }, 800);
            }

            prevHasSelectedDivisions.current = hasSelectedDivisions;
            prevHasScheduled.current = hasScheduled;
        }, [hasSelectedDivisions, hasScheduled, activeTab, isScoresheetOnly, pbbDiscipline.pattern]);

        // Auto-open appropriate tab when component mounts or discipline changes
        React.useEffect(() => {
            const disciplineChanged = prevDisciplineIdRef.current !== pbbDiscipline.id;
            if (disciplineChanged || prevDisciplineIdRef.current === null) {
                prevDisciplineIdRef.current = pbbDiscipline.id;
                prevHasSelectedDivisions.current = hasSelectedDivisions;
                prevHasScheduled.current = hasScheduled;
                
                if (isScoresheetOnly) {
                    setActiveTab('divisions');
                } else {
                    if (pbbDiscipline.pattern && hasScheduled) {
                        setActiveTab('grouping');
                    } else if (hasSelectedDivisions) {
                        setActiveTab('schedule');
                    } else {
                        setActiveTab('divisions');
                    }
                }
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [pbbDiscipline.id, isScoresheetOnly]);

        // Clear highlight when user interacts with highlighted tab
        useEffect(() => {
            if (nextStepHighlight && activeTab === nextStepHighlight) {
                const timer = setTimeout(() => setNextStepHighlight(null), 2000);
                return () => clearTimeout(timer);
            }
        }, [activeTab, nextStepHighlight]);

        // Step indicator component
        const StepIndicator = ({ step, label, stepNumber, isComplete, isActive, isNext, onClick, disabled }) => {
            const isHighlighted = isNext && nextStepHighlight === step;
            return (
                <div 
                    className={cn(
                        "flex items-center gap-2 cursor-pointer transition-all duration-300",
                        disabled && "opacity-50 cursor-not-allowed",
                        isHighlighted && "animate-pulse"
                    )}
                    onClick={!disabled ? onClick : undefined}
                >
                    <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                        isComplete && "bg-green-500 border-green-500 text-white",
                        !isComplete && isActive && "bg-primary border-primary text-white",
                        !isComplete && !isActive && !isNext && "bg-muted border-muted-foreground text-muted-foreground",
                        isNext && !isComplete && "bg-blue-500/20 border-blue-500 text-blue-600 dark:bg-blue-500/30 dark:border-blue-400 dark:text-blue-400",
                        isHighlighted && "ring-4 ring-blue-400/50 shadow-lg shadow-blue-500/50"
                    )}>
                        {isComplete ? (
                            <CheckCircle2 className="w-5 h-5" />
                        ) : (
                            <span className="text-sm font-semibold">{stepNumber}</span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-sm font-medium transition-colors",
                            isActive && "text-primary",
                            isNext && !isComplete && "text-blue-600 dark:text-blue-400",
                            !isActive && !isNext && "text-muted-foreground"
                        )}>
                            {label}
                        </span>
                        {isNext && !isComplete && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" />
                                Next step
                            </span>
                        )}
                    </div>
                    {stepNumber < 3 && (
                        <div className={cn(
                            "flex-1 h-0.5 mx-2 transition-colors",
                            isComplete ? "bg-green-500" : "bg-muted"
                        )} />
                    )}
                </div>
            );
        };

        return (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                {!isCustomOpenShowDiscipline && pbbDiscipline.category?.startsWith('pattern') && (
                    <div className="flex gap-4 mb-4">
                        <div className="flex items-center space-x-2"><Checkbox id={`pat-${pbbDiscipline.id}`} checked={pbbDiscipline.pattern} onCheckedChange={(c) => handleDisciplineConfigChange(pbbDiscipline.id, 'pattern', c)}/><Label htmlFor={`pat-${pbbDiscipline.id}`} className="font-normal">Pattern</Label></div>
                        <div className="flex items-center space-x-2"><Checkbox id={`sco-${pbbDiscipline.id}`} checked={pbbDiscipline.scoresheet} onCheckedChange={(c) => handleDisciplineConfigChange(pbbDiscipline.id, 'scoresheet', c)}/><Label htmlFor={`sco-${pbbDiscipline.id}`} className="font-normal">Scoresheet</Label></div>
                    </div>
                )}
                
                {/* Step-by-Step Flow Indicator */}
                <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-foreground">Configuration Steps</h3>
                        {currentStep && (
                            <Badge variant={currentStep === null ? "default" : "secondary"} className="text-xs">
                                Step {currentStep} of 3
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <StepIndicator
                            step="divisions"
                            stepNumber={1}
                            label="Select Divisions"
                            isComplete={step1Complete}
                            isActive={activeTab === 'divisions'}
                            isNext={false}
                            onClick={() => setActiveTab('divisions')}
                            disabled={false}
                        />
                        <StepIndicator
                            step="schedule"
                            stepNumber={2}
                            label="Add Dates & Arrange Classes"
                            isComplete={step2Complete}
                            isActive={activeTab === 'schedule'}
                            isNext={currentStep === 1 && step1Complete && !step2Complete}
                            onClick={() => setActiveTab('schedule')}
                            disabled={!hasSelectedDivisions}
                        />
                        {!isScoresheetOnly && pbbDiscipline.pattern && (
                            <StepIndicator
                                step="grouping"
                                stepNumber={3}
                                label="Sort Classes by Pattern Level"
                                isComplete={step3Complete}
                                isActive={activeTab === 'grouping'}
                                isNext={currentStep === 2 && step2Complete && !step3Complete}
                                onClick={() => setActiveTab('grouping')}
                                disabled={!hasScheduled}
                            />
                        )}
                    </div>
                </div>

                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger 
                        value="divisions"
                        className={cn(
                            activeTab === 'divisions' && "bg-primary text-primary-foreground",
                            !step1Complete && activeTab !== 'divisions' && "opacity-60"
                        )}
                    >
                        1. Select Divisions
                        {step1Complete && <CheckCircle2 className="ml-2 w-4 h-4" />}
                    </TabsTrigger>
                    <TabsTrigger 
                        ref={scheduleTabRef}
                        value="schedule" 
                        disabled={!hasSelectedDivisions}
                        className={cn(
                            nextStepHighlight === 'schedule' && "ring-2 ring-blue-500 ring-offset-2 animate-pulse",
                            activeTab === 'schedule' && "bg-primary text-primary-foreground",
                            !hasSelectedDivisions && "opacity-50"
                        )}
                    >
                        2. Add Dates &amp; Arrange Classes
                        {step2Complete && <CheckCircle2 className="ml-2 w-4 h-4" />}
                        {!hasSelectedDivisions && <AlertCircle className="ml-2 w-4 h-4" />}
                    </TabsTrigger>
                    <TabsTrigger 
                        ref={groupingTabRef}
                        value="grouping" 
                        disabled={isScoresheetOnly || !pbbDiscipline.pattern || !hasScheduled}
                        className={cn(
                            nextStepHighlight === 'grouping' && "ring-2 ring-blue-500 ring-offset-2 animate-pulse",
                            activeTab === 'grouping' && "bg-primary text-primary-foreground",
                            (isScoresheetOnly || !pbbDiscipline.pattern || !hasScheduled) && "opacity-50"
                        )}
                    >
                        3. Sort Classes by Pattern Level
                        {step3Complete && <CheckCircle2 className="ml-2 w-4 h-4" />}
                        {(isScoresheetOnly || !pbbDiscipline.pattern || !hasScheduled) && <AlertCircle className="ml-2 w-4 h-4" />}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="divisions" className="mt-2">
                    {isCustomOpenShowDiscipline ? (
                        <CustomDivisionManager pbbDiscipline={pbbDiscipline} setFormData={setFormData} />
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(getDivisionsForDiscipline).map(([assocId, divisionGroups]) => {
                                const assoc = associationsData.find(a => a.id === assocId);
                                const discForAssoc = getDisciplineForAssoc(assocId);
                                const subTypeId = discForAssoc.sub_association_type;
                                const subTypeName = subTypeId && assoc?.sub_association_info?.types.find(t => t.id === subTypeId)?.name;
                                
                                return (
                                    <div key={assocId} className="p-2.5 border rounded-md">
                                        <div className="flex items-center space-x-2 mb-1.5 flex-wrap">
                                            <Badge variant={assoc?.color || 'secondary'}>
                                                {assoc?.name || assocId}
                                            </Badge>
                                            {subTypeName && (
                                                <Badge variant="outline" className="bg-primary/10">
                                                    {subTypeName}
                                                </Badge>
                                            )}
                                            {/* Show dual-approved badges for NSBA, NRHA, NRCHA */}
                                            {Object.entries(dualApprovedSettings).map(([dualAssocId, dualApprovedWith]) => {
                                                if (dualApprovedWith.includes(assocId)) {
                                                    return <Badge key={`dual-${dualAssocId}`} variant="dualApproved">{dualAssocId} Dual-Approved</Badge>;
                                                }
                                                return null;
                                            })}
                                            {discForAssoc.isNsbaStandalone && assocId === 'NSBA' && <Badge variant="standalone">NSBA Standalone</Badge>}
                                        </div>
                                        {divisionGroups && Array.isArray(divisionGroups) && divisionGroups.length > 0 ? divisionGroups.map((group, index) => {
                                            // Custom 4-column layout for AQHA Amateur divisions
                                            const isAQHAAmateur = assocId === 'AQHA' && group.group === 'Amateur';
                                            
                                            if (isAQHAAmateur) {
                                                const column1Levels = ['Amateur', 'Amateur Select'];
                                                const column2Levels = ['Amateur Rookie', 'Amateur Select Rookie (50+)', 'Amateur Level 1', 'Amateur Select Level 1'];
                                                const column3Levels = ['Amateur Level 2', 'Amateur Select Level 2'];
                                                const column4Levels = ['Amateur Level 3', 'Amateur Select Level 3'];
                                                
                                                // Match exact level names
                                                const col1 = group.levels.filter(level => column1Levels.includes(level));
                                                const col2 = group.levels.filter(level => column2Levels.includes(level));
                                                const col3 = group.levels.filter(level => column3Levels.includes(level));
                                                const col4 = group.levels.filter(level => column4Levels.includes(level));
                                                
                                                return (
                                                    <div key={`${assocId}-${group.group}-${index}`} className="mt-1.5 pl-1.5">
                                                        <p className="text-xs font-medium text-muted-foreground">{group.group}</p>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                                                            {/* Column 1 */}
                                                            <div className="space-y-1.5">
                                                                {col1.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${discForAssoc.id}-${assocId}-${key}`} checked={!!(discForAssoc.divisions && discForAssoc.divisions[assocId] && discForAssoc.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(discForAssoc.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${discForAssoc.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 2 */}
                                                            <div className="space-y-1.5">
                                                                {col2.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${discForAssoc.id}-${assocId}-${key}`} checked={!!(discForAssoc.divisions && discForAssoc.divisions[assocId] && discForAssoc.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(discForAssoc.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${discForAssoc.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 3 */}
                                                            <div className="space-y-1.5">
                                                                {col3.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${discForAssoc.id}-${assocId}-${key}`} checked={!!(discForAssoc.divisions && discForAssoc.divisions[assocId] && discForAssoc.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(discForAssoc.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${discForAssoc.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 4 */}
                                                            <div className="space-y-1.5">
                                                                {col4.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${discForAssoc.id}-${assocId}-${key}`} checked={!!(discForAssoc.divisions && discForAssoc.divisions[assocId] && discForAssoc.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(discForAssoc.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${discForAssoc.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            // Custom 4-column layout for AQHA Youth divisions
                                            const isAQHAYouth = assocId === 'AQHA' && group.group === 'Youth';
                                            
                                            if (isAQHAYouth) {
                                                const column1Levels = [
                                                    'Youth 13 & Under',
                                                    'Youth 14–18',
                                                    'Youth 18 & Under',
                                                    'Small Fry (9 & Under)',
                                                    'Walk-Trot Youth 13 & Under',
                                                    'Walk-Trot Youth 14–18',
                                                    'Walk-Trot Youth 18 & Under'
                                                ];
                                                const column2Levels = [
                                                    'Youth 13 & Under Rookie',
                                                    'Youth 14–18 Rookie',
                                                    'Youth 18 & Under Rookie',
                                                    'Youth 13 & Under Level 1',
                                                    'Youth 14–18 Level 1',
                                                    'Youth 18 & Under Level 1'
                                                ];
                                                const column3Levels = [
                                                    'Youth 13 & Under Level 2',
                                                    'Youth 14–18 Level 2',
                                                    'Youth 18 & Under Level 2'
                                                ];
                                                const column4Levels = [
                                                    'Youth 13 & Under Level 3',
                                                    'Youth 14–18 Level 3',
                                                    'Youth 18 & Under Level 3'
                                                ];
                                                
                                                // Match exact level names - maintain column order
                                                const col1 = column1Levels.filter(level => group.levels.includes(level));
                                                const col2 = column2Levels.filter(level => group.levels.includes(level));
                                                const col3 = column3Levels.filter(level => group.levels.includes(level));
                                                const col4 = column4Levels.filter(level => group.levels.includes(level));
                                                
                                                return (
                                                    <div key={`${assocId}-${group.group}-${index}`} className="mt-1.5 pl-1.5">
                                                        <p className="text-xs font-medium text-muted-foreground">{group.group}</p>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                                                            {/* Column 1 */}
                                                            <div className="space-y-1.5">
                                                                {col1.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 2 */}
                                                            <div className="space-y-1.5">
                                                                {col2.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 3 */}
                                                            <div className="space-y-1.5">
                                                                {col3.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 4 */}
                                                            <div className="space-y-1.5">
                                                                {col4.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            // Custom 3-column layout for APHA Open divisions
                                            const isAPHAOpen = assocId === 'APHA' && group.group === 'Open';
                                            
                                            if (isAPHAOpen) {
                                                const column1Levels = ['All-Ages', 'Junior Horse (5 & Under)', 'Senior Horse (6 & Over)'];
                                                const column2Levels = ['Green Horse'];
                                                const column3Levels = ['2-Year-Old', '3-Year-Old'];
                                                
                                                const col1 = column1Levels.filter(level => group.levels.includes(level));
                                                const col2 = column2Levels.filter(level => group.levels.includes(level));
                                                const col3 = column3Levels.filter(level => group.levels.includes(level));
                                                
                                                return (
                                                    <div key={`${assocId}-${group.group}-${index}`} className="mt-1.5 pl-1.5">
                                                        <p className="text-xs font-medium text-muted-foreground">{group.group}</p>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                                                            {/* Column 1 */}
                                                            <div className="space-y-1.5">
                                                                {col1.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 2 */}
                                                            <div className="space-y-1.5">
                                                                {col2.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 3 */}
                                                            <div className="space-y-1.5">
                                                                {col3.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            // Custom 3-column layout for APHA Amateur divisions
                                            const isAPHAAmateur = assocId === 'APHA' && group.group === 'Amateur';
                                            
                                            if (isAPHAAmateur) {
                                                const column1Levels = ['Amateur (19 & Over)', 'Classic Amateur (19–44)', 'Masters Amateur (45 & Over)'];
                                                const column2Levels = ['Novice Amateur'];
                                                const column3Levels = ['Amateur Walk-Trot (19 & Over)', 'Classic Amateur Walk-Trot (19 -44)', 'Masters Walk-Trot (45 & Over)'];
                                                
                                                const col1 = column1Levels.filter(level => group.levels.includes(level));
                                                const col2 = column2Levels.filter(level => group.levels.includes(level));
                                                const col3 = column3Levels.filter(level => group.levels.includes(level));
                                                
                                                return (
                                                    <div key={`${assocId}-${group.group}-${index}`} className="mt-1.5 pl-1.5">
                                                        <p className="text-xs font-medium text-muted-foreground">{group.group}</p>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                                                            {/* Column 1 */}
                                                            <div className="space-y-1.5">
                                                                {col1.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 2 */}
                                                            <div className="space-y-1.5">
                                                                {col2.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 3 */}
                                                            <div className="space-y-1.5">
                                                                {col3.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            // Custom 3-column layout for APHA Youth divisions
                                            const isAPHAYouth = assocId === 'APHA' && group.group === 'Youth';
                                            
                                            if (isAPHAYouth) {
                                                const column1Levels = ['Youth 18 & Under', 'Youth 13 & Under', 'Youth 14–18'];
                                                const column2Levels = ['Novice Youth (18 & Under)'];
                                                const column3Levels = ['Youth Walk-Trot 18 & Under', 'Youth Walk-Trot 5–10', 'Youth Walk-Trot 11–18'];
                                                
                                                const col1 = column1Levels.filter(level => group.levels.includes(level));
                                                const col2 = column2Levels.filter(level => group.levels.includes(level));
                                                const col3 = column3Levels.filter(level => group.levels.includes(level));
                                                
                                                return (
                                                    <div key={`${assocId}-${group.group}-${index}`} className="mt-1.5 pl-1.5">
                                                        <p className="text-xs font-medium text-muted-foreground">{group.group}</p>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                                                            {/* Column 1 */}
                                                            <div className="space-y-1.5">
                                                                {col1.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 2 */}
                                                            <div className="space-y-1.5">
                                                                {col2.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {/* Column 3 */}
                                                            <div className="space-y-1.5">
                                                                {col3.map(level => {
                                                                    const key = `${group.group} - ${level}`;
                                                                    return (
                                                                        <div key={`${assocId}-${level}`} className="flex items-center space-x-2">
                                                                            <Checkbox id={`div-${pbbDiscipline.id}-${assocId}-${key}`} checked={!!(pbbDiscipline.divisions && pbbDiscipline.divisions[assocId] && pbbDiscipline.divisions[assocId][key])} onCheckedChange={(c) => handleDivisionChange(pbbDiscipline.id, assocId, group.group, level, c, false)} />
                                                                            <Label htmlFor={`div-${pbbDiscipline.id}-${assocId}-${key}`} className="font-normal text-xs">{level}</Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            // Default layout for all other divisions
                                            return (
                                                <div key={`${assocId}-${group.group}-${index}`} className="mt-1.5 pl-1.5">
                                                    <p className="text-xs font-medium text-muted-foreground">{group.group}</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 mt-1">
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
                                            );
                                        }) : <p className="text-xs text-muted-foreground pl-2">No divisions found for this association.</p>}
     
                                        <div className="mt-1.5 pl-1.5">
                                            <p className="text-xs font-medium text-muted-foreground">Custom Divisions</p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 mt-1">
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
                                        <Button variant="outline" size="sm" className="mt-1.5" onClick={() => { setCustomDivisionAssocId(assocId); setIsCustomDivisionModalOpen(true); }}>
                                            <PlusCircle className="h-4 w-4 mr-2" />Add Custom Division
                                        </Button>
                                    </div>
                                );
                            })}
                             <Dialog open={isCustomDivisionModalOpen} onOpenChange={(open) => { if (!isSavingCustomDivision) setIsCustomDivisionModalOpen(open); }}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Custom Division</DialogTitle>
                                        <DialogDescription>Enter a name for a new division for {associationsData.find(a => a.id === customDivisionAssocId)?.name || customDivisionAssocId}. This will be saved to the database.</DialogDescription>
                                    </DialogHeader>
                                    <Input 
                                        value={customDivisionName} 
                                        onChange={(e) => setCustomDivisionName(e.target.value)} 
                                        placeholder="E.g., Leadline 8 & Under"
                                        disabled={isSavingCustomDivision}
                                    />
                                    <DialogFooter>
                                        <Button onClick={handleAddCustomDivision} disabled={isSavingCustomDivision || !customDivisionName.trim()}>
                                            {isSavingCustomDivision ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                'Add Division'
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </TabsContent>
                <TabsContent 
                    value="schedule" 
                    className={cn(
                        "mt-2 transition-all duration-300",
                        nextStepHighlight === 'schedule' && "ring-2 ring-blue-500/50 rounded-lg p-2 bg-blue-500/5"
                    )}
                >
                    <ScheduleOrganizer
                        pbbDiscipline={pbbDiscipline}
                        setFormData={setFormData}
                        formData={formData}
                        associationsData={associationsData}
                    />
                </TabsContent>
                <TabsContent 
                    value="grouping" 
                    className={cn(
                        "mt-2 transition-all duration-300",
                        nextStepHighlight === 'grouping' && "ring-2 ring-blue-500/50 rounded-lg p-2 bg-blue-500/5"
                    )}
                >
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