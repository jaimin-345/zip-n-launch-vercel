import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Download, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { exportShowBudgetToExcel } from '@/lib/showBudgetExport';
import { cn } from '@/lib/utils';
import { isBudgetFrozen } from '@/lib/contractUtils';
import { BudgetFrozenBanner } from '@/components/contract-management/BudgetFrozenBanner';

const TIMING_OPTIONS = [
    { id: 'before_show', label: 'Before Show', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'during_show', label: 'During Show', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { id: 'after_show', label: 'After Show', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
];

const EXPENSE_FRAMEWORK = [
    {
        id: 'facilities',
        title: 'Facilities',
        icon: '🏟️',
        color: 'border-blue-500',
        bgColor: 'bg-blue-500/5',
        textColor: 'text-blue-700 dark:text-blue-400',
        subGroups: [
            {
                title: 'Arena Rentals',
                items: [
                    { name: 'Main competition arena rental', defaultTiming: 'during_show' },
                    { name: 'Secondary arena rental', defaultTiming: 'during_show' },
                    { name: 'Warm-up arena rental', defaultTiming: 'during_show' },
                    { name: 'Covered arena rental', defaultTiming: 'during_show' },
                    { name: 'Outdoor arena rental', defaultTiming: 'during_show' },
                    { name: 'Practice arena rental', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Arena Maintenance & Preparation',
                items: [
                    { name: 'Arena dragging services', defaultTiming: 'during_show' },
                    { name: 'Arena watering / dust control', defaultTiming: 'during_show' },
                    { name: 'Footing preparation or replacement', defaultTiming: 'before_show' },
                    { name: 'Footing testing or inspection', defaultTiming: 'before_show' },
                    { name: 'Arena grooming equipment', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Stall & Barn Rentals',
                items: [
                    { name: 'Horse stall rental (bulk facility fee)', defaultTiming: 'during_show' },
                    { name: 'Tack stall rental', defaultTiming: 'during_show' },
                    { name: 'Temporary stall rentals', defaultTiming: 'during_show' },
                    { name: 'Portable stall rental', defaultTiming: 'during_show' },
                    { name: 'Stall mats rental', defaultTiming: 'during_show' },
                    { name: 'Stall bedding packages', defaultTiming: 'during_show' },
                    { name: 'Stall cleaning services', defaultTiming: 'during_show' },
                    { name: 'Stall damage deposits', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'RV & Camping',
                items: [
                    { name: 'RV space rental', defaultTiming: 'during_show' },
                    { name: 'Electrical hook-ups', defaultTiming: 'during_show' },
                    { name: 'Water hook-ups', defaultTiming: 'during_show' },
                    { name: 'Sewer hook-ups', defaultTiming: 'during_show' },
                    { name: 'Dump station fees', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Facility Spaces',
                items: [
                    { name: 'Show office rental', defaultTiming: 'during_show' },
                    { name: 'Awards room rental', defaultTiming: 'during_show' },
                    { name: 'Judges room rental', defaultTiming: 'during_show' },
                    { name: 'Hospitality room rental', defaultTiming: 'during_show' },
                    { name: 'Announcer booth rental', defaultTiming: 'during_show' },
                    { name: 'Vendor / trade show areas', defaultTiming: 'during_show' },
                    { name: 'Media room rental', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Utilities',
                items: [
                    { name: 'Electrical usage fees', defaultTiming: 'during_show' },
                    { name: 'Temporary power drops', defaultTiming: 'during_show' },
                    { name: 'Water usage fees', defaultTiming: 'during_show' },
                    { name: 'Internet / Wi-Fi', defaultTiming: 'during_show' },
                    { name: 'PA system / sound system', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Grounds Services',
                items: [
                    { name: 'Security services', defaultTiming: 'during_show' },
                    { name: 'Overnight grounds security', defaultTiming: 'during_show' },
                    { name: 'Janitorial services', defaultTiming: 'during_show' },
                    { name: 'Portable restroom rentals', defaultTiming: 'during_show' },
                    { name: 'Waste disposal / dumpsters', defaultTiming: 'during_show' },
                    { name: 'Manure removal services', defaultTiming: 'after_show' },
                ],
            },
        ],
    },
    {
        id: 'associations',
        title: 'Associations & Compliance',
        icon: '📋',
        color: 'border-emerald-500',
        bgColor: 'bg-emerald-500/5',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        subGroups: [
            {
                title: 'Association Sanctioning Fees',
                items: [
                    { name: 'AQHA approval fees', defaultTiming: 'before_show' },
                    { name: 'APHA approval fees', defaultTiming: 'before_show' },
                    { name: 'NSBA approval fees', defaultTiming: 'before_show' },
                    { name: 'NRHA approval fees', defaultTiming: 'before_show' },
                    { name: 'NRCHA approval fees', defaultTiming: 'before_show' },
                    { name: 'PHBA approval fees', defaultTiming: 'before_show' },
                    { name: 'IBHA approval fees', defaultTiming: 'before_show' },
                    { name: 'ABRA approval fees', defaultTiming: 'before_show' },
                    { name: 'AHA approval fees', defaultTiming: 'before_show' },
                    { name: 'POAC approval fees', defaultTiming: 'before_show' },
                    { name: '4-H or youth association fees', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'Association Required Costs',
                items: [
                    { name: 'Per-entry association fees', defaultTiming: 'during_show' },
                    { name: 'Association drug testing fees', defaultTiming: 'during_show' },
                    { name: 'Association recording fees', defaultTiming: 'after_show' },
                    { name: 'Association office processing fees', defaultTiming: 'after_show' },
                    { name: 'Association steward fees', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Compliance & Regulation',
                items: [
                    { name: 'Drug testing programs', defaultTiming: 'during_show' },
                    { name: 'Medication compliance', defaultTiming: 'during_show' },
                    { name: 'Show steward compliance', defaultTiming: 'during_show' },
                    { name: 'Association audits', defaultTiming: 'after_show' },
                ],
            },
            {
                title: 'Insurance',
                items: [
                    { name: 'General liability insurance', defaultTiming: 'before_show' },
                    { name: 'Equine liability insurance', defaultTiming: 'before_show' },
                    { name: 'Event insurance policies', defaultTiming: 'before_show' },
                    { name: 'Participant accident insurance', defaultTiming: 'before_show' },
                    { name: 'Vendor insurance riders', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'Permits',
                items: [
                    { name: 'Event permits', defaultTiming: 'before_show' },
                    { name: 'Local municipality permits', defaultTiming: 'before_show' },
                    { name: 'Fire marshal permits', defaultTiming: 'before_show' },
                    { name: 'Alcohol permits', defaultTiming: 'before_show' },
                ],
            },
        ],
    },
    {
        id: 'administrative',
        title: 'Administrative',
        icon: '📄',
        color: 'border-slate-500',
        bgColor: 'bg-slate-500/5',
        textColor: 'text-slate-700 dark:text-slate-400',
        subGroups: [
            {
                title: 'Show Office Administration',
                items: [
                    { name: 'Show secretary services', defaultTiming: 'during_show' },
                    { name: 'Assistant secretary payroll', defaultTiming: 'during_show' },
                    { name: 'Data entry staff', defaultTiming: 'during_show' },
                    { name: 'Office administrative staff', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Software & Technology',
                items: [
                    { name: 'Entry management software', defaultTiming: 'before_show' },
                    { name: 'Online entry platform fees', defaultTiming: 'before_show' },
                    { name: 'Payment processing fees', defaultTiming: 'after_show' },
                    { name: 'Website hosting costs', defaultTiming: 'before_show' },
                    { name: 'Online registration system', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'Accounting & Finance',
                items: [
                    { name: 'Accounting services', defaultTiming: 'after_show' },
                    { name: 'Financial reconciliation services', defaultTiming: 'after_show' },
                    { name: 'Bookkeeping services', defaultTiming: 'after_show' },
                ],
            },
            {
                title: 'Legal',
                items: [
                    { name: 'Liability waivers', defaultTiming: 'before_show' },
                    { name: 'Legal contract preparation', defaultTiming: 'before_show' },
                    { name: 'Vendor contracts', defaultTiming: 'before_show' },
                    { name: 'Sponsorship agreements', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'Documentation & Printing',
                items: [
                    { name: 'Entry forms', defaultTiming: 'before_show' },
                    { name: 'Show programs', defaultTiming: 'before_show' },
                    { name: 'Judges cards', defaultTiming: 'before_show' },
                    { name: 'Score sheets', defaultTiming: 'before_show' },
                    { name: 'Pattern sheets', defaultTiming: 'before_show' },
                ],
            },
        ],
    },
    {
        id: 'operations',
        title: 'Operations',
        icon: '⚙️',
        color: 'border-orange-500',
        bgColor: 'bg-orange-500/5',
        textColor: 'text-orange-700 dark:text-orange-400',
        subGroups: [
            {
                title: 'Office Supplies',
                items: [
                    { name: 'Printer paper', defaultTiming: 'before_show' },
                    { name: 'Ink / toner', defaultTiming: 'before_show' },
                    { name: 'Clipboards', defaultTiming: 'before_show' },
                    { name: 'Office supplies', defaultTiming: 'before_show' },
                    { name: 'Filing systems', defaultTiming: 'before_show' },
                    { name: 'Label printers', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'Communications',
                items: [
                    { name: 'Two-way radios', defaultTiming: 'during_show' },
                    { name: 'Radio headsets', defaultTiming: 'during_show' },
                    { name: 'Charging stations', defaultTiming: 'during_show' },
                    { name: 'Announcer communication systems', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Arena Operations',
                items: [
                    { name: 'Tractor operation', defaultTiming: 'during_show' },
                    { name: 'Arena dragging', defaultTiming: 'during_show' },
                    { name: 'Arena watering', defaultTiming: 'during_show' },
                    { name: 'Arena crew labor', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Utilities & Temporary Infrastructure',
                items: [
                    { name: 'Generators', defaultTiming: 'during_show' },
                    { name: 'Generator fuel', defaultTiming: 'during_show' },
                    { name: 'Temporary lighting', defaultTiming: 'during_show' },
                    { name: 'Electrical distribution', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Transportation',
                items: [
                    { name: 'Equipment transportation', defaultTiming: 'before_show' },
                    { name: 'Trailer hauling fuel', defaultTiming: 'before_show' },
                    { name: 'Equipment drivers', defaultTiming: 'during_show' },
                ],
            },
        ],
    },
    {
        id: 'awards',
        title: 'Awards',
        icon: '🏆',
        color: 'border-yellow-500',
        bgColor: 'bg-yellow-500/5',
        textColor: 'text-yellow-700 dark:text-yellow-400',
        subGroups: [
            {
                title: 'Standard Awards',
                items: [
                    { name: 'Champion ribbons', defaultTiming: 'before_show' },
                    { name: 'Reserve champion ribbons', defaultTiming: 'before_show' },
                    { name: 'Placement ribbons', defaultTiming: 'before_show' },
                    { name: 'Class ribbons', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'Premium Awards',
                items: [
                    { name: 'Belt buckles', defaultTiming: 'before_show' },
                    { name: 'Trophy saddles', defaultTiming: 'before_show' },
                    { name: 'Custom trophies', defaultTiming: 'before_show' },
                    { name: 'High point awards', defaultTiming: 'before_show' },
                    { name: 'Circuit awards', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'Prize Money',
                items: [
                    { name: 'Added money classes', defaultTiming: 'after_show' },
                    { name: 'Jackpot payouts', defaultTiming: 'after_show' },
                    { name: 'Open purse classes', defaultTiming: 'after_show' },
                ],
            },
            {
                title: 'Award Production',
                items: [
                    { name: 'Engraving services', defaultTiming: 'before_show' },
                    { name: 'Award shipping', defaultTiming: 'before_show' },
                    { name: 'Award packaging', defaultTiming: 'before_show' },
                ],
            },
        ],
    },
    {
        id: 'officials_staff',
        title: 'Officials & Staff',
        icon: '👤',
        color: 'border-indigo-500',
        bgColor: 'bg-indigo-500/5',
        textColor: 'text-indigo-700 dark:text-indigo-400',
        subGroups: [
            {
                title: 'Judges',
                items: [
                    { name: 'Judge fees', defaultTiming: 'during_show' },
                    { name: 'Judge travel', defaultTiming: 'during_show' },
                    { name: 'Judge hotel', defaultTiming: 'during_show' },
                    { name: 'Judge per diem', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Officials',
                items: [
                    { name: 'Association steward', defaultTiming: 'during_show' },
                    { name: 'Drug testing steward', defaultTiming: 'during_show' },
                    { name: 'Technical delegate', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Arena Staff',
                items: [
                    { name: 'Ring stewards', defaultTiming: 'during_show' },
                    { name: 'Gate crew', defaultTiming: 'during_show' },
                    { name: 'Arena crew', defaultTiming: 'during_show' },
                    { name: 'Tractor drivers', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Office Staff',
                items: [
                    { name: 'Show secretary', defaultTiming: 'during_show' },
                    { name: 'Assistant secretaries', defaultTiming: 'during_show' },
                    { name: 'Office clerks', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Event Personnel',
                items: [
                    { name: 'Announcer', defaultTiming: 'during_show' },
                    { name: 'Scoreboard operator', defaultTiming: 'during_show' },
                    { name: 'Video replay staff', defaultTiming: 'during_show' },
                ],
            },
        ],
    },
    {
        id: 'marketing',
        title: 'Marketing',
        icon: '📢',
        color: 'border-pink-500',
        bgColor: 'bg-pink-500/5',
        textColor: 'text-pink-700 dark:text-pink-400',
        subGroups: [
            {
                title: 'Digital Marketing',
                items: [
                    { name: 'Social media advertising', defaultTiming: 'before_show' },
                    { name: 'Website promotion', defaultTiming: 'before_show' },
                    { name: 'Email marketing campaigns', defaultTiming: 'before_show' },
                    { name: 'Online event listings', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'Print Marketing',
                items: [
                    { name: 'Posters', defaultTiming: 'before_show' },
                    { name: 'Flyers', defaultTiming: 'before_show' },
                    { name: 'Mailers', defaultTiming: 'before_show' },
                    { name: 'Event programs', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'Sponsorship Materials',
                items: [
                    { name: 'Sponsor banners', defaultTiming: 'before_show' },
                    { name: 'Arena signage', defaultTiming: 'before_show' },
                    { name: 'Sponsor boards', defaultTiming: 'before_show' },
                    { name: 'Sponsor recognition displays', defaultTiming: 'before_show' },
                ],
            },
            {
                title: 'Media Coverage',
                items: [
                    { name: 'Photographer contracts', defaultTiming: 'during_show' },
                    { name: 'Videographer contracts', defaultTiming: 'during_show' },
                    { name: 'Live stream production', defaultTiming: 'during_show' },
                ],
            },
        ],
    },
    {
        id: 'equipment',
        title: 'Equipment',
        icon: '🔧',
        color: 'border-cyan-500',
        bgColor: 'bg-cyan-500/5',
        textColor: 'text-cyan-700 dark:text-cyan-400',
        subGroups: [
            {
                title: 'Arena Equipment',
                items: [
                    { name: 'Cones', defaultTiming: 'during_show' },
                    { name: 'Poles', defaultTiming: 'during_show' },
                    { name: 'Barrels', defaultTiming: 'during_show' },
                    { name: 'Trail obstacles', defaultTiming: 'during_show' },
                    { name: 'Ranch obstacles', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Hunter / Jumping Equipment',
                items: [
                    { name: 'Jump standards', defaultTiming: 'during_show' },
                    { name: 'Jump rails', defaultTiming: 'during_show' },
                    { name: 'Cavaletti', defaultTiming: 'during_show' },
                    { name: 'Flower boxes', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Show Infrastructure',
                items: [
                    { name: 'Timing equipment', defaultTiming: 'during_show' },
                    { name: 'Scoreboards', defaultTiming: 'during_show' },
                    { name: 'Video displays', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Maintenance Equipment',
                items: [
                    { name: 'Tractor rental', defaultTiming: 'during_show' },
                    { name: 'Arena drag equipment', defaultTiming: 'during_show' },
                    { name: 'Water trucks', defaultTiming: 'during_show' },
                ],
            },
        ],
    },
    {
        id: 'hospitality',
        title: 'Hospitality',
        icon: '🍽️',
        color: 'border-rose-500',
        bgColor: 'bg-rose-500/5',
        textColor: 'text-rose-700 dark:text-rose-400',
        subGroups: [
            {
                title: 'Judges Hospitality',
                items: [
                    { name: 'Judges meals', defaultTiming: 'during_show' },
                    { name: 'Judges snacks', defaultTiming: 'during_show' },
                    { name: 'Judges beverages', defaultTiming: 'during_show' },
                    { name: 'Judges lounge supplies', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Staff Hospitality',
                items: [
                    { name: 'Staff meals', defaultTiming: 'during_show' },
                    { name: 'Staff snacks', defaultTiming: 'during_show' },
                    { name: 'Staff drinks', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'Exhibitor Hospitality',
                items: [
                    { name: 'Exhibitor welcome reception', defaultTiming: 'during_show' },
                    { name: 'Exhibitor coffee stations', defaultTiming: 'during_show' },
                    { name: 'Exhibitor hospitality tent', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'VIP & Sponsor Hospitality',
                items: [
                    { name: 'Sponsor lounge', defaultTiming: 'during_show' },
                    { name: 'VIP seating areas', defaultTiming: 'during_show' },
                    { name: 'Sponsor catering', defaultTiming: 'during_show' },
                ],
            },
            {
                title: 'General Hospitality',
                items: [
                    { name: 'Coffee stations', defaultTiming: 'during_show' },
                    { name: 'Water stations', defaultTiming: 'during_show' },
                    { name: 'Ice for horses', defaultTiming: 'during_show' },
                    { name: 'Ice for coolers', defaultTiming: 'during_show' },
                ],
            },
        ],
    },
];

const feeTimingLabels = {
    pre_entry: 'Pre-Entry / Reservation',
    at_check_in: 'At Check-In',
    settlement: 'Post-Show / Settlement',
};

const SubGroupSection = ({ subGroup, categoryId, expenses, onToggleItem, onUpdateExpense, onRemoveExpense, locked }) => {
    const activeNames = new Set(expenses.filter(e => e.category === categoryId).map(e => e.name));
    const subGroupExpenses = expenses.filter(e => e.category === categoryId && subGroup.items.some(i => i.name === e.name));

    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{subGroup.title}</p>
            <div className="flex flex-wrap gap-1.5">
                {subGroup.items.map(item => {
                    const isActive = activeNames.has(item.name);
                    return (
                        <button
                            key={item.name}
                            type="button"
                            disabled={locked}
                            onClick={() => onToggleItem(categoryId, item)}
                            className={cn(
                                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                                isActive
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
                                locked && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            {isActive && <Check className="h-3 w-3" />}
                            {item.name}
                        </button>
                    );
                })}
            </div>
            {/* Inline amount/timing editors for selected items in this sub-group */}
            {subGroupExpenses.length > 0 && (
                <div className="space-y-1.5 pt-1">
                    {subGroupExpenses.map(expense => (
                        <div key={expense.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                            <span className="text-sm font-medium truncate flex-1 min-w-0">{expense.name}</span>
                            <Input
                                type="number"
                                value={expense.amount}
                                onChange={(e) => onUpdateExpense(expense.id, 'amount', e.target.value)}
                                placeholder="$ Amount"
                                className="w-28"
                                disabled={locked}
                            />
                            <Select value={expense.timing || ''} onValueChange={(val) => onUpdateExpense(expense.id, 'timing', val)} disabled={locked}>
                                <SelectTrigger className="w-36"><SelectValue placeholder="Timing..." /></SelectTrigger>
                                <SelectContent>
                                    {TIMING_OPTIONS.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                value={expense.notes || ''}
                                onChange={(e) => onUpdateExpense(expense.id, 'notes', e.target.value)}
                                placeholder="Notes"
                                className="flex-1 hidden lg:block min-w-0"
                                disabled={locked}
                            />
                            {!locked && (
                                <Button variant="ghost" size="icon" className="flex-shrink-0 text-destructive hover:bg-destructive/10" onClick={() => onRemoveExpense(expense.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const CategorySection = ({ category, expenses, onToggleItem, onUpdateExpense, onRemoveExpense, onAddCustom, locked }) => {
    const [expanded, setExpanded] = useState(false);
    const categoryExpenses = expenses.filter(e => e.category === category.id);
    const categoryTotal = categoryExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const activeCount = categoryExpenses.length;

    // Find custom expenses (not in any subgroup preset list)
    const allPresetNames = new Set(category.subGroups.flatMap(sg => sg.items.map(i => i.name)));
    const customExpenses = categoryExpenses.filter(e => !allPresetNames.has(e.name));

    return (
        <Card className={cn('overflow-hidden border-l-4', category.color)}>
            <div
                className={cn('px-4 py-3 flex items-center justify-between cursor-pointer select-none', category.bgColor)}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <span className="text-lg">{category.icon}</span>
                    <h4 className={cn('font-semibold text-base', category.textColor)}>{category.title}</h4>
                    {activeCount > 0 && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', category.bgColor, category.textColor)}>
                            {activeCount} item{activeCount !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {categoryTotal > 0 && (
                        <span className={cn('text-sm font-semibold', category.textColor)}>${categoryTotal.toFixed(2)}</span>
                    )}
                    {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
            </div>

            {expanded && (
                <CardContent className="pt-4 space-y-5">
                    {category.subGroups.map(subGroup => (
                        <SubGroupSection
                            key={subGroup.title}
                            subGroup={subGroup}
                            categoryId={category.id}
                            expenses={expenses}
                            onToggleItem={onToggleItem}
                            onUpdateExpense={onUpdateExpense}
                            onRemoveExpense={onRemoveExpense}
                            locked={locked}
                        />
                    ))}

                    {/* Custom (user-added) expenses for this category */}
                    {customExpenses.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custom Expenses</p>
                            {customExpenses.map(expense => (
                                <div key={expense.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                    <Input
                                        value={expense.name}
                                        onChange={(e) => onUpdateExpense(expense.id, 'name', e.target.value)}
                                        placeholder="Expense name"
                                        className="flex-1"
                                        disabled={locked}
                                    />
                                    <Input
                                        type="number"
                                        value={expense.amount}
                                        onChange={(e) => onUpdateExpense(expense.id, 'amount', e.target.value)}
                                        placeholder="$ Amount"
                                        className="w-28"
                                        disabled={locked}
                                    />
                                    <Select value={expense.timing || ''} onValueChange={(val) => onUpdateExpense(expense.id, 'timing', val)} disabled={locked}>
                                        <SelectTrigger className="w-36"><SelectValue placeholder="Timing..." /></SelectTrigger>
                                        <SelectContent>
                                            {TIMING_OPTIONS.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        value={expense.notes || ''}
                                        onChange={(e) => onUpdateExpense(expense.id, 'notes', e.target.value)}
                                        placeholder="Notes"
                                        className="flex-1 hidden lg:block min-w-0"
                                        disabled={locked}
                                    />
                                    {!locked && (
                                        <Button variant="ghost" size="icon" className="flex-shrink-0 text-destructive hover:bg-destructive/10" onClick={() => onRemoveExpense(expense.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <Button variant="outline" size="sm" className="w-full" onClick={() => onAddCustom(category.id)} disabled={locked}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Custom Expense
                    </Button>
                </CardContent>
            )}
        </Card>
    );
};

export const ShowExpensesStep = ({ formData, setFormData }) => {
    const expenses = formData.showExpenses || [];
    const fees = formData.fees || [];
    const sponsorshipRevenue = formData.sponsorshipRevenue || [];
    const awardExpenses = formData.awardExpenses || [];
    const classAwards = formData.classAwards || {};

    const totalFeeRevenue = useMemo(() => fees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0), [fees]);
    const totalSponsorshipRevenue = useMemo(() => sponsorshipRevenue.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0), [sponsorshipRevenue]);
    const totalRevenue = totalFeeRevenue + totalSponsorshipRevenue;

    const totalShowExpenses = useMemo(() => expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0), [expenses]);
    const totalAwardExpenses = useMemo(() => awardExpenses.reduce((sum, a) => sum + ((parseFloat(a.amount) || 0) * (parseInt(a.qty) || 1)), 0), [awardExpenses]);
    const totalClassAwards = useMemo(() => Object.values(classAwards).reduce((sum, a) => sum + (parseFloat(a.budget) || 0), 0), [classAwards]);
    const totalExpenses = totalShowExpenses + totalAwardExpenses + totalClassAwards;

    const netProfitLoss = totalRevenue - totalExpenses;
    const locked = isBudgetFrozen(formData);

    const toggleItem = (categoryId, item) => {
        setFormData(prev => {
            const existing = (prev.showExpenses || []).find(e => e.category === categoryId && e.name === item.name);
            if (existing) {
                return { ...prev, showExpenses: (prev.showExpenses || []).filter(e => e.id !== existing.id) };
            }
            const newExpense = { id: uuidv4(), name: item.name, amount: '', category: categoryId, timing: item.defaultTiming, notes: '' };
            return { ...prev, showExpenses: [...(prev.showExpenses || []), newExpense] };
        });
    };

    const addCustomExpense = (categoryId) => {
        const newExpense = { id: uuidv4(), name: '', amount: '', category: categoryId, timing: 'before_show', notes: '' };
        setFormData(prev => ({ ...prev, showExpenses: [...(prev.showExpenses || []), newExpense] }));
    };

    const updateExpense = (id, field, value) => {
        setFormData(prev => ({ ...prev, showExpenses: (prev.showExpenses || []).map(e => e.id === id ? { ...e, [field]: value } : e) }));
    };

    const removeExpense = (id) => {
        setFormData(prev => ({ ...prev, showExpenses: (prev.showExpenses || []).filter(e => e.id !== id) }));
    };

    const timingSummary = useMemo(() => {
        const counts = { before_show: 0, during_show: 0, after_show: 0 };
        const totals = { before_show: 0, during_show: 0, after_show: 0 };
        for (const e of expenses) {
            if (e.timing && counts[e.timing] !== undefined) {
                counts[e.timing]++;
                totals[e.timing] += parseFloat(e.amount) || 0;
            }
        }
        return { counts, totals };
    }, [expenses]);

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 5: Show Expenses</CardTitle>
                <CardDescription>Select expense items by category, set amounts, and assign timing buckets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

                {locked && <BudgetFrozenBanner />}

                {/* Timing summary badges */}
                {totalShowExpenses > 0 && (
                    <div className="flex flex-wrap gap-3">
                        {TIMING_OPTIONS.map(t => (
                            <div key={t.id} className={cn('px-3 py-2 rounded-lg text-xs font-medium', t.bg, t.color)}>
                                <span className="font-semibold">{t.label}:</span> {timingSummary.counts[t.id]} items / ${timingSummary.totals[t.id].toFixed(2)}
                            </div>
                        ))}
                    </div>
                )}

                {/* Category sections */}
                {EXPENSE_FRAMEWORK.map(category => (
                    <CategorySection
                        key={category.id}
                        category={category}
                        expenses={expenses}
                        onToggleItem={toggleItem}
                        onUpdateExpense={updateExpense}
                        onRemoveExpense={removeExpense}
                        onAddCustom={addCustomExpense}
                        locked={locked}
                    />
                ))}

                {totalShowExpenses > 0 && (
                    <div className="text-right px-2">
                        <p className="text-sm font-semibold text-red-600">Total Show Expenses: ${totalShowExpenses.toFixed(2)}</p>
                    </div>
                )}

                {/* ========== BUDGET SUMMARY / P&L ========== */}
                {(fees.length > 0 || sponsorshipRevenue.length > 0 || expenses.length > 0) && (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
                            <h4 className="font-semibold text-base">Budget Summary</h4>
                            <Button variant="outline" size="sm" onClick={() => exportShowBudgetToExcel(formData)}>
                                <Download className="h-4 w-4 mr-2" /> Export Spreadsheet
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-emerald-500/5">
                                        <th className="text-left px-4 py-2 font-medium text-emerald-700 dark:text-emerald-400" colSpan={2}>REVENUE</th>
                                        <th className="text-right px-4 py-2 font-medium text-emerald-700 dark:text-emerald-400">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fees.filter(f => f.name && f.amount).map(fee => (
                                        <tr key={fee.id} className="border-b last:border-0">
                                            <td className="px-4 py-2">{fee.name}</td>
                                            <td className="px-4 py-2 text-muted-foreground">{feeTimingLabels[fee.payment_timing] || fee.payment_timing}</td>
                                            <td className="px-4 py-2 text-right font-medium">${parseFloat(fee.amount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {fees.length > 0 && (
                                        <tr className="bg-emerald-500/5">
                                            <td className="px-4 py-2 font-semibold" colSpan={2}>Subtotal Fee Revenue</td>
                                            <td className="px-4 py-2 text-right font-semibold">${totalFeeRevenue.toFixed(2)}</td>
                                        </tr>
                                    )}
                                    {sponsorshipRevenue.filter(s => s.name && s.amount).map(item => (
                                        <tr key={item.id} className="border-b last:border-0">
                                            <td className="px-4 py-2">{item.name}</td>
                                            <td className="px-4 py-2 text-muted-foreground">Sponsorship</td>
                                            <td className="px-4 py-2 text-right font-medium">${parseFloat(item.amount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {sponsorshipRevenue.length > 0 && (
                                        <tr className="bg-emerald-500/5">
                                            <td className="px-4 py-2 font-semibold" colSpan={2}>Subtotal Sponsorship</td>
                                            <td className="px-4 py-2 text-right font-semibold">${totalSponsorshipRevenue.toFixed(2)}</td>
                                        </tr>
                                    )}
                                    <tr className="bg-emerald-500/10 font-bold">
                                        <td className="px-4 py-3" colSpan={2}>TOTAL REVENUE</td>
                                        <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">${totalRevenue.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                                <thead>
                                    <tr className="border-b bg-red-500/5">
                                        <th className="text-left px-4 py-2 font-medium text-red-700 dark:text-red-400" colSpan={2}>EXPENSES</th>
                                        <th className="text-right px-4 py-2 font-medium text-red-700 dark:text-red-400">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {EXPENSE_FRAMEWORK.map(cat => {
                                        const catExpenses = expenses.filter(e => e.category === cat.id && e.name && e.amount);
                                        if (catExpenses.length === 0) return null;
                                        const catTotal = catExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                                        return (
                                            <React.Fragment key={cat.id}>
                                                <tr className={cat.bgColor}>
                                                    <td className={cn('px-4 py-1.5 font-semibold text-xs uppercase', cat.textColor)} colSpan={3}>
                                                        {cat.icon} {cat.title}
                                                    </td>
                                                </tr>
                                                {catExpenses.map(expense => {
                                                    const timingLabel = TIMING_OPTIONS.find(t => t.id === expense.timing)?.label || '';
                                                    return (
                                                        <tr key={expense.id} className="border-b last:border-0">
                                                            <td className="px-4 py-2">{expense.name}</td>
                                                            <td className="px-4 py-2 text-muted-foreground">{timingLabel}</td>
                                                            <td className="px-4 py-2 text-right font-medium">${parseFloat(expense.amount).toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="bg-red-500/5">
                                                    <td className="px-4 py-1.5 font-semibold text-xs" colSpan={2}>Subtotal {cat.title}</td>
                                                    <td className="px-4 py-1.5 text-right font-semibold text-xs">${catTotal.toFixed(2)}</td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                    {expenses.filter(e => !e.category && e.name && e.amount).length > 0 && (
                                        <>
                                            {expenses.filter(e => !e.category && e.name && e.amount).map(expense => (
                                                <tr key={expense.id} className="border-b last:border-0">
                                                    <td className="px-4 py-2">{expense.name}</td>
                                                    <td className="px-4 py-2 text-muted-foreground">{TIMING_OPTIONS.find(t => t.id === expense.timing)?.label || ''}</td>
                                                    <td className="px-4 py-2 text-right font-medium">${parseFloat(expense.amount).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </>
                                    )}
                                    {totalShowExpenses > 0 && (
                                        <tr className="bg-red-500/5">
                                            <td className="px-4 py-2 font-semibold" colSpan={2}>Subtotal Show Expenses</td>
                                            <td className="px-4 py-2 text-right font-semibold">${totalShowExpenses.toFixed(2)}</td>
                                        </tr>
                                    )}
                                    {awardExpenses.filter(a => a.name && a.amount).map(award => (
                                        <tr key={award.id} className="border-b last:border-0">
                                            <td className="px-4 py-2">{award.name}</td>
                                            <td className="px-4 py-2 text-muted-foreground">Awards (Step 6)</td>
                                            <td className="px-4 py-2 text-right font-medium">${((parseFloat(award.amount) || 0) * (parseInt(award.qty) || 1)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {totalClassAwards > 0 && (
                                        <tr className="border-b last:border-0">
                                            <td className="px-4 py-2">Class Awards Budget</td>
                                            <td className="px-4 py-2 text-muted-foreground">Awards (Step 6)</td>
                                            <td className="px-4 py-2 text-right font-medium">${totalClassAwards.toFixed(2)}</td>
                                        </tr>
                                    )}
                                    {(totalAwardExpenses > 0 || totalClassAwards > 0) && (
                                        <tr className="bg-red-500/5">
                                            <td className="px-4 py-2 font-semibold" colSpan={2}>Subtotal Award Expenses</td>
                                            <td className="px-4 py-2 text-right font-semibold">${(totalAwardExpenses + totalClassAwards).toFixed(2)}</td>
                                        </tr>
                                    )}
                                    <tr className="bg-red-500/10 font-bold">
                                        <td className="px-4 py-3" colSpan={2}>TOTAL EXPENSES</td>
                                        <td className="px-4 py-3 text-right text-red-700 dark:text-red-400">${totalExpenses.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr className="bg-muted/50 font-bold text-base">
                                        <td className="px-4 py-4" colSpan={2}>PROJECTED PROFIT / LOSS</td>
                                        <td className={cn("px-4 py-4 text-right", netProfitLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                            {netProfitLoss >= 0 ? '' : '-'}${Math.abs(netProfitLoss).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

            </CardContent>
        </motion.div>
    );
};
