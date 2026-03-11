import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, ChevronDown, ChevronRight, Trophy, Award, Medal, Gift, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const AWARD_TYPES = ['Trophy', 'Buckle', 'Ribbon', 'Plaque', 'Prize Money', 'Cooler', 'Blanket', 'Gift Card', 'Jacket', 'Saddle', 'Scholarship', 'Other'];

const PRIZE_TYPES = ['Buckle', 'Trophy', 'Plaque', 'Ribbon', 'Prize Money', 'Cooler', 'Blanket', 'Jacket', 'Saddle', 'Gift Card', 'Scholarship', 'Custom'];

const AWARD_CATEGORIES = [
    { id: 'highPoint', title: 'High Point / All-Around Awards', icon: Trophy, color: 'border-amber-500', bgColor: 'bg-amber-500/5', textColor: 'text-amber-700 dark:text-amber-400', description: 'Champion and reserve champion awards across divisions' },
    { id: 'circuit', title: 'Circuit Awards', icon: Medal, color: 'border-blue-500', bgColor: 'bg-blue-500/5', textColor: 'text-blue-700 dark:text-blue-400', description: 'Awards that apply across multiple classes or shows' },
    { id: 'special', title: 'Special Awards', icon: Award, color: 'border-purple-500', bgColor: 'bg-purple-500/5', textColor: 'text-purple-700 dark:text-purple-400', description: 'Sponsor trophies, scholarships, sportsmanship awards' },
];

