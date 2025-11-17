import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Lock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getAssociationLogo, getDefaultAssociationIcon } from '@/lib/associationsData';

const AQHACustomPatternCategory = ({ title, disciplines, selectedDisciplineNames, onDisciplineToggle }) => {
    if (disciplines.length === 0) return null;

    // Define the custom 3-column layout for AQHA
    const leftColumn = ['Showmanship at Halter', 'Horsemanship', 'Hunt Seat Equitation'];
    const middleColumn = ['Trail', 'Ranch Trail'];
    const rightColumn = ['Hunter Hack', 'Working Hunter', 'Equitation Over Fences', 'Jumping'];

    const getDisciplinesByNames = (names) => {
        return names.map(name => disciplines.find(d => d.name === name)).filter(Boolean);
    };

    const leftDisciplines = getDisciplinesByNames(leftColumn);
    const middleDisciplines = getDisciplinesByNames(middleColumn);
    const rightDisciplines = getDisciplinesByNames(rightColumn);

    return (
        <div className="space-y-2">
            <h4 className="text-md font-semibold text-muted-foreground px-2">{title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
                {/* Left Column */}
                <div className="space-y-3">
                    {leftDisciplines.map(disc => (
                        <div key={disc.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`disc-${disc.id}`}
                                checked={selectedDisciplineNames.has(disc.name)}
                                onCheckedChange={(checked) => onDisciplineToggle(disc, checked)}
                            />
                            <Label htmlFor={`disc-${disc.id}`} className="font-normal cursor-pointer text-sm">
                                {disc.name.replace(' at Halter', '')}
                            </Label>
                        </div>
                    ))}
                </div>

                {/* Middle Column */}
                <div className="space-y-3">
                    {middleDisciplines.map(disc => (
                        <div key={disc.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`disc-${disc.id}`}
                                checked={selectedDisciplineNames.has(disc.name)}
                                onCheckedChange={(checked) => onDisciplineToggle(disc, checked)}
                            />
                            <Label htmlFor={`disc-${disc.id}`} className="font-normal cursor-pointer text-sm">
                                {disc.name}
                            </Label>
                        </div>
                    ))}
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                    {rightDisciplines.map(disc => (
                        <div key={disc.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`disc-${disc.id}`}
                                checked={selectedDisciplineNames.has(disc.name)}
                                onCheckedChange={(checked) => onDisciplineToggle(disc, checked)}
                            />
                            <Label htmlFor={`disc-${disc.id}`} className="font-normal cursor-pointer text-sm">
                                {disc.name}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const DisciplineCategory = ({ title, description, disciplines, selectedDisciplineNames, onDisciplineToggle }) => {
    if (disciplines.length === 0) return null;

    return (
        <div className="space-y-2">
            <h4 className="text-md font-semibold text-muted-foreground px-2">{title}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-2">
                {disciplines.map(disc => (
                    <div key={disc.id} className="flex items-center space-x-2">
                        <Checkbox
                            id={`disc-${disc.id}`}
                            checked={selectedDisciplineNames.has(disc.name)}
                            onCheckedChange={(checked) => onDisciplineToggle(disc, checked)}
                        />
                        <Label htmlFor={`disc-${disc.id}`} className="font-normal cursor-pointer text-sm">
                            {disc.name}
                        </Label>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AssociationDisciplineGroup = ({ association, disciplines, selectedDisciplineNames, onDisciplineToggle, subAssociationType, groupKey }) => {
    const logoUrl = getAssociationLogo(association);
    const Icon = getDefaultAssociationIcon(association);

    const categorized = useMemo(() => {
        const custom = disciplines.filter(d => d.pattern_type === 'custom');
        const rulebook = disciplines.filter(d => d.pattern_type === 'rulebook');
        const scoresheet = disciplines.filter(d => d.pattern_type === 'none' || d.pattern_type === 'scoresheet_only');
        return { custom, rulebook, scoresheet };
    }, [disciplines]);

    return (
        <AccordionItem value={groupKey} className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="text-lg font-semibold hover:no-underline px-4 py-3 bg-muted/50">
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
            <AccordionContent className="p-4 space-y-6">
                {categorized.custom.length > 0 && (
                    (association.id === 'AQHA') ? 
                        <AQHACustomPatternCategory title="Custom Pattern" disciplines={categorized.custom} selectedDisciplineNames={selectedDisciplineNames} onDisciplineToggle={onDisciplineToggle} /> :
                        <DisciplineCategory title="Custom Pattern" disciplines={categorized.custom} selectedDisciplineNames={selectedDisciplineNames} onDisciplineToggle={onDisciplineToggle} />
                )}
                {categorized.rulebook.length > 0 && <DisciplineCategory title="Rulebook Pattern" disciplines={categorized.rulebook} selectedDisciplineNames={selectedDisciplineNames} onDisciplineToggle={onDisciplineToggle} />}
                {categorized.scoresheet.length > 0 && <DisciplineCategory title="Scoresheet Only" disciplines={categorized.scoresheet} selectedDisciplineNames={selectedDisciplineNames} onDisciplineToggle={onDisciplineToggle} />}
            </AccordionContent>
        </AccordionItem>
    );
};

export const Step2_ClassesAndDivisions = ({ formData, setFormData, disciplineLibrary, associationsData }) => {
    const { toast } = useToast();
    const [customDisciplineName, setCustomDisciplineName] = React.useState('');
    const [isCustomDisciplineModalOpen, setIsCustomDisciplineModalOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const isOpenShowMode = formData.showType === 'open-unaffiliated' || !!formData.associations['open-show'];
    const isVrhMode = formData.showType === 'versatility-ranch';

    const selectedDisciplineNames = useMemo(() => new Set((formData.disciplines || []).map(d => d.name)), [formData.disciplines]);
    
    const groupedDisciplines = useMemo(() => {
        if (!disciplineLibrary || !associationsData) return [];
        
        let relevantAssociationIds = [];
        if (isVrhMode) {
            relevantAssociationIds = ['versatility-ranch'];
        } else if (isOpenShowMode) {
            relevantAssociationIds = ['AQHA']; // Open show uses AQHA as a base
        } else {
            relevantAssociationIds = Object.keys(formData.associations || {}).filter(id => formData.associations[id]);
        }

        const subSelections = formData.subAssociationSelections || {};

        const groups = [];

        relevantAssociationIds.forEach(assocId => {
            const association = associationsData.find(a => a.id === assocId);
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
        setFormData(prev => {
            let newDisciplines = [...(prev.disciplines || [])];
            const disciplineExistsIndex = newDisciplines.findIndex(c => c.name === disc.name);

            if (isChecked) {
                if (disciplineExistsIndex === -1) {
                    const newDiscipline = {
                        ...disc,
                        id: `${disc.name.replace(/\s+/g, '-')}-${Date.now()}`,
                        pattern: disc.pattern_type !== 'none' && disc.pattern_type !== 'scoresheet_only',
                        scoresheet: disc.category !== 'none',
                        isCustom: disc.isCustom || false,
                        selectedAssociations: {},
                        divisions: {},
                        customDivisions: [],
                        patternGroups: [],
                        sub_association_type: disc.sub_association_type, // Preserve sub-type
                    };
                    
                    if (newDiscipline.pattern) {
                        newDiscipline.patternGroups.push({id: `pattern-group-${Date.now()}`, name: 'Group 1', divisions: [], rulebookPatternId: '', competitionDate: null});
                    }

                    const selectedAssocIds = Object.keys(prev.associations).filter(id => prev.associations[id]);
                    if (isOpenShowMode) {
                        newDiscipline.selectedAssociations['open-show'] = true;
                    } else {
                        if (disc.association_id && selectedAssocIds.includes(disc.association_id)) {
                            newDiscipline.selectedAssociations[disc.association_id] = true;
                        }
                    }
                    newDisciplines.push(newDiscipline);
                }
            } else {
                newDisciplines = newDisciplines.filter(c => c.name !== disc.name);
            }
            
            newDisciplines.sort((a, b) => {
                const aSort = disciplineLibrary.find(d => d.name === a.name)?.sort_order ?? 999;
                const bSort = disciplineLibrary.find(d => d.name === b.name)?.sort_order ?? 999;
                return aSort - bSort;
            });

            return { ...prev, disciplines: newDisciplines };
        });
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

    return (
        <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 2: Select Disciplines</CardTitle>
                <CardDescription>{ isVrhMode ? "The required disciplines for a Versatility Ranch Horse show have been automatically selected." : "Select disciplines from the library, or add custom disciplines for open shows." }</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className={cn("space-y-4 p-4 rounded-lg border", needsDisciplineSelection && "highlight-next-step border-primary")}>
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                        <h3 className="text-xl font-bold tracking-tight">Available Disciplines</h3>
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
                            {isOpenShowMode && !isVrhMode && (
                                <Dialog open={isCustomDisciplineModalOpen} onOpenChange={setIsCustomDisciplineModalOpen}>
                                    <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/> Add Custom</Button></DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add a Custom Discipline</DialogTitle>
                                            <DialogDescription>Enter the name for your custom discipline. For non-standard disciplines, a fee may apply for custom pattern creation.</DialogDescription>
                                        </DialogHeader>
                                        <Input value={customDisciplineName} onChange={(e) => setCustomDisciplineName(e.target.value)} placeholder="E.g., Costume Class" />
                                        <DialogFooter><Button onClick={handleAddCustomDiscipline}>Add Discipline</Button></DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                         </div>
                        {isVrhMode && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Lock className="h-4 w-4" />
                                <span>Disciplines Locked</span>
                            </div>
                        )}
                    </div>
                    
                    <Accordion type="multiple" defaultValue={groupedDisciplines.map(g => g.groupKey)} className="w-full space-y-4">
                        {groupedDisciplines.map(group => (
                            <AssociationDisciplineGroup
                                key={group.groupKey}
                                groupKey={group.groupKey}
                                association={group.association}
                                disciplines={group.disciplines}
                                selectedDisciplineNames={selectedDisciplineNames}
                                onDisciplineToggle={handleDisciplineToggle}
                                subAssociationType={group.subAssociationType}
                            />
                        ))}
                    </Accordion>
                </div>
            </CardContent>
        </motion.div>
    );
};