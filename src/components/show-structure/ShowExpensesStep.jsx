import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Download } from 'lucide-react';
import { exportShowBudgetToExcel } from '@/lib/showBudgetExport';
import { cn } from '@/lib/utils';
import { isBudgetFrozen } from '@/lib/contractUtils';
import { BudgetFrozenBanner } from '@/components/contract-management/BudgetFrozenBanner';

const timingBuckets = [
    {
        id: 'before_show',
        title: 'Before Show',
        description: 'Pre-show expenses: marketing, advertising, sanction fees, insurance, deposits',
        borderClass: 'border-l-4 border-blue-500',
        bgClass: 'bg-blue-500/5',
        textClass: 'text-blue-600 dark:text-blue-400',
        badgeClass: 'bg-blue-500/10 text-blue-600',
    },
    {
        id: 'during_show',
        title: 'During Show',
        description: 'On-site expenses: staff pay, judges, arena rental, equipment, catering',
        borderClass: 'border-l-4 border-amber-500',
        bgClass: 'bg-amber-500/5',
        textClass: 'text-amber-600 dark:text-amber-400',
        badgeClass: 'bg-amber-500/10 text-amber-600',
    },
    {
        id: 'after_show',
        title: 'After Show',
        description: 'Post-show expenses: cleanup, results publishing, final settlements',
        borderClass: 'border-l-4 border-purple-500',
        bgClass: 'bg-purple-500/5',
        textClass: 'text-purple-600 dark:text-purple-400',
        badgeClass: 'bg-purple-500/10 text-purple-600',
    },
];

const expenseCategories = [
    { id: 'facilities', title: 'Facilities' },
    { id: 'associations', title: 'Associations & Compliance' },
    { id: 'administrative', title: 'Administrative' },
    { id: 'operations', title: 'Operations' },
    { id: 'awards', title: 'Awards' },
    { id: 'officials_staff', title: 'Officials & Staff' },
    { id: 'marketing', title: 'Marketing' },
    { id: 'equipment', title: 'Equipment' },
    { id: 'hospitality', title: 'Hospitality' },
];

const feeTimingLabels = {
    pre_entry: 'Pre-Entry / Reservation',
    at_check_in: 'At Check-In',
    settlement: 'Post-Show / Settlement',
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

    const addExpense = (timingId) => {
        const newExpense = { id: uuidv4(), name: '', amount: '', category: '', timing: timingId, notes: '' };
        setFormData(prev => ({ ...prev, showExpenses: [...(prev.showExpenses || []), newExpense] }));
    };

    const updateExpense = (id, field, value) => {
        setFormData(prev => ({ ...prev, showExpenses: (prev.showExpenses || []).map(e => e.id === id ? { ...e, [field]: value } : e) }));
    };

    const removeExpense = (id) => {
        setFormData(prev => ({ ...prev, showExpenses: (prev.showExpenses || []).filter(e => e.id !== id) }));
    };

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 4: Show Expenses</CardTitle>
                <CardDescription>Track operational costs organized by when they occur — before, during, or after the show.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {locked && <BudgetFrozenBanner />}

                {timingBuckets.map(bucket => {
                    const bucketExpenses = expenses.filter(e => e.timing === bucket.id);
                    const bucketTotal = bucketExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

                    return (
                        <Card key={bucket.id} className={cn('overflow-hidden', bucket.borderClass)}>
                            <CardHeader className={bucket.bgClass}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CardTitle className={cn('text-lg', bucket.textClass)}>{bucket.title}</CardTitle>
                                        {bucketExpenses.length > 0 && (
                                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', bucket.badgeClass)}>
                                                {bucketExpenses.length} item{bucketExpenses.length !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    {bucketTotal > 0 && (
                                        <span className={cn('text-sm font-semibold', bucket.textClass)}>${bucketTotal.toFixed(2)}</span>
                                    )}
                                </div>
                                <CardDescription>{bucket.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-2">
                                    {bucketExpenses.map(expense => (
                                        <div key={expense.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                            <Input
                                                value={expense.name}
                                                onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                                                placeholder="Expense name"
                                                className="flex-1"
                                                disabled={locked}
                                            />
                                            <Input
                                                type="number"
                                                value={expense.amount}
                                                onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                                                placeholder="Amount ($)"
                                                className="w-32"
                                                disabled={locked}
                                            />
                                            <Select value={expense.category || ''} onValueChange={(val) => updateExpense(expense.id, 'category', val)} disabled={locked}>
                                                <SelectTrigger className="w-44"><SelectValue placeholder="Category..." /></SelectTrigger>
                                                <SelectContent>
                                                    {expenseCategories.map(cat => (
                                                        <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                value={expense.notes || ''}
                                                onChange={(e) => updateExpense(expense.id, 'notes', e.target.value)}
                                                placeholder="Notes"
                                                className="flex-1 hidden md:block"
                                                disabled={locked}
                                            />
                                            {!locked && (
                                                <Button variant="ghost" size="icon" className="flex-shrink-0 text-destructive hover:bg-destructive/10" onClick={() => removeExpense(expense.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => addExpense(bucket.id)} disabled={locked}>
                                    <PlusCircle className="h-4 w-4 mr-2" /> Add Expense
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}

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
                                    {timingBuckets.map(bucket => {
                                        const bucketExpenses = expenses.filter(e => e.timing === bucket.id && e.name && e.amount);
                                        if (bucketExpenses.length === 0) return null;
                                        const bucketTotal = bucketExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                                        return (
                                            <React.Fragment key={bucket.id}>
                                                <tr className={bucket.bgClass}>
                                                    <td className={cn('px-4 py-1.5 font-semibold text-xs uppercase', bucket.textClass)} colSpan={3}>{bucket.title}</td>
                                                </tr>
                                                {bucketExpenses.map(expense => (
                                                    <tr key={expense.id} className="border-b last:border-0">
                                                        <td className="px-4 py-2">{expense.name}</td>
                                                        <td className="px-4 py-2 text-muted-foreground">{expenseCategories.find(c => c.id === expense.category)?.title || ''}</td>
                                                        <td className="px-4 py-2 text-right font-medium">${parseFloat(expense.amount).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-red-500/5">
                                                    <td className="px-4 py-1.5 font-semibold text-xs" colSpan={2}>Subtotal {bucket.title}</td>
                                                    <td className="px-4 py-1.5 text-right font-semibold text-xs">${bucketTotal.toFixed(2)}</td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                    {totalShowExpenses > 0 && (
                                        <tr className="bg-red-500/5">
                                            <td className="px-4 py-2 font-semibold" colSpan={2}>Subtotal Show Expenses</td>
                                            <td className="px-4 py-2 text-right font-semibold">${totalShowExpenses.toFixed(2)}</td>
                                        </tr>
                                    )}
                                    {awardExpenses.filter(a => a.name && a.amount).map(award => (
                                        <tr key={award.id} className="border-b last:border-0">
                                            <td className="px-4 py-2">{award.name}</td>
                                            <td className="px-4 py-2 text-muted-foreground">Awards</td>
                                            <td className="px-4 py-2 text-right font-medium">${((parseFloat(award.amount) || 0) * (parseInt(award.qty) || 1)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {totalClassAwards > 0 && (
                                        <tr className="border-b last:border-0">
                                            <td className="px-4 py-2">Class Awards Budget</td>
                                            <td className="px-4 py-2 text-muted-foreground">Awards</td>
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
