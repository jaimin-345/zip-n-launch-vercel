import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, DollarSign, TrendingUp, TrendingDown, Hash,
    ChevronRight, FolderOpen, Calendar, Users, Building2,
    HeartHandshake, Banknote, PiggyBank, Target, Receipt,
    Trophy, Briefcase, BarChart3,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';
import { calculateProjections, DEFAULT_ASSUMPTIONS } from '@/lib/showFinancialProjections';
import { flattenPersonnel, calculateMemberFinancials } from '@/lib/contractUtils';

const currency = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? '$0' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
};

// ── KPI Card ──

const KpiCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => {
    const styles = {
        blue: { bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200', icon: 'text-blue-600', value: 'text-blue-700 dark:text-blue-300' },
        green: { bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200', icon: 'text-emerald-600', value: 'text-emerald-700 dark:text-emerald-300' },
        red: { bg: 'bg-red-50 dark:bg-red-950/20 border-red-200', icon: 'text-red-600', value: 'text-red-700 dark:text-red-300' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200', icon: 'text-amber-600', value: 'text-amber-700 dark:text-amber-300' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200', icon: 'text-purple-600', value: 'text-purple-700 dark:text-purple-300' },
    };
    const s = styles[color];
    return (
        <div className={cn('rounded-xl border p-4', s.bg)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                    <p className={cn('text-2xl font-bold mt-1', s.value)}>{value}</p>
                    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                </div>
                <Icon className={cn('h-5 w-5 mt-1', s.icon)} />
            </div>
        </div>
    );
};

// ── Budget Line Item ──

const BudgetLine = ({ label, amount, indent = false, bold = false, color }) => (
    <div className={cn('flex items-center justify-between py-1.5 text-sm', indent && 'pl-6', bold && 'font-semibold border-t pt-2 mt-1')}>
        <span className={cn(bold ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
        <span className={cn(bold ? 'text-foreground' : '', color)}>{currency(amount)}</span>
    </div>
);

// ── Progress Bar ──

const BudgetBar = ({ label, amount, total, color = 'bg-blue-500' }) => {
    const pct = total > 0 ? Math.min((amount / total) * 100, 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{currency(amount)} ({pct.toFixed(1)}%)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

// ── Show Picker ──

const ShowPicker = ({ shows, onSelect }) => {
    const navigate = useNavigate();
    if (shows.length === 0) {
        return (
            <Card>
                <CardContent className="py-16 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Shows Found</h3>
                    <p className="text-sm text-muted-foreground mb-6">Create a horse show first to use the budgeting tool.</p>
                    <Button onClick={() => navigate('/horse-show-manager/create-show')}>Create Horse Show</Button>
                </CardContent>
            </Card>
        );
    }
    return (
        <div className="space-y-3">
            {shows.map((show, i) => {
                const pd = show.project_data || {};
                return (
                    <motion.div key={show.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <button type="button" className="w-full text-left" onClick={() => onSelect(show)}>
                            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                                <CardContent className="py-4 px-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-base truncate">{show.project_name || 'Untitled'}</h3>
                                                {pd.showNumber && <Badge variant="secondary" className="text-xs"><Hash className="h-3 w-3 mr-0.5" />#{pd.showNumber}</Badge>}
                                                <Badge variant="outline" className={cn('text-xs', show.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300')}>{show.status || 'draft'}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                {pd.startDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{pd.startDate}</span>}
                                                <span>{(pd.fees || []).length} fees</span>
                                                <span>{(pd.sponsors || []).length} sponsors</span>
                                                <span>{(pd.showExpenses || []).length} expenses</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground ml-4" />
                                    </div>
                                </CardContent>
                            </Card>
                        </button>
                    </motion.div>
                );
            })}
        </div>
    );
};

// ── Budget Dashboard ──

const BudgetDashboard = ({ show, contractProject }) => {
    const pd = show.project_data || {};
    const cpd = contractProject?.project_data || {};

    const [assumptions, setAssumptions] = useState({ ...DEFAULT_ASSUMPTIONS });
    const updateAssumption = (key, val) => setAssumptions(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));

    // Financial projections from show data
    const projections = useMemo(() => calculateProjections(pd, assumptions), [pd, assumptions]);

    // Employee costs from contract management
    const employeeCosts = useMemo(() => {
        const personnel = flattenPersonnel(cpd);
        let totalDayPay = 0;
        let totalExpenses = 0;
        let totalCompensation = 0;
        const byRole = {};

        for (const member of personnel) {
            const fin = calculateMemberFinancials(member);
            totalDayPay += fin.totalDayFee;
            totalExpenses += fin.totalExpenses;
            totalCompensation += fin.totalCompensation;

            const role = member.roleName || 'Other';
            if (!byRole[role]) byRole[role] = { count: 0, total: 0 };
            byRole[role].count += 1;
            byRole[role].total += fin.totalCompensation;
        }

        return { personnelCount: personnel.length, totalDayPay, totalExpenses, totalCompensation, byRole, personnel };
    }, [cpd]);

    // Combined totals
    const totalRevenue = projections.revenue.total;
    const showExpenses = projections.costs.subtotal;
    const employeeTotal = employeeCosts.totalCompensation;
    const totalExpenses = showExpenses + employeeTotal;
    const contingency = totalExpenses * (assumptions.expenseContingency || 0.05);
    const totalWithContingency = totalExpenses + contingency;
    const netProfit = totalRevenue - totalWithContingency;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;

    // Revenue breakdown
    const feeRevenue = projections.revenue.fees.total;
    const sponsorRevenue = projections.revenue.sponsors.projected;

    // Stall income (extract from fee breakdown)
    const stallIncome = projections.revenue.fees.breakdown
        .filter(f => (f.name || '').toLowerCase().includes('stall'))
        .reduce((sum, f) => sum + f.revenue, 0);

    // Entry fee income
    const entryFeeIncome = projections.revenue.fees.breakdown
        .filter(f => f.timing === 'settlement')
        .reduce((sum, f) => sum + f.revenue, 0);

    // Other fee income
    const otherFeeIncome = feeRevenue - stallIncome - entryFeeIncome;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{show.project_name}</h2>
                {pd.showNumber && <Badge variant="secondary"><Hash className="h-3 w-3 mr-0.5" />#{pd.showNumber}</Badge>}
                {!contractProject && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">No contract data linked</Badge>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard title="Total Revenue" value={currency(totalRevenue)} subtitle={`${(pd.fees || []).length} fee types`} icon={TrendingUp} color="green" />
                <KpiCard title="Total Expenses" value={currency(totalWithContingency)} subtitle={`Incl. ${(assumptions.expenseContingency * 100).toFixed(0)}% contingency`} icon={TrendingDown} color="red" />
                <KpiCard title="Net Profit" value={currency(netProfit)} subtitle={`${profitMargin.toFixed(1)}% margin`} icon={netProfit >= 0 ? PiggyBank : TrendingDown} color={netProfit >= 0 ? 'blue' : 'red'} />
                <KpiCard title="Employee Costs" value={currency(employeeTotal)} subtitle={`${employeeCosts.personnelCount} personnel`} icon={Users} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column: Revenue + Expenses */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Revenue Breakdown */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Revenue Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <BudgetBar label="Entry Fees (Settlement)" amount={entryFeeIncome} total={totalRevenue} color="bg-emerald-500" />
                                <BudgetBar label="Stall Income" amount={stallIncome} total={totalRevenue} color="bg-blue-500" />
                                <BudgetBar label="Other Fees" amount={otherFeeIncome} total={totalRevenue} color="bg-sky-400" />
                                <BudgetBar label="Sponsor Income" amount={sponsorRevenue} total={totalRevenue} color="bg-amber-500" />
                            </div>
                            <Accordion type="single" collapsible>
                                <AccordionItem value="fee-detail">
                                    <AccordionTrigger className="text-sm hover:no-underline">Fee Detail ({projections.revenue.fees.breakdown.length} items)</AccordionTrigger>
                                    <AccordionContent>
                                        {projections.revenue.fees.breakdown.map(f => (
                                            <BudgetLine key={f.id} label={f.label} amount={f.revenue} indent />
                                        ))}
                                        <BudgetLine label="Total Fee Revenue" amount={feeRevenue} bold />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="sponsor-detail">
                                    <AccordionTrigger className="text-sm hover:no-underline">Sponsor Detail ({projections.revenue.sponsors.breakdown.length} levels)</AccordionTrigger>
                                    <AccordionContent>
                                        {projections.revenue.sponsors.breakdown.map(s => (
                                            <BudgetLine key={s.levelId} label={`${s.levelName} (${s.sponsorCount} sponsors)`} amount={s.projected} indent />
                                        ))}
                                        <BudgetLine label="Pledged" amount={projections.revenue.sponsors.pledged} indent />
                                        <BudgetLine label="Projected (after collection rate)" amount={sponsorRevenue} bold />
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            <BudgetLine label="TOTAL REVENUE" amount={totalRevenue} bold color="text-emerald-600" />
                        </CardContent>
                    </Card>

                    {/* Expense Breakdown */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600" /> Expense Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <BudgetBar label="Show Expenses" amount={projections.costs.expenses.total} total={totalWithContingency} color="bg-red-500" />
                                <BudgetBar label="Award Expenses" amount={projections.costs.awards.total} total={totalWithContingency} color="bg-orange-500" />
                                <BudgetBar label="Employee Costs" amount={employeeTotal} total={totalWithContingency} color="bg-purple-500" />
                                <BudgetBar label="Contingency" amount={contingency} total={totalWithContingency} color="bg-gray-400" />
                            </div>

                            <Accordion type="single" collapsible>
                                <AccordionItem value="show-expenses">
                                    <AccordionTrigger className="text-sm hover:no-underline">Show Expenses by Category ({projections.costs.expenses.breakdown.length})</AccordionTrigger>
                                    <AccordionContent>
                                        {projections.costs.expenses.breakdown.map(cat => (
                                            <BudgetLine key={cat.category} label={`${cat.category} (${cat.itemCount} items)`} amount={cat.total} indent />
                                        ))}
                                        <BudgetLine label="Total Show Expenses" amount={projections.costs.expenses.total} bold />
                                    </AccordionContent>
                                </AccordionItem>
                                {projections.costs.awards.breakdown.length > 0 && (
                                    <AccordionItem value="award-expenses">
                                        <AccordionTrigger className="text-sm hover:no-underline">Award Expenses ({projections.costs.awards.breakdown.length})</AccordionTrigger>
                                        <AccordionContent>
                                            {projections.costs.awards.breakdown.map(a => (
                                                <BudgetLine key={a.name} label={`${a.name} x${a.qty}`} amount={a.cost} indent />
                                            ))}
                                            <BudgetLine label="Total Award Expenses" amount={projections.costs.awards.total} bold />
                                        </AccordionContent>
                                    </AccordionItem>
                                )}
                                {employeeCosts.personnelCount > 0 && (
                                    <AccordionItem value="employee-costs">
                                        <AccordionTrigger className="text-sm hover:no-underline">Employee Costs ({employeeCosts.personnelCount} personnel)</AccordionTrigger>
                                        <AccordionContent>
                                            {Object.entries(employeeCosts.byRole).map(([role, data]) => (
                                                <BudgetLine key={role} label={`${role} (${data.count})`} amount={data.total} indent />
                                            ))}
                                            <BudgetLine label="Day Pay Subtotal" amount={employeeCosts.totalDayPay} indent />
                                            <BudgetLine label="Travel & Expenses" amount={employeeCosts.totalExpenses} indent />
                                            <BudgetLine label="Total Employee Costs" amount={employeeTotal} bold />
                                        </AccordionContent>
                                    </AccordionItem>
                                )}
                            </Accordion>
                            <BudgetLine label="TOTAL EXPENSES (with contingency)" amount={totalWithContingency} bold color="text-red-600" />
                        </CardContent>
                    </Card>

                    {/* P&L Summary */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600" /> Profit & Loss Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                <BudgetLine label="Total Revenue" amount={totalRevenue} color="text-emerald-600" />
                                <BudgetLine label="Show Expenses" amount={-projections.costs.subtotal} indent />
                                <BudgetLine label="Employee Costs" amount={-employeeTotal} indent />
                                <BudgetLine label="Contingency" amount={-contingency} indent />
                                <BudgetLine label="NET PROFIT" amount={netProfit} bold color={netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} />
                            </div>

                            {/* Visual profit bar */}
                            <div className="mt-4 pt-4 border-t">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                    <span>Revenue vs Expenses</span>
                                </div>
                                <div className="flex h-8 rounded-lg overflow-hidden border">
                                    <div className="bg-emerald-500 flex items-center justify-center text-[10px] text-white font-medium" style={{ width: `${totalRevenue > 0 ? Math.min((totalRevenue / Math.max(totalRevenue, totalWithContingency)) * 100, 100) : 0}%` }}>
                                        Revenue
                                    </div>
                                    <div className="bg-red-400 flex items-center justify-center text-[10px] text-white font-medium" style={{ width: `${totalWithContingency > 0 ? Math.min((totalWithContingency / Math.max(totalRevenue, totalWithContingency)) * 100, 100) : 0}%` }}>
                                        Expenses
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right column: Assumptions + Quick Stats */}
                <div className="space-y-6">
                    {/* Assumptions */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Budget Assumptions</CardTitle>
                            <CardDescription className="text-xs">Adjust to match your expected attendance.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                { key: 'expectedHorses', label: 'Expected Horses' },
                                { key: 'avgClassesPerHorse', label: 'Avg Classes/Horse' },
                                { key: 'expectedStalls', label: 'Available Stalls' },
                                { key: 'stallOccupancyRate', label: 'Stall Occupancy %', pct: true },
                                { key: 'haulInPercentage', label: 'Haul-In %', pct: true },
                                { key: 'rvSpots', label: 'RV Spots' },
                                { key: 'showDays', label: 'Show Days' },
                                { key: 'judgeCount', label: 'Judge Count' },
                                { key: 'sponsorCollectionRate', label: 'Sponsor Collection %', pct: true },
                                { key: 'expenseContingency', label: 'Contingency %', pct: true },
                            ].map(({ key, label, pct }) => (
                                <div key={key} className="space-y-1">
                                    <Label className="text-xs">{label}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            value={pct ? (assumptions[key] * 100) : assumptions[key]}
                                            onChange={(e) => updateAssumption(key, pct ? parseFloat(e.target.value) / 100 : e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                        {pct && <span className="text-xs text-muted-foreground">%</span>}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Revenue by Category */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><Banknote className="h-4 w-4 text-emerald-600" /> Revenue Sources</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5 text-emerald-500" /> Entry Fees</span>
                                <span className="font-medium">{currency(entryFeeIncome)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-blue-500" /> Stall Income</span>
                                <span className="font-medium">{currency(stallIncome)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-sky-500" /> Other Fees</span>
                                <span className="font-medium">{currency(otherFeeIncome)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-1.5"><HeartHandshake className="h-3.5 w-3.5 text-amber-500" /> Sponsors</span>
                                <span className="font-medium">{currency(sponsorRevenue)}</span>
                            </div>
                            <div className="border-t pt-2 mt-2 flex justify-between text-sm font-semibold">
                                <span>Total</span>
                                <span className="text-emerald-600">{currency(totalRevenue)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Break-Even */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-amber-600" /> Break-Even Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                const revenuePerHorse = assumptions.expectedHorses > 0 ? feeRevenue / assumptions.expectedHorses : 0;
                                const breakEvenHorses = revenuePerHorse > 0 ? Math.ceil(totalWithContingency / revenuePerHorse) : 0;
                                const surplus = assumptions.expectedHorses - breakEvenHorses;
                                return (
                                    <div className="space-y-3">
                                        <div className="text-center">
                                            <p className="text-3xl font-bold">{breakEvenHorses}</p>
                                            <p className="text-xs text-muted-foreground">horses needed to break even</p>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Expected horses</span>
                                            <span>{assumptions.expectedHorses}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Revenue/horse</span>
                                            <span>{currency(revenuePerHorse)}</span>
                                        </div>
                                        <div className={cn('flex justify-between text-sm font-semibold', surplus >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                                            <span>Buffer</span>
                                            <span>{surplus >= 0 ? '+' : ''}{surplus} horses</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>

                    {/* Data Completeness */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Data Completeness</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {[
                                { label: 'Fees configured', ok: (pd.fees || []).length > 0 },
                                { label: 'Sponsors added', ok: (pd.sponsors || []).length > 0 },
                                { label: 'Show expenses entered', ok: (pd.showExpenses || []).length > 0 },
                                { label: 'Award expenses entered', ok: (pd.awardExpenses || []).length > 0 },
                                { label: 'Employee contracts linked', ok: employeeCosts.personnelCount > 0 },
                            ].map(item => (
                                <div key={item.label} className="flex items-center gap-2 text-sm">
                                    <div className={cn('h-2.5 w-2.5 rounded-full', item.ok ? 'bg-emerald-500' : 'bg-gray-300')} />
                                    <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// ── Main Page ──

const EmployeeBudgetingToolPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [shows, setShows] = useState([]);
    const [contractProjects, setContractProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedShow, setSelectedShow] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) { setIsLoading(false); return; }
            const [showsRes, contractsRes] = await Promise.all([
                supabase.from('projects').select('id, project_name, project_data, status, created_at')
                    .eq('project_type', 'show').eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('projects').select('id, project_name, project_data, status')
                    .eq('project_type', 'contract').eq('user_id', user.id),
            ]);
            if (showsRes.data) setShows(showsRes.data);
            if (contractsRes.data) setContractProjects(contractsRes.data);
            setIsLoading(false);
        };
        fetchData();
    }, [user]);

    // Find linked contract project for selected show
    const linkedContract = useMemo(() => {
        if (!selectedShow) return null;
        return contractProjects.find(cp => cp.project_data?.linkedProjectId === selectedShow.id) || null;
    }, [selectedShow, contractProjects]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <Helmet><title>Employee Budgeting Tool</title></Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center gap-3 mb-8">
                        {selectedShow ? (
                            <Button variant="outline" size="icon" onClick={() => setSelectedShow(null)}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button variant="outline" size="icon" onClick={() => navigate('/horse-show-manager')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <DollarSign className="h-6 w-6 text-primary" />
                                Employee Budgeting Tool
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {selectedShow ? 'Revenue forecast, expense tracking, and profit analysis.' : 'Select a show to view its budget.'}
                            </p>
                        </div>
                    </div>

                    {selectedShow ? (
                        <BudgetDashboard show={selectedShow} contractProject={linkedContract} />
                    ) : (
                        <ShowPicker shows={shows} onSelect={setSelectedShow} />
                    )}
                </main>
            </div>
        </>
    );
};

export default EmployeeBudgetingToolPage;
