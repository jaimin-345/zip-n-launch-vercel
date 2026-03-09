import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Info, ChevronRight, ChevronDown, ListPlus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── helpers ───────────────────────────────────────────────────────

function getDisciplineKey(disc) {
    return `${disc.association_id}-${disc.sub_association_type || 'none'}-${disc.name}-${disc.pattern_type || 'none'}`;
}

function makeDivisionKey(groupName, level) {
    return `${groupName} - ${level}`;
}

function makeDivisionId(assocId, groupName, level) {
    return `${assocId}-${groupName} - ${level}`;
}

// ─── Collapsible wrapper (no Radix, just state) ─────────────────

const TreeNode = ({ label, badge, defaultOpen = false, indentLevel = 0, checkbox, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    const hasChildren = React.Children.count(children) > 0;

    return (
        <div>
            <div
                className={cn(
                    'flex items-center gap-1.5 py-1.5 select-none rounded-md hover:bg-muted/50 transition-colors',
                    indentLevel === 0 && 'font-semibold text-base',
                    indentLevel === 1 && 'font-medium text-sm',
                    indentLevel === 2 && 'text-sm text-muted-foreground',
                )}
                style={{ paddingLeft: `${indentLevel * 20 + 4}px` }}
            >
                {hasChildren ? (
                    <button type="button" onClick={() => setOpen(o => !o)} className="shrink-0 p-0.5 rounded hover:bg-muted">
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                ) : (
                    <span className="w-5" /> /* spacer when no children */
                )}

                {checkbox}

                <span
                    className={cn('cursor-pointer flex-1', hasChildren && 'hover:underline')}
                    onClick={() => hasChildren && setOpen(o => !o)}
                >
                    {label}
                </span>

                {badge}
            </div>

            {open && hasChildren && <div>{children}</div>}
        </div>
    );
};

// ─── Level checkbox (leaf node) ─────────────────────────────────

const LevelCheckbox = ({ assocId, disc, groupName, level, formData, setFormData, disciplineLibrary }) => {
    const divKey = makeDivisionKey(groupName, level);
    const divId = makeDivisionId(assocId, groupName, level);

    // Find current discipline in formData (may not exist yet)
    const existingDisc = (formData.disciplines || []).find(d => getDisciplineKey(d) === getDisciplineKey(disc));
    const isChecked = !!(existingDisc?.divisions?.[assocId]?.[divKey]);

    const handleToggle = (checked) => {
        setFormData(prev => {
            let newDisciplines = [...(prev.disciplines || [])];
            let discIdx = newDisciplines.findIndex(d => getDisciplineKey(d) === getDisciplineKey(disc));

            if (checked) {
                // Create discipline if it doesn't exist
                if (discIdx === -1) {
                    const newDisc = {
                        ...disc,
                        id: `${disc.name.replace(/\s+/g, '-')}-${disc.association_id}-${Date.now()}`,
                        pattern: disc.pattern_type !== 'none' && disc.pattern_type !== 'scoresheet_only',
                        scoresheet: disc.category !== 'none',
                        isCustom: disc.isCustom || false,
                        selectedAssociations: { [disc.association_id]: true },
                        divisions: {},
                        divisionOrder: [],
                        customDivisions: [],
                        patternGroups: [],
                        sub_association_type: disc.sub_association_type,
                        pattern_type: disc.pattern_type || 'none',
                    };
                    if (newDisc.pattern) {
                        newDisc.patternGroups.push({ id: `pattern-group-${Date.now()}`, name: 'Group 1', divisions: [], rulebookPatternId: '', competitionDate: null });
                    }
                    newDisciplines.push(newDisc);
                    discIdx = newDisciplines.length - 1;
                }

                // Add division
                const d = { ...newDisciplines[discIdx] };
                const newDivisions = { ...(d.divisions || {}) };
                if (!newDivisions[assocId]) newDivisions[assocId] = {};
                newDivisions[assocId] = { ...newDivisions[assocId], [divKey]: true };
                const newDivisionOrder = d.divisionOrder ? [...d.divisionOrder] : [];
                if (!newDivisionOrder.includes(divId)) newDivisionOrder.push(divId);
                newDisciplines[discIdx] = { ...d, divisions: newDivisions, divisionOrder: newDivisionOrder };
            } else {
                // Uncheck
                if (discIdx === -1) return prev;
                const d = { ...newDisciplines[discIdx] };
                const newDivisions = { ...(d.divisions || {}) };
                if (newDivisions[assocId]) {
                    newDivisions[assocId] = { ...newDivisions[assocId] };
                    delete newDivisions[assocId][divKey];
                    if (Object.keys(newDivisions[assocId]).length === 0) delete newDivisions[assocId];
                }
                let newDivisionOrder = (d.divisionOrder || []).filter(x => x !== divId);

                // Clean up pattern groups & dates
                let newPatternGroups = (d.patternGroups || []).map(g => ({
                    ...g,
                    divisions: (g.divisions || []).filter(x => x.id !== divId),
                }));
                const newDivisionDates = { ...(d.divisionDates || {}) };
                const newDivisionPrintTitles = { ...(d.divisionPrintTitles || {}) };
                delete newDivisionDates[divId];
                delete newDivisionPrintTitles[divId];

                // If no divisions left at all, remove the discipline entirely
                const totalDivisions = Object.values(newDivisions).reduce((sum, assocDivs) => sum + Object.keys(assocDivs).length, 0);
                if (totalDivisions === 0) {
                    newDisciplines = newDisciplines.filter((_, i) => i !== discIdx);
                } else {
                    newDisciplines[discIdx] = {
                        ...d,
                        divisions: newDivisions,
                        divisionOrder: newDivisionOrder,
                        patternGroups: newPatternGroups,
                        divisionDates: newDivisionDates,
                        divisionPrintTitles: newDivisionPrintTitles,
                    };
                }
            }

            return { ...prev, disciplines: newDisciplines };
        });
    };

    const checkboxId = `level-${assocId}-${disc.name}-${groupName}-${level}`;

    return (
        <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${3 * 20 + 4}px` }}>
            <Checkbox id={checkboxId} checked={isChecked} onCheckedChange={handleToggle} />
            <label htmlFor={checkboxId} className="text-sm cursor-pointer">{level}</label>
        </div>
    );
};

// ─── Bulk Add Dialog ─────────────────────────────────────────────

const BulkAddScheduleDialog = ({ open, onOpenChange, onBulkAdd }) => {
    const [text, setText] = useState('');
    const [noPattern, setNoPattern] = useState(false);

    React.useEffect(() => {
        if (open) { setText(''); setNoPattern(false); }
    }, [open]);

    const parsedLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const handleAdd = () => {
        if (parsedLines.length === 0) return;
        onBulkAdd(parsedLines, { noPattern });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ListPlus className="h-5 w-5" />
                        Bulk Add Classes
                    </DialogTitle>
                    <DialogDescription>
                        Paste or type class names, one per line. Each line becomes a separate class entry in the schedule.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="bulk-schedule-classes" className="text-sm font-medium">Class Names</Label>
                        <Textarea
                            id="bulk-schedule-classes"
                            placeholder={`Ranch Riding Junior 8-13 Intro\nRanch Riding Senior 14-18 Intro\nShow Hack\nPleasure Driving`}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={8}
                            className="mt-1.5 font-mono text-sm"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="bulk-no-pattern-sched" checked={noPattern} onCheckedChange={setNoPattern} />
                        <Label htmlFor="bulk-no-pattern-sched" className="font-normal text-sm">
                            Non-pattern classes (no pattern configuration required)
                        </Label>
                    </div>
                    {parsedLines.length > 0 && (
                        <div className="p-3 bg-muted/50 rounded-md border">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Preview</span>
                                <Badge variant="secondary">{parsedLines.length} classes</Badge>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-0.5">
                                {parsedLines.map((line, i) => (
                                    <div key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <span className="font-bold text-primary w-5 text-right">{i + 1}.</span>
                                        <span>{line}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={parsedLines.length === 0}>
                        Add {parsedLines.length} {parsedLines.length === 1 ? 'Class' : 'Classes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ─── Add Custom Class Dialog ────────────────────────────────────

const AddCustomClassDialog = ({ open, onOpenChange, onAdd }) => {
    const [className, setClassName] = useState('');
    const [noPattern, setNoPattern] = useState(true);

    React.useEffect(() => {
        if (open) { setClassName(''); setNoPattern(true); }
    }, [open]);

    const handleAdd = () => {
        if (!className.trim()) return;
        onAdd([className.trim()], { noPattern });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add Custom Class
                    </DialogTitle>
                    <DialogDescription>
                        Add a class that isn't in the standard discipline list (e.g., Show Hack, Pleasure Driving).
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="custom-class-name" className="text-sm font-medium">Class Name</Label>
                        <Input
                            id="custom-class-name"
                            placeholder="E.g., Show Hack"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            className="mt-1.5"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="custom-no-pattern" checked={noPattern} onCheckedChange={setNoPattern} />
                        <Label htmlFor="custom-no-pattern" className="font-normal text-sm">
                            Non-pattern class (no pattern configuration required)
                        </Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={!className.trim()}>Add Class</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ─── Main component ─────────────────────────────────────────────

export const Step2_ShowClasses = ({ formData, setFormData, disciplineLibrary, associationsData, divisionsData, stepNumber = 4, stepTitle = 'Build Your Class List' }) => {
    const [bulkAddOpen, setBulkAddOpen] = useState(false);
    const [customClassOpen, setCustomClassOpen] = useState(false);

    const selectedAssocIds = useMemo(() =>
        Object.keys(formData.associations || {}).filter(id => formData.associations[id]),
        [formData.associations]
    );

    // Build association → discipline list
    const assocDisciplines = useMemo(() => {
        if (!disciplineLibrary || !associationsData) return [];
        return selectedAssocIds.map(assocId => {
            const assoc = associationsData.find(a => a.id === assocId);
            let discs = disciplineLibrary.filter(d => d.association_id === assocId);

            // For 4-H, filter by selected city/state
            if (assocId === '4-H' && formData.selected4HCity) {
                discs = discs.filter(d => d.city === formData.selected4HCity);
            } else if (assocId === '4-H' && !formData.selected4HCity) {
                discs = []; // Don't show 4-H disciplines until state is selected
            }

            discs.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
            return { assocId, assocName: assoc ? `${assoc.abbreviation || assoc.id} - ${assoc.name}` : assocId, disciplines: discs };
        }).filter(a => a.disciplines.length > 0);
    }, [selectedAssocIds, disciplineLibrary, associationsData, formData.selected4HCity]);

    // Count selected classes per discipline key
    const selectionCounts = useMemo(() => {
        const counts = {};
        (formData.disciplines || []).forEach(disc => {
            const key = getDisciplineKey(disc);
            const total = Object.values(disc.divisions || {}).reduce(
                (sum, assocDivs) => sum + Object.keys(assocDivs).length, 0
            );
            counts[key] = total;
        });
        return counts;
    }, [formData.disciplines]);

    const totalClasses = useMemo(() =>
        Object.values(selectionCounts).reduce((s, c) => s + c, 0),
        [selectionCounts]
    );

    // Bulk add: creates a custom discipline with each class as a division
    const handleBulkAdd = useCallback((classNames, options = {}) => {
        setFormData(prev => {
            const newDisciplines = [...(prev.disciplines || [])];
            // Find or create a "Custom Classes" discipline
            const customDiscKey = 'custom-bulk-classes';
            let discIdx = newDisciplines.findIndex(d => d.id === customDiscKey);

            if (discIdx === -1) {
                newDisciplines.push({
                    id: customDiscKey,
                    name: 'Custom Classes',
                    association_id: selectedAssocIds[0] || 'custom',
                    pattern: false,
                    scoresheet: false,
                    isCustom: true,
                    selectedAssociations: {},
                    divisions: {},
                    divisionOrder: [],
                    customDivisions: [],
                    patternGroups: [],
                    noPattern: options.noPattern || false,
                });
                discIdx = newDisciplines.length - 1;
            }

            const disc = { ...newDisciplines[discIdx] };
            const assocId = disc.association_id;
            const divisions = { ...(disc.divisions || {}) };
            const assocDivs = { ...(divisions[assocId] || {}) };
            const divisionOrder = [...(disc.divisionOrder || [])];

            classNames.forEach(name => {
                const divKey = `Custom - ${name}`;
                const divId = `${assocId}-Custom - ${name}`;
                if (!assocDivs[divKey]) {
                    assocDivs[divKey] = true;
                }
                if (!divisionOrder.includes(divId)) {
                    divisionOrder.push(divId);
                }
            });

            divisions[assocId] = assocDivs;
            disc.divisions = divisions;
            disc.divisionOrder = divisionOrder;
            if (options.noPattern) disc.noPattern = true;
            newDisciplines[discIdx] = disc;

            return { ...prev, disciplines: newDisciplines };
        });
    }, [setFormData, selectedAssocIds]);

    // Check if 4-H is selected but no state chosen
    const is4HSelectedNoState = selectedAssocIds.includes('4-H') && !formData.selected4HCity;

    // Empty state
    if (selectedAssocIds.length === 0) {
        return (
            <motion.div key="step4-classes" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                <CardHeader>
                    <CardTitle>{`Step ${stepNumber}: ${stepTitle}`}</CardTitle>
                    <CardDescription>Choose disciplines, divisions, and levels. The system will automatically generate the classes for your show.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground font-medium">No associations selected yet.</p>
                        <p className="text-sm text-muted-foreground mt-1">Go back to the first step to choose your associations.</p>
                    </div>
                </CardContent>
            </motion.div>
        );
    }

    return (
        <motion.div key="step4-classes" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>{`Step ${stepNumber}: ${stepTitle}`}</CardTitle>
                <CardDescription>Choose disciplines, divisions, and levels. The system will automatically generate the classes for your show.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Helper note */}
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        Choose once — let the platform build the list.
                    </p>
                </div>

                {/* 4-H state warning */}
                {is4HSelectedNoState && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
                        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                            4-H is selected but no state has been chosen. Go back to Step 1 and select a state for 4-H to see available disciplines.
                        </p>
                    </div>
                )}

                {/* Total summary + Bulk Add */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {totalClasses > 0 && (
                            <>
                                <Badge variant="secondary" className="mr-2">{totalClasses}</Badge>
                                class{totalClasses !== 1 ? 'es' : ''} selected
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomClassOpen(true)}
                            className="border-primary/30 text-primary hover:bg-primary/5"
                        >
                            <Plus className="h-4 w-4 mr-1.5" /> Add Custom Class
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBulkAddOpen(true)}
                            className="border-primary/30 text-primary hover:bg-primary/5"
                        >
                            <ListPlus className="h-4 w-4 mr-1.5" /> Bulk Add Classes
                        </Button>
                    </div>
                </div>

                {/* Association trees */}
                <div className="space-y-2 rounded-lg border p-4">
                    {assocDisciplines.map(({ assocId, assocName, disciplines: discs }) => {
                        const divisions = divisionsData?.[assocId] || [];

                        return (
                            <TreeNode
                                key={assocId}
                                label={assocName}
                                indentLevel={0}
                                defaultOpen={assocDisciplines.length === 1}
                            >
                                {discs.map(disc => {
                                    const discKey = getDisciplineKey(disc);
                                    const count = selectionCounts[discKey] || 0;
                                    // Filter divisions by matching sub_association_type
                                    const relevantDivisions = divisions.filter(dg =>
                                        !dg.sub_association_type || !disc.sub_association_type || dg.sub_association_type === disc.sub_association_type
                                    );

                                    return (
                                        <TreeNode
                                            key={disc.id}
                                            label={disc.name}
                                            indentLevel={1}
                                            badge={count > 0 ? <Badge variant="default" className="text-xs h-5 px-1.5">{count}</Badge> : null}
                                        >
                                            {relevantDivisions.map(group => (
                                                <TreeNode
                                                    key={`${assocId}-${group.group}`}
                                                    label={group.group}
                                                    indentLevel={2}
                                                >
                                                    {group.levels.map(level => (
                                                        <LevelCheckbox
                                                            key={`${assocId}-${disc.id}-${group.group}-${level}`}
                                                            assocId={assocId}
                                                            disc={disc}
                                                            groupName={group.group}
                                                            level={level}
                                                            formData={formData}
                                                            setFormData={setFormData}
                                                            disciplineLibrary={disciplineLibrary}
                                                        />
                                                    ))}
                                                </TreeNode>
                                            ))}
                                        </TreeNode>
                                    );
                                })}
                            </TreeNode>
                        );
                    })}
                </div>

                {/* Add Custom Class Dialog */}
                <AddCustomClassDialog
                    open={customClassOpen}
                    onOpenChange={setCustomClassOpen}
                    onAdd={handleBulkAdd}
                />

                {/* Bulk Add Dialog */}
                <BulkAddScheduleDialog
                    open={bulkAddOpen}
                    onOpenChange={setBulkAddOpen}
                    onBulkAdd={handleBulkAdd}
                />
            </CardContent>
        </motion.div>
    );
};
