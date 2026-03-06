import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';

const AWARD_TYPES = ['Trophy', 'Buckle', 'Ribbon', 'Plaque', 'Prize Money', 'Cooler', 'Blanket', 'Gift Card', 'Other'];

export const AwardsSponsorshipStep = ({ formData, setFormData }) => {
    const handleDetailChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            showDetails: {
                ...prev.showDetails,
                [section]: {
                    ...(prev.showDetails[section] || {}),
                    [field]: value
                }
            }
        }));
    };

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

    const renderTextarea = (section, field, label, placeholder) => (
        <div className="space-y-2">
            <Label htmlFor={`${section}-${field}`}>{label}</Label>
            <Textarea 
                id={`${section}-${field}`}
                value={formData.showDetails?.[section]?.[field] || ''} 
                onChange={e => handleDetailChange(section, field, e.target.value)} 
                placeholder={placeholder}
            />
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 6: Awards</CardTitle>
                <CardDescription>Define awards, budgets, and recognition for your show. Class awards can be auto-generated from your uploaded schedule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-semibold text-lg mb-3">Awards & Recognition</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderTextarea('awards', 'highPoint', 'High Point / All-Around Awards', 'Criteria, divisions, points system...')}
                        {renderTextarea('awards', 'circuitAwards', 'Circuit Awards', 'e.g., Must show to all judges in a class...')}
                        {renderTextarea('awards', 'specialAwards', 'Special Awards', 'Sponsor trophies, scholarships...')}
                        {renderTextarea('awards', 'nsbaPayouts', 'NSBA Payouts / Added Money', 'Jackpots, futurities, distribution rules...')}
                    </div>
                </div>

                <div className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-semibold text-lg mb-3">Award Expenses</h4>
                    <p className="text-sm text-muted-foreground mb-3">Track costs for trophies, ribbons, buckles, prize money, etc.</p>
                    <div className="space-y-2">
                        {(formData.awardExpenses || []).map(item => (
                            <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                <Input
                                    value={item.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, awardExpenses: prev.awardExpenses.map(a => a.id === item.id ? { ...a, name: e.target.value } : a) }))}
                                    placeholder="e.g., Champion Buckles"
                                    className="flex-1"
                                />
                                <Input
                                    type="number"
                                    value={item.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, awardExpenses: prev.awardExpenses.map(a => a.id === item.id ? { ...a, amount: e.target.value } : a) }))}
                                    placeholder="Cost ($)"
                                    className="w-32"
                                />
                                <Input
                                    type="number"
                                    value={item.qty}
                                    onChange={(e) => setFormData(prev => ({ ...prev, awardExpenses: prev.awardExpenses.map(a => a.id === item.id ? { ...a, qty: e.target.value } : a) }))}
                                    placeholder="Qty"
                                    className="w-20"
                                />
                                <span className="text-sm font-medium w-24 text-right">${((parseFloat(item.amount) || 0) * (parseInt(item.qty) || 1)).toFixed(2)}</span>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setFormData(prev => ({ ...prev, awardExpenses: prev.awardExpenses.filter(a => a.id !== item.id) }))}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setFormData(prev => ({ ...prev, awardExpenses: [...(prev.awardExpenses || []), { id: uuidv4(), name: '', amount: '', qty: 1 }] }))}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Award Expense
                    </Button>
                    {(formData.awardExpenses || []).length > 0 && (
                        <div className="mt-3 text-right">
                            <p className="text-sm font-semibold">Total Award Expenses: ${(formData.awardExpenses || []).reduce((sum, a) => sum + ((parseFloat(a.amount) || 0) * (parseInt(a.qty) || 1)), 0).toFixed(2)}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-semibold text-lg mb-3">Class Awards Budget</h4>
                    <p className="text-sm text-muted-foreground mb-3">Assign award types and budgets per class. Classes are pulled from your schedule.</p>
                    {classes.length > 0 ? (
                        <>
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
                        </>
                    ) : (
                        <div className="text-center py-6 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No classes found. Add disciplines and classes in earlier steps to budget awards per class.</p>
                        </div>
                    )}
                </div>

            </CardContent>
        </motion.div>
    );
};