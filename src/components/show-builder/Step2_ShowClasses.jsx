import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Info, ChevronRight, ChevronDown } from 'lucide-react';
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

// ─── Main component ─────────────────────────────────────────────

export const Step2_ShowClasses = ({ formData, setFormData, disciplineLibrary, associationsData, divisionsData, stepNumber = 4, stepTitle = 'Build Your Class List' }) => {
    const selectedAssocIds = useMemo(() =>
        Object.keys(formData.associations || {}).filter(id => formData.associations[id]),
        [formData.associations]
    );

    // Build association → discipline list
    const assocDisciplines = useMemo(() => {
        if (!disciplineLibrary || !associationsData) return [];
        return selectedAssocIds.map(assocId => {
            const assoc = associationsData.find(a => a.id === assocId);
            const discs = disciplineLibrary
                .filter(d => d.association_id === assocId)
                .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
            return { assocId, assocName: assoc ? `${assoc.abbreviation || assoc.id} - ${assoc.name}` : assocId, disciplines: discs };
        }).filter(a => a.disciplines.length > 0);
    }, [selectedAssocIds, disciplineLibrary, associationsData]);

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

                {/* Total summary */}
                {totalClasses > 0 && (
                    <div className="text-sm text-muted-foreground">
                        <Badge variant="secondary" className="mr-2">{totalClasses}</Badge>
                        class{totalClasses !== 1 ? 'es' : ''} selected
                    </div>
                )}

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
            </CardContent>
        </motion.div>
    );
};