const AwardCategoryCard = ({ category, awards, onUpdate, onAddItem, onRemoveItem, onAddPrize, onRemovePrize, onUpdatePrize }) => {
    const [expanded, setExpanded] = useState(false);
    const items = awards[category.id] || [];
    const Icon = category.icon;
    const allPrizes = items.flatMap(item => item.prizes || []);
    const totalBudget = allPrizes.reduce((sum, p) => sum + ((parseFloat(p.value) || 0) * (parseInt(p.qty) || 1)), 0);
    const donatedTotal = allPrizes.filter(p => p.source === 'donated').reduce((sum, p) => sum + ((parseFloat(p.value) || 0) * (parseInt(p.qty) || 1)), 0);
    const purchasedTotal = totalBudget - donatedTotal;

    return (
        <div className={cn('border rounded-lg overflow-hidden border-l-4', category.color)}>
            <div
                className={cn('px-4 py-3 flex items-center justify-between cursor-pointer select-none', category.bgColor)}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <Icon className={cn('h-5 w-5', category.textColor)} />
                    <div>
                        <h4 className={cn('font-semibold text-sm', category.textColor)}>{category.title}</h4>
                        <p className="text-[11px] text-muted-foreground">{category.description}</p>
                    </div>
                    {items.length > 0 && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', category.bgColor, category.textColor)}>
                            {items.length} award{items.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {totalBudget > 0 && (
                        <div className="text-right">
                            <span className={cn('text-sm font-semibold', category.textColor)}>${totalBudget.toFixed(2)}</span>
                            {donatedTotal > 0 && (
                                <div className="flex gap-2 text-[10px]">
                                    {purchasedTotal > 0 && <span className="text-muted-foreground">${purchasedTotal.toFixed(2)} purchased</span>}
                                    <span className="text-emerald-600">${donatedTotal.toFixed(2)} donated</span>
                                </div>
                            )}
                        </div>
                    )}
                    {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
            </div>

            {expanded && (
                <div className="p-4 space-y-3">
                    {items.length === 0 ? (
                        <div className="text-center py-6 border-2 border-dashed rounded-lg">
                            <p className="text-sm text-muted-foreground">No awards defined yet. Add one below.</p>
                        </div>
                    ) : (
                        items.map((item, idx) => (
                            <div key={item.id} className="border rounded-lg bg-background p-3 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={item.name}
                                        onChange={(e) => onUpdate(category.id, item.id, 'name', e.target.value)}
                                        placeholder={category.id === 'highPoint' ? 'e.g., Amateur High Point' : category.id === 'circuit' ? 'e.g., All-Around Circuit Award' : 'e.g., Sportsmanship Award'}
                                        className="flex-1 font-medium h-8 text-sm"
                                    />
                                    <Input
                                        value={item.criteria || ''}
                                        onChange={(e) => onUpdate(category.id, item.id, 'criteria', e.target.value)}
                                        placeholder="Criteria / eligibility..."
                                        className="flex-1 h-8 text-sm"
                                    />
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 flex-shrink-0" onClick={() => onRemoveItem(category.id, item.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                {/* Prize items */}
                                <div className="pl-4 border-l-2 border-muted space-y-1.5">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Prize Items</p>
                                    {(item.prizes || []).map((prize, pIdx) => (
                                        <div key={prize.id} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <Select value={prize.type || ''} onValueChange={(val) => onUpdatePrize(category.id, item.id, prize.id, 'type', val)}>
                                                <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Type..." /></SelectTrigger>
                                                <SelectContent>
                                                    {PRIZE_TYPES.map(t => (
                                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                value={prize.description || ''}
                                                onChange={(e) => onUpdatePrize(category.id, item.id, prize.id, 'description', e.target.value)}
                                                placeholder="Description..."
                                                className="h-7 text-xs flex-1 min-w-[100px]"
                                            />
                                            <Input
                                                type="number"
                                                value={prize.value || ''}
                                                onChange={(e) => onUpdatePrize(category.id, item.id, prize.id, 'value', e.target.value)}
                                                placeholder="$0"
                                                className="h-7 text-xs w-20 text-right"
                                            />
                                            <Input
                                                type="number"
                                                min="1"
                                                value={prize.qty || ''}
                                                onChange={(e) => onUpdatePrize(category.id, item.id, prize.id, 'qty', e.target.value)}
                                                placeholder="Qty"
                                                className="h-7 text-xs w-14 text-right"
                                            />
                                            <Select value={prize.source || 'purchased'} onValueChange={(val) => onUpdatePrize(category.id, item.id, prize.id, 'source', val)}>
                                                <SelectTrigger className={cn('h-7 text-xs w-28', prize.source === 'donated' ? 'text-emerald-600 border-emerald-300' : '')}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="purchased"><span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> Purchased</span></SelectItem>
                                                    <SelectItem value="donated"><span className="flex items-center gap-1"><Gift className="h-3 w-3" /> Donated</span></SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => onRemovePrize(category.id, item.id, prize.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => onAddPrize(category.id, item.id)}>
                                        <PlusCircle className="h-3 w-3 mr-1" /> Add Prize Item
                                    </Button>
                                </div>

                                {/* Item notes */}
                                <Input
                                    value={item.notes || ''}
                                    onChange={(e) => onUpdate(category.id, item.id, 'notes', e.target.value)}
                                    placeholder="Notes (e.g., sponsored by..., eligibility rules...)"
                                    className="h-7 text-xs"
                                />
                            </div>
                        ))
                    )}
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onAddItem(category.id)}>
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Award
                    </Button>
                </div>
            )}
        </div>
    );
};

export const AwardsSponsorshipStep = ({ formData, setFormData }) => {
    const structuredAwards = formData.structuredAwards || {};

    const updateAwardItem = (categoryId, itemId, field, value) => {
        setFormData(prev => {
            const catItems = [...(prev.structuredAwards?.[categoryId] || [])];
            const idx = catItems.findIndex(i => i.id === itemId);
            if (idx >= 0) catItems[idx] = { ...catItems[idx], [field]: value };
            return { ...prev, structuredAwards: { ...prev.structuredAwards, [categoryId]: catItems } };
        });
    };

    const addAwardItem = (categoryId) => {
        const newItem = { id: uuidv4(), name: '', criteria: '', notes: '', prizes: [] };
        setFormData(prev => ({
            ...prev,
            structuredAwards: {
                ...prev.structuredAwards,
                [categoryId]: [...(prev.structuredAwards?.[categoryId] || []), newItem],
            },
        }));
    };

    const removeAwardItem = (categoryId, itemId) => {
        setFormData(prev => ({
            ...prev,
            structuredAwards: {
                ...prev.structuredAwards,
                [categoryId]: (prev.structuredAwards?.[categoryId] || []).filter(i => i.id !== itemId),
            },
        }));
    };

    const addPrize = (categoryId, itemId) => {
        const newPrize = { id: uuidv4(), type: '', description: '', value: '', qty: 1, source: 'purchased' };
        setFormData(prev => {
            const catItems = [...(prev.structuredAwards?.[categoryId] || [])];
            const idx = catItems.findIndex(i => i.id === itemId);
            if (idx >= 0) {
                catItems[idx] = { ...catItems[idx], prizes: [...(catItems[idx].prizes || []), newPrize] };
            }
            return { ...prev, structuredAwards: { ...prev.structuredAwards, [categoryId]: catItems } };
        });
    };

    const removePrize = (categoryId, itemId, prizeId) => {
        setFormData(prev => {
            const catItems = [...(prev.structuredAwards?.[categoryId] || [])];
            const idx = catItems.findIndex(i => i.id === itemId);
            if (idx >= 0) {
                catItems[idx] = { ...catItems[idx], prizes: (catItems[idx].prizes || []).filter(p => p.id !== prizeId) };
            }
            return { ...prev, structuredAwards: { ...prev.structuredAwards, [categoryId]: catItems } };
        });
    };

    const updatePrize = (categoryId, itemId, prizeId, field, value) => {
        setFormData(prev => {
            const catItems = [...(prev.structuredAwards?.[categoryId] || [])];
            const itemIdx = catItems.findIndex(i => i.id === itemId);
            if (itemIdx >= 0) {
                const prizes = [...(catItems[itemIdx].prizes || [])];
                const prizeIdx = prizes.findIndex(p => p.id === prizeId);
                if (prizeIdx >= 0) {
                    prizes[prizeIdx] = { ...prizes[prizeIdx], [field]: value };
                    catItems[itemIdx] = { ...catItems[itemIdx], prizes };
                }
            }
            return { ...prev, structuredAwards: { ...prev.structuredAwards, [categoryId]: catItems } };
        });
    };

    // --- Award Expenses (general) ---
    const awardExpenses = formData.awardExpenses || [];
    const totalAwardExpenses = useMemo(() => awardExpenses.reduce((sum, a) => sum + ((parseFloat(a.amount) || 0) * (parseInt(a.qty) || 1)), 0), [awardExpenses]);

    const updateAwardExpense = (id, field, value) => {
        setFormData(prev => ({ ...prev, awardExpenses: (prev.awardExpenses || []).map(a => a.id === id ? { ...a, [field]: value } : a) }));
    };

    // --- Class Awards Budget ---
    const classes = useMemo(() => {
        const disciplines = formData.disciplines || [];
        const items = [];
        for (const disc of disciplines) {
            for (const divId of (disc.divisionOrder || [])) {
                const name = disc.divisionPrintTitles?.[divId] || divId.split('-').slice(1).join('-');
                items.push({ id: divId, name, disciplineName: disc.name });
            }
        }
        return items;
    }, [formData.disciplines]);

    const classAwards = formData.classAwards || {};

    const updateClassAward = (classId, field, value) => {
        setFormData(prev => ({
            ...prev,
            classAwards: {
                ...(prev.classAwards || {}),
                [classId]: {
                    ...(prev.classAwards?.[classId] || {}),
                    [field]: value,
                },
            },
        }));
    };

    const classAwardsTotal = useMemo(() => {
        return Object.values(classAwards).reduce((sum, a) => sum + (parseFloat(a.budget) || 0), 0);
    }, [classAwards]);

    // Grand total
    const { structuredTotal, structuredDonated } = useMemo(() => {
        const allPrizes = Object.values(structuredAwards).flat().flatMap(item => item.prizes || []);
        const total = allPrizes.reduce((sum, p) => sum + ((parseFloat(p.value) || 0) * (parseInt(p.qty) || 1)), 0);
        const donated = allPrizes.filter(p => p.source === 'donated').reduce((sum, p) => sum + ((parseFloat(p.value) || 0) * (parseInt(p.qty) || 1)), 0);
        return { structuredTotal: total, structuredDonated: donated };
    }, [structuredAwards]);

    const grandTotal = structuredTotal + totalAwardExpenses + classAwardsTotal;

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 5: Awards</CardTitle>
                <CardDescription>Define awards, budgets, and recognition for your show. Class awards can be auto-generated from your uploaded schedule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Structured Award Categories */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-lg">Awards & Recognition</h4>
                    {AWARD_CATEGORIES.map(cat => (
                        <AwardCategoryCard
                            key={cat.id}
                            category={cat}
                            awards={structuredAwards}
                            onUpdate={updateAwardItem}
                            onAddItem={addAwardItem}
                            onRemoveItem={removeAwardItem}
                            onAddPrize={addPrize}
                            onRemovePrize={removePrize}
                            onUpdatePrize={updatePrize}
                        />
                    ))}
                </div>

                {/* Award Expenses */}
                <div className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-semibold text-lg mb-1">Award Expenses</h4>
                    <p className="text-sm text-muted-foreground mb-3">Track bulk costs for trophies, ribbons, buckles, prize money, etc.</p>
                    <div className="space-y-2">
                        {awardExpenses.map(item => (
                            <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                <Input
                                    value={item.name}
                                    onChange={(e) => updateAwardExpense(item.id, 'name', e.target.value)}
                                    placeholder="e.g., Champion Buckles"
                                    className="flex-1 h-8 text-sm"
                                />
                                <Input
                                    type="number"
                                    value={item.amount}
                                    onChange={(e) => updateAwardExpense(item.id, 'amount', e.target.value)}
                                    placeholder="Cost ($)"
                                    className="w-28 h-8 text-sm"
                                />
                                <Input
                                    type="number"
                                    value={item.qty}
                                    onChange={(e) => updateAwardExpense(item.id, 'qty', e.target.value)}
                                    placeholder="Qty"
                                    className="w-16 h-8 text-sm"
                                />
                                <span className="text-sm font-medium w-24 text-right">${((parseFloat(item.amount) || 0) * (parseInt(item.qty) || 1)).toFixed(2)}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setFormData(prev => ({ ...prev, awardExpenses: prev.awardExpenses.filter(a => a.id !== item.id) }))}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={() => setFormData(prev => ({ ...prev, awardExpenses: [...(prev.awardExpenses || []), { id: uuidv4(), name: '', amount: '', qty: 1 }] }))}>
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Award Expense
                    </Button>
                    {totalAwardExpenses > 0 && (
                        <div className="mt-3 text-right">
                            <p className="text-sm font-semibold">Total Award Expenses: ${totalAwardExpenses.toFixed(2)}</p>
                        </div>
                    )}
                </div>

                {/* Class Awards Budget */}
                <div className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-semibold text-lg mb-1">Class Awards Budget</h4>
                    <p className="text-sm text-muted-foreground mb-3">Assign award types and budgets per class. Classes are pulled from your schedule.</p>
                    {classes.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left px-3 py-2 font-medium">Class</th>
                                        <th className="text-left px-3 py-2 font-medium">Discipline</th>
                                        <th className="text-left px-3 py-2 font-medium w-40">Award Type</th>
                                        <th className="text-right px-3 py-2 font-medium w-28">Budget</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classes.map(cls => (
                                        <tr key={cls.id} className="border-b last:border-0">
                                            <td className="px-3 py-2">{cls.name}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{cls.disciplineName}</td>
                                            <td className="px-3 py-2">
                                                <Select value={classAwards[cls.id]?.awardType || ''} onValueChange={(val) => updateClassAward(cls.id, 'awardType', val)}>
                                                    <SelectTrigger className="h-8"><SelectValue placeholder="Select..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {AWARD_TYPES.map(type => (
                                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input
                                                    type="number"
                                                    value={classAwards[cls.id]?.budget || ''}
                                                    onChange={(e) => updateClassAward(cls.id, 'budget', e.target.value)}
                                                    placeholder="$0"
                                                    className="h-8 text-right"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {classAwardsTotal > 0 && (
                                    <tfoot>
                                        <tr className="bg-muted/30 font-semibold">
                                            <td className="px-3 py-2" colSpan={3}>Total Class Awards Budget</td>
                                            <td className="px-3 py-2 text-right">${classAwardsTotal.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-6 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No classes found. Add disciplines and classes in earlier steps to budget awards per class.</p>
                        </div>
                    )}
                </div>

                {/* Grand Total */}
                {grandTotal > 0 && (
                    <div className="p-4 border rounded-lg bg-amber-500/5 border-amber-500/30">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-amber-700 dark:text-amber-400">Grand Total — All Awards</span>
                            <span className="text-lg font-bold text-amber-700 dark:text-amber-400">${grandTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {structuredTotal > 0 && <span>Recognition: ${structuredTotal.toFixed(2)}</span>}
                            {totalAwardExpenses > 0 && <span>Expenses: ${totalAwardExpenses.toFixed(2)}</span>}
                            {classAwardsTotal > 0 && <span>Class Awards: ${classAwardsTotal.toFixed(2)}</span>}
                            {structuredDonated > 0 && <span className="text-emerald-600">Donated: ${structuredDonated.toFixed(2)}</span>}
                        </div>
                    </div>
                )}

            </CardContent>
        </motion.div>
    );
};
