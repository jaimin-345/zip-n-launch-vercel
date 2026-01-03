import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Lock, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getAssociationLogo, getDefaultAssociationIcon } from '@/lib/associationsData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';

const DisciplineCheckboxWithDualApproved = ({ disc, selectedDisciplineKeys, onDisciplineToggle, getDisciplineKey, dualApprovedAssociations, dualApprovedSelections, onDualApprovedToggle, displayName, vrhRanchCowWorkOptions, selectedVrhRanchCowWork, onVrhRanchCowWorkSelect }) => {
    const isSelected = selectedDisciplineKeys.has(getDisciplineKey(disc));
    const disciplineKey = getDisciplineKey(disc);
    
    // Check if this is VRH-RHC Ranch CowWork for AQHA
    const showVrhRanchCowWorkDropdown = isSelected && 
        (disc.name === 'VRH-RHC Ranch CowWork' || disc.name === 'Ranch Cow Work') && 
        disc.association_id === 'AQHA' &&
        vrhRanchCowWorkOptions && 
        vrhRanchCowWorkOptions.length > 0;
    
    return (
        <div className="space-y-1">
            <div className="flex items-center space-x-2">
                <Checkbox
                    id={`disc-${disc.id}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => onDisciplineToggle(disc, checked)}
                />
                <Label htmlFor={`disc-${disc.id}`} className="font-normal cursor-pointer text-sm">
                    {displayName || disc.name}
                </Label>
            </div>
            {/* VRH-RHC Ranch CowWork Dropdown */}
            {showVrhRanchCowWorkDropdown && (
                <div className="ml-6 mt-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Select Scoresheet</Label>
                    <Select 
                        value={selectedVrhRanchCowWork || 'none'} 
                        onValueChange={(value) => onVrhRanchCowWorkSelect(disciplineKey, value === 'none' ? '' : value)}
                    >
                        <SelectTrigger className="w-56 h-8 text-xs">
                            <SelectValue placeholder="Select Scoresheet" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" className="text-xs">
                                Select Scoresheet
                            </SelectItem>
                            {vrhRanchCowWorkOptions.map(option => (
                                <SelectItem key={option.value} value={option.value} className="text-xs">
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {isSelected && dualApprovedAssociations && dualApprovedAssociations.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                    <span className="text-xs text-muted-foreground">Dual-Approved With:</span>
                    {dualApprovedAssociations.map(assocId => (
                        <div key={assocId} className="flex items-center space-x-2 ml-2">
                            <Checkbox
                                id={`dual-${disc.id}-${assocId}`}
                                checked={dualApprovedSelections?.[disciplineKey]?.[assocId] || false}
                                onCheckedChange={(checked) => onDualApprovedToggle(disciplineKey, assocId, checked)}
                                className="h-3 w-3"
                            />
                            <Label htmlFor={`dual-${disc.id}-${assocId}`} className="font-normal cursor-pointer text-xs text-muted-foreground">
                                {assocId}
                            </Label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const AQHACustomPatternCategory = ({ title, disciplines, selectedDisciplineKeys, onDisciplineToggle, associationId, getDisciplineKey, dualApprovedAssociations, dualApprovedSelections, onDualApprovedToggle, vrhRanchCowWorkOptions, vrhRanchCowWorkSelections, onVrhRanchCowWorkSelect, onAddCustomDiscipline }) => {
    // Define the custom 3-column layout based on association
    let leftColumn, middleColumn, rightColumn;
    
    if (associationId === 'ApHC') {
        leftColumn = ['Showmanship at Halter', 'Western Horsemanship', 'Bareback Horsemanship', 'Hunt Seat Equitation'];
        middleColumn = ['Trail', 'Ranch Trail'];
        rightColumn = ['Equitation Over Fences', 'Working Hunter', 'Hunter Hack', 'Jumping'];
    } else if (associationId === 'ABRA') {
        leftColumn = ['Showmanship at Halter', 'Western Horsemanship', 'Hunt Seat Equitation'];
        middleColumn = ['Trail', 'Ranch Trail'];
        rightColumn = ['Hunter Hack', 'Working Hunter', 'Equitation Over Fences', 'Jumping'];
    } else if (associationId === 'PtHA') {
        leftColumn = ['Showmanship at Halter', 'Western Horsemanship', 'Hunt Seat Equitation'];
        middleColumn = ['Trail', 'In-Hand Trail', 'Ranch Trail'];
        rightColumn = ['Hunter Hack', 'Working Hunter', 'Equitation Over Fences', 'Jumping'];
    } else {
        // AQHA/APHA layout
        leftColumn = ['Showmanship at Halter', 'Horsemanship', 'Hunt Seat Equitation'];
        middleColumn = ['Trail', 'In-Hand Trail', 'Ranch Trail', 'VRH-RHC Ranch Trail'];
        rightColumn = ['Hunter Hack', 'Working Hunter', 'Equitation Over Fences', 'Jumping', 'English Versatility', 'Western Versatility'];
    }

    const getDisciplinesByNames = (names) => {
        return names.map(name => disciplines.find(d => d.name === name)).filter(Boolean);
    };

    // Get custom disciplines (those not in predefined columns)
    const allPredefinedNames = [...leftColumn, ...middleColumn, ...rightColumn];
    const customDisciplines = disciplines.filter(d => !allPredefinedNames.includes(d.name));

    const leftDisciplines = getDisciplinesByNames(leftColumn);
    const middleDisciplines = getDisciplinesByNames(middleColumn);
    const rightDisciplines = getDisciplinesByNames(rightColumn);

    const renderDisc = (disc) => {
        const disciplineKey = getDisciplineKey(disc);
        const selectedVrhRanchCowWork = vrhRanchCowWorkSelections?.[disciplineKey];
        return (
            <DisciplineCheckboxWithDualApproved
                key={disc.id}
                disc={disc}
                selectedDisciplineKeys={selectedDisciplineKeys}
                onDisciplineToggle={onDisciplineToggle}
                getDisciplineKey={getDisciplineKey}
                dualApprovedAssociations={dualApprovedAssociations}
                dualApprovedSelections={dualApprovedSelections}
                onDualApprovedToggle={onDualApprovedToggle}
                displayName={disc.name.replace(' at Halter', '')}
                vrhRanchCowWorkOptions={vrhRanchCowWorkOptions}
                selectedVrhRanchCowWork={selectedVrhRanchCowWork}
                onVrhRanchCowWorkSelect={onVrhRanchCowWorkSelect}
            />
        );
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1.5">
                <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => onAddCustomDiscipline(associationId)}
                >
                    <PlusCircle className="mr-1 h-3 w-3" /> Add Custom
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-1.5">
                {/* Left Column */}
                <div className="space-y-2">
                    {leftDisciplines.map(renderDisc)}
                </div>

                {/* Middle Column */}
                <div className="space-y-2">
                    {middleDisciplines.map(renderDisc)}
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                    {rightDisciplines.map(renderDisc)}
                </div>
            </div>
            {/* Custom Disciplines Row */}
            {customDisciplines.length > 0 && (
                <div className="mt-3 px-1.5">
                    <h5 className="text-xs font-medium text-muted-foreground mb-2">Custom Disciplines</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {customDisciplines.map(renderDisc)}
                    </div>
                </div>
            )}
        </div>
    );
};

const DisciplineCategory = ({ title, description, disciplines, selectedDisciplineKeys, onDisciplineToggle, getDisciplineKey, dualApprovedAssociations, dualApprovedSelections, onDualApprovedToggle, vrhRanchCowWorkOptions, vrhRanchCowWorkSelections, onVrhRanchCowWorkSelect, onAddCustomDiscipline, associationId, showAddButton }) => {
    const showEmptyWithButton = disciplines.length === 0 && showAddButton;
    if (disciplines.length === 0 && !showAddButton) return null;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1.5">
                <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
                {showAddButton && onAddCustomDiscipline && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => onAddCustomDiscipline(associationId)}
                    >
                        <PlusCircle className="mr-1 h-3 w-3" /> Add Custom
                    </Button>
                )}
            </div>
            {showEmptyWithButton ? (
                <p className="text-xs text-muted-foreground px-1.5">No custom disciplines yet. Click "Add Custom" to create one.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-1.5">
                    {disciplines.map(disc => {
                        const disciplineKey = getDisciplineKey(disc);
                        const selectedVrhRanchCowWork = vrhRanchCowWorkSelections?.[disciplineKey];
                        return (
                            <DisciplineCheckboxWithDualApproved
                                key={disc.id}
                                disc={disc}
                                selectedDisciplineKeys={selectedDisciplineKeys}
                                onDisciplineToggle={onDisciplineToggle}
                                getDisciplineKey={getDisciplineKey}
                                dualApprovedAssociations={dualApprovedAssociations}
                                dualApprovedSelections={dualApprovedSelections}
                                onDualApprovedToggle={onDualApprovedToggle}
                                vrhRanchCowWorkOptions={vrhRanchCowWorkOptions}
                                selectedVrhRanchCowWork={selectedVrhRanchCowWork}
                                onVrhRanchCowWorkSelect={onVrhRanchCowWorkSelect}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const AssociationDisciplineGroup = ({ association, disciplines, selectedDisciplineKeys, onDisciplineToggle, subAssociationType, groupKey, getDisciplineKey, dualApprovedAssociations, dualApprovedSelections, onDualApprovedToggle, vrhRanchCowWorkOptions, vrhRanchCowWorkSelections, onVrhRanchCowWorkSelect, isOpenShowMode, onAddCustomDiscipline }) => {
    const logoUrl = getAssociationLogo(association);
    const Icon = getDefaultAssociationIcon(association);

    const categorized = useMemo(() => {
        const custom = disciplines.filter(d => d.pattern_type === 'custom');
        const rulebook = disciplines.filter(d => d.pattern_type === 'rulebook');
        // Filter out VRH-RHC Ranch CowWork Rookie and Limited for AQHA (they will be shown via dropdown)
        const scoresheet = disciplines.filter(d => {
            if (d.pattern_type === 'none' || d.pattern_type === 'scoresheet_only') {
                // Hide VRH-RHC Ranch CowWork Rookie and Limited for AQHA
                if (association.id === 'AQHA' && 
                    (d.name === 'VRH-RHC Ranch CowWork Rookie' || d.name === 'VRH-RHC Ranch CowWork Limited')) {
                    return false;
                }
                return true;
            }
            return false;
        });
        // Handle disciplines with pattern_type: 'pattern' or pattern_type: null (for open-show disciplines)
        const pattern = disciplines.filter(d => {
            return d.pattern_type === 'pattern' || d.pattern_type === null;
        });
        return { custom, rulebook, scoresheet, pattern };
    }, [disciplines, association.id]);

    return (
        <AccordionItem value={groupKey} className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="text-base font-semibold hover:no-underline px-3 py-2 bg-muted/50">
                <div className="flex items-center gap-3">
                    {logoUrl ? (
                        <img src={logoUrl} alt={`${association.name} logo`} className="h-8 object-contain" />
                    ) : (
                        <Icon className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="flex flex-col items-start">
                        <span className="block">{association.name}</span>
                        {subAssociationType && (
                            <span className="text-sm font-normal text-muted-foreground bg-primary/10 px-2 py-0.5 rounded">
                                {subAssociationType.name}
                            </span>
                        )}
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-3 space-y-3">
                {/* Always show Custom Pattern section with Add button */}
                {(association.id === 'AQHA' || association.id === 'APHA' || association.id === 'ApHC' || association.id === 'ABRA' || association.id === 'PtHA') ? 
                    <AQHACustomPatternCategory title="Custom Pattern" disciplines={categorized.custom} selectedDisciplineKeys={selectedDisciplineKeys} onDisciplineToggle={onDisciplineToggle} associationId={association.id} getDisciplineKey={getDisciplineKey} dualApprovedAssociations={dualApprovedAssociations} dualApprovedSelections={dualApprovedSelections} onDualApprovedToggle={onDualApprovedToggle} vrhRanchCowWorkOptions={vrhRanchCowWorkOptions} vrhRanchCowWorkSelections={vrhRanchCowWorkSelections} onVrhRanchCowWorkSelect={onVrhRanchCowWorkSelect} onAddCustomDiscipline={onAddCustomDiscipline} /> :
                    <DisciplineCategory title="Custom Pattern" disciplines={categorized.custom} selectedDisciplineKeys={selectedDisciplineKeys} onDisciplineToggle={onDisciplineToggle} getDisciplineKey={getDisciplineKey} dualApprovedAssociations={dualApprovedAssociations} dualApprovedSelections={dualApprovedSelections} onDualApprovedToggle={onDualApprovedToggle} vrhRanchCowWorkOptions={vrhRanchCowWorkOptions} vrhRanchCowWorkSelections={vrhRanchCowWorkSelections} onVrhRanchCowWorkSelect={onVrhRanchCowWorkSelect} onAddCustomDiscipline={onAddCustomDiscipline} associationId={association.id} showAddButton={true} />
                }
                {categorized.rulebook.length > 0 && <DisciplineCategory title="Rulebook Pattern" disciplines={categorized.rulebook} selectedDisciplineKeys={selectedDisciplineKeys} onDisciplineToggle={onDisciplineToggle} getDisciplineKey={getDisciplineKey} dualApprovedAssociations={dualApprovedAssociations} dualApprovedSelections={dualApprovedSelections} onDualApprovedToggle={onDualApprovedToggle} vrhRanchCowWorkOptions={vrhRanchCowWorkOptions} vrhRanchCowWorkSelections={vrhRanchCowWorkSelections} onVrhRanchCowWorkSelect={onVrhRanchCowWorkSelect} />}
                {categorized.pattern.length > 0 && <DisciplineCategory title="Pattern" disciplines={categorized.pattern} selectedDisciplineKeys={selectedDisciplineKeys} onDisciplineToggle={onDisciplineToggle} getDisciplineKey={getDisciplineKey} dualApprovedAssociations={dualApprovedAssociations} dualApprovedSelections={dualApprovedSelections} onDualApprovedToggle={onDualApprovedToggle} vrhRanchCowWorkOptions={vrhRanchCowWorkOptions} vrhRanchCowWorkSelections={vrhRanchCowWorkSelections} onVrhRanchCowWorkSelect={onVrhRanchCowWorkSelect} />}
                {categorized.scoresheet.length > 0 && <DisciplineCategory title="Scoresheet Only" disciplines={categorized.scoresheet} selectedDisciplineKeys={selectedDisciplineKeys} onDisciplineToggle={onDisciplineToggle} getDisciplineKey={getDisciplineKey} dualApprovedAssociations={dualApprovedAssociations} dualApprovedSelections={dualApprovedSelections} onDualApprovedToggle={onDualApprovedToggle} vrhRanchCowWorkOptions={vrhRanchCowWorkOptions} vrhRanchCowWorkSelections={vrhRanchCowWorkSelections} onVrhRanchCowWorkSelect={onVrhRanchCowWorkSelect} />}
            </AccordionContent>
        </AccordionItem>
    );
};

export const Step2_ClassesAndDivisions = ({ formData, setFormData, disciplineLibrary, associationsData, onRefreshDisciplines }) => {
    const { toast } = useToast();
    const [customDisciplineName, setCustomDisciplineName] = React.useState('');
    const [isCustomDisciplineModalOpen, setIsCustomDisciplineModalOpen] = React.useState(false);
    const [selectedAssociationForCustom, setSelectedAssociationForCustom] = useState('');
    const [isSavingCustomDiscipline, setIsSavingCustomDiscipline] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // VRH-RHC Ranch CowWork options
    const vrhRanchCowWorkOptions = [
        { value: 'open', label: 'VRH-RHC Ranch CowWork' },
        { value: 'rookie', label: 'VRH-RHC Ranch CowWork Rookie' },
        { value: 'limited', label: 'VRH-RHC Ranch CowWork Limited' }
    ];
    
    // Handler for VRH-RHC Ranch CowWork selection
    const handleVrhRanchCowWorkSelect = (disciplineKey, value) => {
        if (!value || value === 'none' || value === '') {
            setFormData(prev => {
                const newSelections = { ...prev.vrhRanchCowWorkSelections };
                delete newSelections[disciplineKey];
                return {
                    ...prev,
                    vrhRanchCowWorkSelections: newSelections
                };
            });
            return;
        }
        
        const currentSelection = formData.vrhRanchCowWorkSelections?.[disciplineKey];
        
        // If clicking the same value, unselect it
        if (currentSelection && String(currentSelection) === String(value)) {
            setFormData(prev => {
                const newSelections = { ...prev.vrhRanchCowWorkSelections };
                delete newSelections[disciplineKey];
                return {
                    ...prev,
                    vrhRanchCowWorkSelections: newSelections
                };
            });
            return;
        }
        
        // Otherwise, select the new value
        setFormData(prev => ({
            ...prev,
            vrhRanchCowWorkSelections: {
                ...prev.vrhRanchCowWorkSelections,
                [disciplineKey]: value
            }
        }));
    };

    const isOpenShowMode = formData.showType === 'open-unaffiliated' || !!formData.associations['open-show'];
    const isVrhMode = formData.showType === 'versatility-ranch';

    // Get dual-approved associations (when NSBA, NRHA, or NRCHA is selected with 'dual' or 'both' approval type)
    const dualApprovedAssociations = useMemo(() => {
        const result = [];
        const subSelections = formData.subAssociationSelections || {};
        
        // Check each association that supports dual-approval
        ['nsba', 'nrha', 'nrcha'].forEach(assocKey => {
            const approvalType = subSelections[assocKey]?.approvalType;
            const dualApprovedWith = subSelections[assocKey]?.dualApprovedWith || [];
            
            // Show checkbox for both 'dual' and 'both' approval types
            if ((approvalType === 'dual' || approvalType === 'both') && dualApprovedWith.length > 0) {
                result.push(assocKey.toUpperCase());
            }
        });
        
        return result;
    }, [formData.subAssociationSelections]);

    // Get dualApprovedWith associations from all supporting associations
    const dualApprovedWithAssociations = useMemo(() => {
        const subSelections = formData.subAssociationSelections || {};
        const allDualApprovedWith = [];
        
        ['nsba', 'nrha', 'nrcha'].forEach(assocKey => {
            const dualApprovedWith = subSelections[assocKey]?.dualApprovedWith || [];
            dualApprovedWith.forEach(assocId => {
                if (!allDualApprovedWith.includes(assocId)) {
                    allDualApprovedWith.push(assocId);
                }
            });
        });
        
        return allDualApprovedWith;
    }, [formData.subAssociationSelections]);

    const selectedDisciplineKeys = useMemo(() => 
        new Set((formData.disciplines || []).map(d => {
            // Include pattern_type in key to differentiate between same-name disciplines in different categories
            const patternType = d.pattern_type || 'none';
            return `${d.association_id}-${d.sub_association_type || 'none'}-${d.name}-${patternType}`;
        })), 
        [formData.disciplines]
    );
    
    const getDisciplineKey = (disc) => {
        // Include pattern_type in key to differentiate between same-name disciplines in different categories
        // This prevents auto-checking when same discipline name exists in multiple categories (Custom Pattern, Rulebook Pattern, Scoresheet Only)
        const patternType = disc.pattern_type || 'none';
        return `${disc.association_id}-${disc.sub_association_type || 'none'}-${disc.name}-${patternType}`;
    };

    // Handler for dual-approved checkbox toggle
    const handleDualApprovedToggle = (disciplineKey, assocId, isChecked) => {
        setFormData(prev => {
            const newDualApprovedSelections = { ...(prev.dualApprovedSelections || {}) };
            
            if (!newDualApprovedSelections[disciplineKey]) {
                newDualApprovedSelections[disciplineKey] = {};
            }
            
            newDualApprovedSelections[disciplineKey][assocId] = isChecked;
            
            return { ...prev, dualApprovedSelections: newDualApprovedSelections };
        });
    };
    
    const groupedDisciplines = useMemo(() => {
        if (!disciplineLibrary || !associationsData) return [];
        
        const selectedAssociationIds = Object.keys(formData.associations || {}).filter(id => formData.associations[id]);
        const hasOpenShow = selectedAssociationIds.includes('open-show');
        
        let relevantAssociationIds = [];
        if (isVrhMode) {
            relevantAssociationIds = ['versatility-ranch'];
        } else if (hasOpenShow && selectedAssociationIds.length === 1) {
            // Only "Open Shows" is selected - show only open-show disciplines
            relevantAssociationIds = ['open-show'];
        } else if (hasOpenShow) {
            // "Open Shows" is selected with other associations - show both
            relevantAssociationIds = selectedAssociationIds.filter(id => id !== 'open-show');
            // Add 'open-show' as a separate entry
            relevantAssociationIds.push('open-show');
        } else {
            relevantAssociationIds = selectedAssociationIds;
            
            // Hide NSBA/NRHA/NRCHA disciplines when they are selected with Dual-Approved type only
            const subSelections = formData.subAssociationSelections || {};
            ['NSBA', 'NRHA', 'NRCHA'].forEach(assocId => {
                const assocKey = assocId.toLowerCase();
                const approvalType = subSelections[assocKey]?.approvalType;
                if (relevantAssociationIds.includes(assocId) && approvalType === 'dual') {
                    relevantAssociationIds = relevantAssociationIds.filter(id => id !== assocId);
                }
            });
        }

        const subSelections = formData.subAssociationSelections || {};

        const groups = [];

        relevantAssociationIds.forEach(assocId => {
            // Handle 'open-show' association specially
            let association;
            if (assocId === 'open-show') {
                // Create a fallback association object for open-show
                association = {
                    id: 'open-show',
                    name: 'Open Shows',
                    abbreviation: 'Open',
                    sub_association_info: null
                };
            } else {
                association = associationsData.find(a => a.id === assocId);
            }
            
            if (!association) return;

            const selectedSubTypes = subSelections[assocId]?.types || [];
            
            // If association has sub-types and they are selected, create a group for each
            if (association.sub_association_info && selectedSubTypes.length > 0) {
                selectedSubTypes.forEach(subTypeId => {
                    const subAssociationType = association.sub_association_info.types.find(t => t.id === subTypeId);
                    
                    let disciplines = disciplineLibrary.filter(d => {
                        const matchesAssoc = d.association_id === assocId;
                        const matchesSearch = searchTerm ? d.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
                        const matchesSubType = d.sub_association_type === subTypeId;
                        return matchesAssoc && matchesSearch && matchesSubType;
                    });

                    disciplines.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999) || a.name.localeCompare(b.name));

                    if (disciplines.length > 0 || !searchTerm) {
                        groups.push({ 
                            association, 
                            disciplines, 
                            subAssociationType,
                            groupKey: `${assocId}-${subTypeId}`
                        });
                    }
                });
            } else {
                // No sub-types or none selected - show all disciplines for this association
                let disciplines = disciplineLibrary.filter(d => {
                    // For 'open-show', filter by association_id = 'open-show'
                    const matchesAssoc = d.association_id === assocId;
                    const matchesSearch = searchTerm ? d.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
                    // Only include disciplines without sub-type requirement, or if no sub-types are defined
                    const matchesSubType = !d.sub_association_type || !association.sub_association_info;
                    return matchesAssoc && matchesSearch && matchesSubType;
                });

                disciplines.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999) || a.name.localeCompare(b.name));

                if (disciplines.length > 0 || !searchTerm) {
                    groups.push({ 
                        association, 
                        disciplines, 
                        subAssociationType: null,
                        groupKey: assocId
                    });
                }
            }
        });

        return groups;

    }, [formData.associations, formData.subAssociationSelections, isVrhMode, isOpenShowMode, disciplineLibrary, associationsData, searchTerm]);

    const handleDisciplineToggle = (disc, isChecked) => {
        if (isVrhMode) {
            toast({ title: "Disciplines for Versatility Ranch Horse shows are fixed.", variant: "default" });
            return;
        }
        
        const disciplineKey = getDisciplineKey(disc);
        
        // Check if this is VRH-RHC Ranch CowWork for AQHA - auto-select default scoresheet
        const isVrhRanchCowWork = (disc.name === 'VRH-RHC Ranch CowWork' || disc.name === 'Ranch Cow Work') && 
            disc.association_id === 'AQHA';
        
        if (isChecked && isVrhRanchCowWork) {
            // Auto-select 'open' (VRH-RHC Ranch CowWork) as default
            setFormData(prev => ({
                ...prev,
                vrhRanchCowWorkSelections: {
                    ...prev.vrhRanchCowWorkSelections,
                    [disciplineKey]: 'open'
                }
            }));
        } else if (!isChecked && isVrhRanchCowWork) {
            // Clear the selection when unchecking
            setFormData(prev => {
                const newSelections = { ...prev.vrhRanchCowWorkSelections };
                delete newSelections[disciplineKey];
                return {
                    ...prev,
                    vrhRanchCowWorkSelections: newSelections
                };
            });
        }
        
        setFormData(prev => {
            let newDisciplines = [...(prev.disciplines || [])];
            const disciplineExistsIndex = newDisciplines.findIndex(c => 
                getDisciplineKey(c) === disciplineKey
            );

            if (isChecked) {
                if (disciplineExistsIndex === -1) {
                    const newDiscipline = {
                        ...disc,
                        id: `${disc.name.replace(/\s+/g, '-')}-${disc.association_id}-${Date.now()}`,
                        pattern: disc.pattern_type !== 'none' && disc.pattern_type !== 'scoresheet_only',
                        scoresheet: disc.category !== 'none',
                        isCustom: disc.isCustom || false,
                        selectedAssociations: {},
                        divisions: {},
                        customDivisions: [],
                        patternGroups: [],
                        sub_association_type: disc.sub_association_type, // Preserve sub-type
                        pattern_type: disc.pattern_type || 'none', // Preserve pattern_type for key matching
                    };
                    
                    if (newDiscipline.pattern) {
                        newDiscipline.patternGroups.push({id: `pattern-group-${Date.now()}`, name: 'Group 1', divisions: [], rulebookPatternId: '', competitionDate: null});
                    }

                    const selectedAssocIds = Object.keys(prev.associations).filter(id => prev.associations[id]);
                    // Set selectedAssociations based on the discipline's actual association_id
                    // Only set 'open-show' if the discipline actually has association_id = 'open-show'
                    if (disc.association_id === 'open-show') {
                        newDiscipline.selectedAssociations['open-show'] = true;
                    } else if (disc.association_id && selectedAssocIds.includes(disc.association_id)) {
                        newDiscipline.selectedAssociations[disc.association_id] = true;
                    }
                    newDisciplines.push(newDiscipline);
                }
            } else {
                // Find the discipline being removed to get its ID
                const disciplineToRemove = newDisciplines.find(c => getDisciplineKey(c) === disciplineKey);
                const disciplineIdToRemove = disciplineToRemove?.id;
                
                // Remove the discipline
                newDisciplines = newDisciplines.filter(c => 
                    getDisciplineKey(c) !== disciplineKey
                );
                
                // Clean up judge data for the removed discipline
                if (disciplineIdToRemove) {
                    // Find the discipline index before removal to clean up judge data
                    const oldDisciplines = prev.disciplines || [];
                    const disciplineIndex = oldDisciplines.findIndex(d => d.id === disciplineIdToRemove);
                    
                    if (disciplineIndex !== -1) {
                        // Clean up judgeSelections, groupJudges, and related data
                        const newJudgeSelections = [...(prev.judgeSelections || [])];
                        const newGroupJudges = { ...(prev.groupJudges || {}) };
                        const newDueDateSelections = [...(prev.dueDateSelections || [])];
                        const newDisciplineDueDates = { ...(prev.disciplineDueDates || {}) };
                        const newPatternSelections = { ...(prev.patternSelections || {}) };
                        const newGroupDueDates = { ...(prev.groupDueDates || {}) };
                        const newGroupStaff = { ...(prev.groupStaff || {}) };
                        
                        // Remove data at the discipline index
                        newJudgeSelections[disciplineIndex] = null;
                        delete newGroupJudges[disciplineIndex];
                        // Clear dueDateSelections for this discipline
                        newDueDateSelections[disciplineIndex] = null;
                        delete newDisciplineDueDates[disciplineIndex];
                        delete newPatternSelections[disciplineIndex];
                        delete newGroupDueDates[disciplineIndex];
                        delete newGroupStaff[disciplineIndex];
                        
                        // Also clean up by discipline ID (new format)
                        delete newPatternSelections[disciplineIdToRemove];
                        delete newGroupJudges[disciplineIdToRemove];
                        delete newDisciplineDueDates[disciplineIdToRemove];
                        delete newGroupDueDates[disciplineIdToRemove];
                        delete newGroupStaff[disciplineIdToRemove];
                        
                        return {
                            ...prev,
                            disciplines: newDisciplines,
                            judgeSelections: newJudgeSelections,
                            groupJudges: newGroupJudges,
                            dueDateSelections: newDueDateSelections, // Ensure dueDateSelections is included in cleanup
                            disciplineDueDates: newDisciplineDueDates,
                            patternSelections: newPatternSelections,
                            groupDueDates: newGroupDueDates,
                            groupStaff: newGroupStaff
                        };
                    }
                }
            }
            
            newDisciplines.sort((a, b) => {
                const aSort = disciplineLibrary.find(d => d.name === a.name)?.sort_order ?? 999;
                const bSort = disciplineLibrary.find(d => d.name === b.name)?.sort_order ?? 999;
                return aSort - bSort;
            });

            // If all disciplines are removed, clean up all judge and related data
            if (newDisciplines.length === 0) {
                return {
                    ...prev,
                    disciplines: newDisciplines,
                    judgeSelections: [],
                    groupJudges: {},
                    dueDateSelections: [],
                    disciplineDueDates: {},
                    patternSelections: {},
                    groupDueDates: {},
                    groupStaff: {}
                };
            }

            return { ...prev, disciplines: newDisciplines };
        });
    };

    // Open custom discipline modal for a specific association
    const handleOpenAddCustomModal = useCallback((associationId) => {
        setSelectedAssociationForCustom(associationId);
        setCustomDisciplineName('');
        setIsCustomDisciplineModalOpen(true);
    }, []);

    // Save custom discipline to database
    const handleSaveCustomDisciplineToDb = async () => {
        if (!customDisciplineName.trim()) {
            toast({ title: "Custom discipline name cannot be empty.", variant: "destructive" });
            return;
        }
        
        if (!selectedAssociationForCustom) {
            toast({ title: "Please select an association.", variant: "destructive" });
            return;
        }

        setIsSavingCustomDiscipline(true);

        try {
            // Get the max sort_order for this association's custom disciplines
            const { data: existingDisciplines, error: fetchError } = await supabase
                .from('disciplines')
                .select('sort_order')
                .eq('association_id', selectedAssociationForCustom)
                .eq('pattern_type', 'custom')
                .order('sort_order', { ascending: false })
                .limit(1);

            if (fetchError) throw fetchError;

            const newSortOrder = (existingDisciplines?.[0]?.sort_order ?? 0) + 100;

            // Insert the new discipline
            const { data: newDiscipline, error: insertError } = await supabase
                .from('disciplines')
                .insert({
                    name: customDisciplineName.trim(),
                    association_id: selectedAssociationForCustom,
                    category: 'pattern_and_scoresheet',
                    pattern_type: 'custom',
                    open_divisions: false,
                    sort_order: newSortOrder
                })
                .select()
                .single();

            if (insertError) throw insertError;

            toast({ 
                title: "Custom Discipline Added!", 
                description: `"${customDisciplineName}" has been saved to ${selectedAssociationForCustom}.` 
            });

            // Refresh the discipline library if callback provided
            if (onRefreshDisciplines) {
                await onRefreshDisciplines();
            }

            setCustomDisciplineName('');
            setIsCustomDisciplineModalOpen(false);
            setSelectedAssociationForCustom('');

        } catch (error) {
            console.error('Error saving custom discipline:', error);
            toast({ 
                title: "Error saving discipline", 
                description: error.message || "Failed to save custom discipline. Please try again.", 
                variant: "destructive" 
            });
        } finally {
            setIsSavingCustomDiscipline(false);
        }
    };

    const handleAddCustomDiscipline = () => {
        if (!customDisciplineName.trim()) {
            toast({ title: "Custom discipline name cannot be empty.", variant: "destructive" });
            return;
        }
        const newDiscipline = {
            name: customDisciplineName,
            category: 'pattern_and_scoresheet',
            pattern_type: 'custom',
            isCustom: true,
            associations: [],
            association_id: 'open-show' // Assign a special ID for custom
        };
        handleDisciplineToggle(newDiscipline, true);
        setCustomDisciplineName('');
        setIsCustomDisciplineModalOpen(false);
    };
    
    const needsDisciplineSelection = Object.keys(formData.associations).length > 0 && (formData.disciplines ? formData.disciplines.length === 0 : true);

    // Get association name for display
    const getAssociationName = (assocId) => {
        const assoc = associationsData?.find(a => a.id === assocId);
        return assoc?.name || assocId;
    };

    return (
        <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader className="pb-3">
                <CardTitle className="text-xl">Step 2: Select Disciplines</CardTitle>
                <CardDescription className="text-sm">{ isVrhMode ? "The required disciplines for a Versatility Ranch Horse show have been automatically selected." : "Select disciplines from the library, or add custom disciplines for open shows." }</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className={cn("space-y-3 p-3 rounded-lg border", needsDisciplineSelection && "highlight-next-step border-primary")}>
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-3">
                        <h3 className="text-lg font-bold tracking-tight">Available Disciplines</h3>
                         <div className="flex items-center gap-2">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search disciplines..." 
                                    className="pl-9 w-48"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                         </div>
                        {isVrhMode && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Lock className="h-4 w-4" />
                                <span>Disciplines Locked</span>
                            </div>
                        )}
                    </div>
                    
                    <Accordion type="multiple" defaultValue={groupedDisciplines.map(g => g.groupKey)} className="w-full space-y-4">
                        {groupedDisciplines.map(group => {
                            // Only show dual-approved checkbox if current association is in the dualApprovedWith list
                            const showDualApproved = dualApprovedWithAssociations.includes(group.association.id);
                            
                            return (
                                <AssociationDisciplineGroup
                                    key={group.groupKey}
                                    groupKey={group.groupKey}
                                    association={group.association}
                                    disciplines={group.disciplines}
                                    selectedDisciplineKeys={selectedDisciplineKeys}
                                    onDisciplineToggle={handleDisciplineToggle}
                                    subAssociationType={group.subAssociationType}
                                    getDisciplineKey={getDisciplineKey}
                                    dualApprovedAssociations={showDualApproved ? dualApprovedAssociations : []}
                                    dualApprovedSelections={formData.dualApprovedSelections || {}}
                                    onDualApprovedToggle={handleDualApprovedToggle}
                                    vrhRanchCowWorkOptions={vrhRanchCowWorkOptions}
                                    vrhRanchCowWorkSelections={formData.vrhRanchCowWorkSelections || {}}
                                    onVrhRanchCowWorkSelect={handleVrhRanchCowWorkSelect}
                                    isOpenShowMode={isOpenShowMode}
                                    onAddCustomDiscipline={handleOpenAddCustomModal}
                                />
                            );
                        })}
                    </Accordion>
                </div>

                {/* Add Custom Discipline Modal */}
                <Dialog open={isCustomDisciplineModalOpen} onOpenChange={setIsCustomDisciplineModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Custom Discipline</DialogTitle>
                            <DialogDescription>
                                Create a new custom discipline for {getAssociationName(selectedAssociationForCustom)}. 
                                This will be saved to the database and available for future use.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="disciplineName">Discipline Name</Label>
                                <Input 
                                    id="disciplineName"
                                    value={customDisciplineName} 
                                    onChange={(e) => setCustomDisciplineName(e.target.value)} 
                                    placeholder="E.g., Costume Class, Lead Line" 
                                />
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Association:</strong> {getAssociationName(selectedAssociationForCustom)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    This discipline will be added to the Custom Pattern category.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button 
                                variant="outline" 
                                onClick={() => setIsCustomDisciplineModalOpen(false)}
                                disabled={isSavingCustomDiscipline}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSaveCustomDisciplineToDb}
                                disabled={isSavingCustomDiscipline || !customDisciplineName.trim()}
                            >
                                {isSavingCustomDiscipline ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Discipline'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </motion.div>
    );
};