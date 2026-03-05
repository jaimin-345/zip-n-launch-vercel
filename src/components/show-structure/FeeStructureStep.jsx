import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Calendar, Layers, Banknote, GripVertical, BadgeCent, Building2, Shield, ClipboardList, Settings, Trophy, Users, Megaphone, Wrench, UtensilsCrossed, Download, TrendingUp, TrendingDown, HeartHandshake } from 'lucide-react';
import { exportShowBudgetToExcel } from '@/lib/showBudgetExport';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

const standardFees = [
    { standard_id: 'stall_fee', name: 'Stall Fee', type: 'ancillary', amount: 295, payment_timing: 'pre_entry', tier: 1, is_standard: true, notes: 'Non-refundable, paid up front' },
    { standard_id: 'class_entry_fee', name: 'Class Entry Fee', type: 'per_class', amount: 20, payment_timing: 'settlement', tier: 1, is_standard: true, notes: 'Pay-to-play cost, multiplied by judges' },
    { standard_id: 'office_fee', name: 'Office / Processing Fee', type: 'per_horse', amount: 50, payment_timing: 'at_check_in', tier: 1, is_standard: true, notes: 'Per horse, non-refundable' },
    { standard_id: 'aqha_admin_fee', name: 'AQHA Admin Fee', type: 'per_horse', amount: 10, association_specific: 'AQHA', payment_timing: 'at_check_in', tier: 1, is_standard: true },
    { standard_id: 'apha_admin_fee', name: 'APHA Admin Fee', type: 'per_class', amount: 3, association_specific: 'APHA', payment_timing: 'at_check_in', tier: 1, is_standard: true },
    { standard_id: 'nsba_admin_fee', name: 'NSBA Admin Fee', type: 'per_class', amount: 5, association_specific: 'NSBA', payment_timing: 'at_check_in', tier: 1, is_standard: true, notes: 'Per class entry' },
    { standard_id: 'haul_in_fee', name: 'Grounds / Haul-In Fee', type: 'per_horse', amount: 25, payment_timing: 'at_check_in', tier: 2, is_standard: true, notes: 'Per day, if not stalling' },
    { standard_id: 'rv_fee', name: 'RV / Camping Fee', type: 'ancillary', amount: 45, payment_timing: 'pre_entry', tier: 2, is_standard: true, notes: 'Per night' },
    { standard_id: 'shavings_fee', name: 'Shavings / Bedding', type: 'ancillary', amount: 12, payment_timing: 'pre_entry', tier: 2, is_standard: true, notes: 'Per bag' },
    { standard_id: 'trail_equip_fee', name: 'Trail Equipment Fee', type: 'ancillary', amount: 25, payment_timing: 'settlement', tier: 3, is_standard: true, notes: 'Per horse, for Trail/Ranch Trail' },
    { standard_id: 'cattle_fee', name: 'Cattle Fee', type: 'per_class', amount: 100, payment_timing: 'settlement', tier: 3, is_standard: true, notes: 'Per run, non-refundable' },
    { standard_id: 'late_entry_fee', name: 'Post-Entry / Late Fee', type: 'flat', amount: 25, payment_timing: 'at_check_in', tier: 4, is_standard: true, notes: 'If after pre-entry deadline' },
    { standard_id: 'scratch_fee', name: 'Change / Scratch Fee', type: 'flat', amount: 10, payment_timing: 'settlement', tier: 4, is_standard: true, notes: 'Applied after cutoff' },
    { standard_id: 'nsf_fee', name: 'Returned Check / NSF Fee', type: 'flat', amount: 50, payment_timing: 'settlement', tier: 4, is_standard: true },
];

const timingCategories = [
    { id: 'pre_entry', title: 'Pre-Entry / Reservation', description: 'Fees due before the show (e.g., stalls, RVs).' },
    { id: 'at_check_in', title: 'At Check-In', description: 'Fees paid upon arrival (e.g., office, haul-in).' },
    { id: 'settlement', title: 'Post-Show / Settlement', description: 'Fees on the final bill (e.g., class entries).' },
];

const EditableFeeItem = ({ fee, onUpdate, onRemove, associations, allAssociationsData }) => {
    const getAssociationName = (id) => allAssociationsData.find(a => a.id === id)?.name || id;

    return (
        <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-background/50 rounded-b-lg">
            <div className="space-y-1.5 md:col-span-3">
                <Label>Fee Name</Label>
                <Input value={fee.name} onChange={(e) => onUpdate(fee.id, 'name', e.target.value)} placeholder="e.g., Office Fee" disabled={fee.is_standard}/>
            </div>
            <div className="space-y-1.5">
                <Label>Amount ($)</Label>
                <Input type="number" value={fee.amount} onChange={(e) => onUpdate(fee.id, 'amount', e.target.value)} placeholder="e.g., 50.00" />
            </div>
            <div className="space-y-1.5">
                <Label>Payment Timing</Label>
                <Select value={fee.payment_timing} onValueChange={(value) => onUpdate(fee.id, 'payment_timing', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {timingCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label>Association</Label>
                <Select value={fee.association_specific || 'all'} onValueChange={(value) => onUpdate(fee.id, 'association_specific', value === 'all' ? null : value)}>
                    <SelectTrigger><SelectValue placeholder="Applies to..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Associations</SelectItem>
                        {associations.map(assocId => (
                            <SelectItem key={assocId} value={assocId}>{getAssociationName(assocId)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !fee.due_date && "text-muted-foreground")}
                        >
                            <Calendar className="mr-2 h-4 w-4" />
                            {fee.due_date ? format(new Date(fee.due_date), "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <CalendarComponent mode="single" selected={fee.due_date ? new Date(fee.due_date) : null} onSelect={(date) => onUpdate(fee.id, 'due_date', date?.toISOString().split('T')[0])} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-1.5">
                <Label>Late Fee ($)</Label>
                <Input type="number" value={fee.late_fee_amount || ''} onChange={(e) => onUpdate(fee.id, 'late_fee_amount', e.target.value)} placeholder="e.g., 25.00" />
            </div>
             <div className="space-y-1.5 flex items-center pt-6">
                <Checkbox id={`per-judge-${fee.id}`} checked={fee.apply_per_judge} onCheckedChange={(checked) => onUpdate(fee.id, 'apply_per_judge', checked)} />
                <Label htmlFor={`per-judge-${fee.id}`} className="text-sm font-normal cursor-pointer ml-2">Apply per judge?</Label>
            </div>
            <div className="md:col-span-3 space-y-1.5">
                <Label>Notes</Label>
                <Input value={fee.notes || ''} onChange={(e) => onUpdate(fee.id, 'notes', e.target.value)} placeholder="Optional notes (e.g., per day, includes 2 bags shavings)" />
            </div>
        </div>
    );
};

const SortableFeeItem = ({ fee, onUpdate, onRemove, associations, allAssociationsData }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: fee.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Accordion type="single" collapsible className="w-full bg-card border rounded-lg shadow-sm overflow-hidden">
                <AccordionItem value={fee.id} className="border-none">
                    <div className="flex items-center px-4 py-2">
                         <div {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground p-2">
                            <GripVertical className="h-5 w-5" />
                        </div>
                        <AccordionTrigger className="flex-grow text-left hover:no-underline py-0">
                            <div className="flex items-center justify-between w-full">
                                <span className="font-semibold">{fee.name}</span>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>${fee.amount || '0.00'}</span>
                                    {fee.apply_per_judge && <BadgeCent className="h-4 w-4 text-primary" />}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="ml-2 flex-shrink-0 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {fee.is_standard 
                                            ? `This will remove the "${fee.name}" fee and return it to the Fee Catalog.`
                                            : `This will permanently delete the custom fee "${fee.name}". This action cannot be undone.`
                                        }
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onRemove(fee.id)} className={cn(!fee.is_standard && "bg-destructive hover:bg-destructive/90 text-destructive-foreground")}>Yes, Remove</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <AccordionContent className="p-0">
                         <EditableFeeItem fee={fee} onUpdate={onUpdate} onRemove={onRemove} associations={associations} allAssociationsData={allAssociationsData} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};

const expenseCategories = [
    { id: 'facilities', title: 'Facilities', icon: Building2, examples: 'Arena rental, stall rental, RV hookups, grounds security' },
    { id: 'associations', title: 'Associations & Compliance', icon: Shield, examples: 'Sanction fees, insurance, permits, drug testing' },
    { id: 'administrative', title: 'Administrative', icon: ClipboardList, examples: 'Office supplies, printing, software, postage' },
    { id: 'operations', title: 'Operations', icon: Settings, examples: 'Sound system, timing equipment, cattle, course setup' },
    { id: 'awards', title: 'Awards', icon: Trophy, examples: 'Trophies, buckles, ribbons, prize money' },
    { id: 'officials_staff', title: 'Officials & Staff', icon: Users, examples: 'Judge fees, steward fees, ring crew, announcer' },
    { id: 'marketing', title: 'Marketing', icon: Megaphone, examples: 'Advertising, signage, photography, social media' },
    { id: 'equipment', title: 'Equipment', icon: Wrench, examples: 'Trail obstacles, cones, poles, arena footing' },
    { id: 'hospitality', title: 'Hospitality', icon: UtensilsCrossed, examples: 'Catering, judges meals, water, exhibitor reception' },
];

export const FeeStructureStep = ({ formData, setFormData }) => {
    const { fees = [], associations = {} } = formData;
    const selectedAssociations = Object.keys(associations).filter(id => associations[id]);
    const { toast } = useToast();
    const [allAssociationsData, setAllAssociationsData] = useState([]);

    useEffect(() => {
        const fetchAssociations = async () => {
            const { data, error } = await supabase.from('associations').select('*');
            if (error) {
                toast({ title: 'Error fetching associations', description: error.message, variant: 'destructive' });
            } else {
                setAllAssociationsData(data);
            }
        };
        fetchAssociations();
    }, [toast]);

    useEffect(() => {
        setFormData(prev => {
            const currentFees = prev.fees || [];
            const currentStandardIds = new Set(currentFees.map(f => f.standard_id).filter(Boolean));
            const assocFees = standardFees.filter(sf =>
                sf.association_specific &&
                selectedAssociations.includes(sf.association_specific) &&
                !currentStandardIds.has(sf.standard_id)
            );
            if (assocFees.length === 0) return prev;
            return {
                ...prev,
                fees: [...currentFees, ...assocFees.map(f => ({ ...f, id: uuidv4() }))],
            };
        });
    }, [selectedAssociations]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeFeeIds = useMemo(() => new Set(fees.map(f => f.standard_id)), [fees]);
    
    const availableStandardFees = useMemo(() => {
        return standardFees.filter(sf => {
            if (activeFeeIds.has(sf.standard_id)) {
                return false;
            }
            if (sf.association_specific) {
                return selectedAssociations.includes(sf.association_specific);
            }
            return true;
        });
    }, [activeFeeIds, selectedAssociations]);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const updateFee = (id, field, value) => {
        setFormData(prev => ({ ...prev, fees: prev.fees.map(f => f.id === id ? { ...f, [field]: value } : f) }));
    };

    const removeFee = (id) => {
        setFormData(prev => ({ ...prev, fees: prev.fees.filter(f => f.id !== id) }));
    };

    const addFee = (feeData, isCustom = false) => {
        const newFee = { ...feeData, id: uuidv4(), is_standard: !isCustom };
        setFormData(prev => ({ ...prev, fees: [...(prev.fees || []), newFee] }));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeFee = fees.find(f => f.id === active.id);
        const overContainerId = over.id.startsWith('droppable-') ? over.id.replace('droppable-', '') : null;

        if (overContainerId && activeFee.payment_timing !== overContainerId) {
            setFormData(prev => ({
                ...prev,
                fees: prev.fees.map(f => f.id === active.id ? { ...f, payment_timing: overContainerId } : f),
            }));
        } else if (active.id !== over.id) {
            setFormData(prev => {
                const oldIndex = prev.fees.findIndex(f => f.id === active.id);
                const newIndex = prev.fees.findIndex(f => f.id === over.id);
                if (oldIndex === -1 || newIndex === -1) return prev;
                return { ...prev, fees: arrayMove(prev.fees, oldIndex, newIndex) };
            });
        }
    };

    const sponsorshipRevenue = formData.sponsorshipRevenue || [];

    const addSponsorshipItem = () => {
        setFormData(prev => ({
            ...prev,
            sponsorshipRevenue: [...(prev.sponsorshipRevenue || []), { id: uuidv4(), name: '', amount: '', notes: '' }],
        }));
    };

    const updateSponsorshipItem = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            sponsorshipRevenue: (prev.sponsorshipRevenue || []).map(item => item.id === id ? { ...item, [field]: value } : item),
        }));
    };

    const removeSponsorshipItem = (id) => {
        setFormData(prev => ({
            ...prev,
            sponsorshipRevenue: (prev.sponsorshipRevenue || []).filter(item => item.id !== id),
        }));
    };

    const handleDetailChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            showDetails: {
                ...prev.showDetails,
                [section]: {
                    ...(prev.showDetails?.[section] || {}),
                    [field]: value
                }
            }
        }));
    };

    const totalFeeRevenue = useMemo(() => fees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0), [fees]);
    const totalSponsorshipRevenue = useMemo(() => sponsorshipRevenue.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0), [sponsorshipRevenue]);
    const totalRevenue = totalFeeRevenue + totalSponsorshipRevenue;

    const expenses = formData.showExpenses || [];
    const awardExpenses = formData.awardExpenses || [];
    const classAwards = formData.classAwards || {};

    const totalShowExpenses = useMemo(() => expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0), [expenses]);
    const totalAwardExpenses = useMemo(() => awardExpenses.reduce((sum, a) => sum + ((parseFloat(a.amount) || 0) * (parseInt(a.qty) || 1)), 0), [awardExpenses]);
    const totalClassAwards = useMemo(() => Object.values(classAwards).reduce((sum, a) => sum + (parseFloat(a.budget) || 0), 0), [classAwards]);
    const totalExpenses = totalShowExpenses + totalAwardExpenses + totalClassAwards;

    const addExpense = (categoryId) => {
        const newExpense = { id: uuidv4(), name: '', amount: '', category: categoryId, timing: 'before_show', notes: '' };
        setFormData(prev => ({ ...prev, showExpenses: [...(prev.showExpenses || []), newExpense] }));
    };

    const updateExpense = (id, field, value) => {
        setFormData(prev => ({ ...prev, showExpenses: (prev.showExpenses || []).map(e => e.id === id ? { ...e, [field]: value } : e) }));
    };

    const removeExpense = (id) => {
        setFormData(prev => ({ ...prev, showExpenses: (prev.showExpenses || []).filter(e => e.id !== id) }));
    };

    const netProfitLoss = totalRevenue - totalExpenses;

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 4: Revenue & Expenses</CardTitle>
                <CardDescription>Define your show's income sources and operational costs to build a complete budget.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

                {/* ========== SECTION A: REVENUE ========== */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-500/5">
                        <TrendingUp className="h-6 w-6 text-emerald-600" />
                        <div>
                            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">A. Revenue (Money Coming In)</h3>
                            <p className="text-sm text-muted-foreground">Entry fees, stall fees, association fees, and sponsorship income.</p>
                        </div>
                    </div>

                    <Card className="bg-background/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Layers className="h-6 w-6 text-emerald-600"/> Fee Catalog</CardTitle>
                            <CardDescription>Add standard industry fees to your show bill or create a new custom fee.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                {availableStandardFees.length > 0 ? (
                                    availableStandardFees.map(fee => (
                                        <div key={fee.standard_id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-secondary/20">
                                            <div>
                                                <p className="font-semibold">{fee.name}</p>
                                                <p className="text-sm text-muted-foreground">{fee.notes}</p>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => addFee(fee)}>
                                                <PlusCircle className="h-4 w-4 mr-2" /> Add
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-muted-foreground py-4">All relevant standard fees have been added, or no associations selected.</p>
                                )}
                            </div>
                            <Button onClick={() => addFee({ name: 'Custom Fee', type: 'flat', amount: '', payment_timing: 'settlement' }, true)} variant="secondary" className="w-full">
                                <PlusCircle className="h-4 w-4 mr-2" /> Add a Completely Custom Fee
                            </Button>
                        </CardContent>
                    </Card>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {timingCategories.map(category => (
                                <FeeCategory
                                    key={category.id}
                                    id={category.id}
                                    title={category.title}
                                    description={category.description}
                                    fees={fees.filter(f => f.payment_timing === category.id)}
                                    onUpdate={updateFee}
                                    onRemove={removeFee}
                                    associations={selectedAssociations}
                                    allAssociationsData={allAssociationsData}
                                />
                            ))}
                        </div>
                    </DndContext>

                    <Card className="bg-background/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><HeartHandshake className="h-6 w-6 text-emerald-600"/> Sponsorship Revenue</CardTitle>
                            <CardDescription>Track income from sponsors, exhibitors, and other revenue sources.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {sponsorshipRevenue.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => updateSponsorshipItem(item.id, 'name', e.target.value)}
                                            placeholder="Sponsor name"
                                            className="flex-1"
                                        />
                                        <Input
                                            type="number"
                                            value={item.amount}
                                            onChange={(e) => updateSponsorshipItem(item.id, 'amount', e.target.value)}
                                            placeholder="Amount ($)"
                                            className="w-32"
                                        />
                                        <Input
                                            value={item.notes || ''}
                                            onChange={(e) => updateSponsorshipItem(item.id, 'notes', e.target.value)}
                                            placeholder="Notes"
                                            className="flex-1 hidden md:block"
                                        />
                                        <Button variant="ghost" size="icon" className="flex-shrink-0 text-destructive hover:bg-destructive/10" onClick={() => removeSponsorshipItem(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" size="sm" className="w-full mt-3" onClick={addSponsorshipItem}>
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Sponsorship Item
                            </Button>
                            {totalSponsorshipRevenue > 0 && (
                                <div className="mt-3 text-right">
                                    <p className="text-sm font-semibold text-emerald-600">Total Sponsorship Revenue: ${totalSponsorshipRevenue.toFixed(2)}</p>
                                </div>
                            )}
                            <div className="mt-6 pt-4 border-t space-y-4">
                                <p className="text-sm text-muted-foreground">Sponsorship details for the show bill / program:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="sponsorship-presentingSponsors">Presenting Sponsors</Label>
                                        <Textarea id="sponsorship-presentingSponsors" value={formData.showDetails?.sponsorship?.presentingSponsors || ''} onChange={e => handleDetailChange('sponsorship', 'presentingSponsors', e.target.value)} placeholder="Top-tier logo placement details..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sponsorship-classSponsors">Class Sponsors</Label>
                                        <Textarea id="sponsorship-classSponsors" value={formData.showDetails?.sponsorship?.classSponsors || ''} onChange={e => handleDetailChange('sponsorship', 'classSponsors', e.target.value)} placeholder="Specific awards/class announcements..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sponsorship-vendors">Commercial Exhibitors / Vendors</Label>
                                        <Textarea id="sponsorship-vendors" value={formData.showDetails?.sponsorship?.vendors || ''} onChange={e => handleDetailChange('sponsorship', 'vendors', e.target.value)} placeholder="Booth listings, locations..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sponsorship-qrLinks">QR Codes / Links</Label>
                                        <Textarea id="sponsorship-qrLinks" value={formData.showDetails?.sponsorship?.qrLinks || ''} onChange={e => handleDetailChange('sponsorship', 'qrLinks', e.target.value)} placeholder="Sponsor offers, raffle entries, vendor coupons..." />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {totalFeeRevenue > 0 && (
                        <div className="text-right px-2">
                            <p className="text-sm font-semibold text-emerald-600">Total Revenue: ${totalRevenue.toFixed(2)}</p>
                        </div>
                    )}
                </div>

                {/* ========== SECTION B: EXPENSES ========== */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 rounded-lg border-l-4 border-red-500 bg-red-500/5">
                        <TrendingDown className="h-6 w-6 text-red-600" />
                        <div>
                            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">B. Expenses (Money Going Out)</h3>
                            <p className="text-sm text-muted-foreground">Staff pay, arena rental, awards, marketing, equipment, and all operational costs.</p>
                        </div>
                    </div>

                    <Card className="bg-background/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Banknote className="h-6 w-6 text-red-600"/> Show Expenses</CardTitle>
                            <CardDescription>Track operational costs for running the show.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="space-y-2">
                                {expenseCategories.map(category => {
                                    const CategoryIcon = category.icon;
                                    const categoryExpenses = expenses.filter(e => e.category === category.id);
                                    const categoryTotal = categoryExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                                    return (
                                        <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4 bg-background/50">
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <div className="flex items-center gap-3">
                                                        <CategoryIcon className="h-5 w-5 text-red-600" />
                                                        <span className="font-semibold">{category.title}</span>
                                                        {categoryExpenses.length > 0 && (
                                                            <span className="text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full">{categoryExpenses.length} item{categoryExpenses.length !== 1 ? 's' : ''}</span>
                                                        )}
                                                    </div>
                                                    {categoryTotal > 0 && (
                                                        <span className="text-sm font-medium text-muted-foreground">${categoryTotal.toFixed(2)}</span>
                                                    )}
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 pb-4">
                                                <p className="text-sm text-muted-foreground mb-3">e.g., {category.examples}</p>
                                                <div className="space-y-2">
                                                    {categoryExpenses.map(expense => (
                                                        <div key={expense.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                                            <Input
                                                                value={expense.name}
                                                                onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                                                                placeholder="Expense name"
                                                                className="flex-1"
                                                            />
                                                            <Select value={expense.timing || 'before_show'} onValueChange={(val) => updateExpense(expense.id, 'timing', val)}>
                                                                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="before_show">Before Show</SelectItem>
                                                                    <SelectItem value="during_show">During Show</SelectItem>
                                                                    <SelectItem value="after_show">After Show</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Input
                                                                type="number"
                                                                value={expense.amount}
                                                                onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                                                                placeholder="Amount ($)"
                                                                className="w-32"
                                                            />
                                                            <Input
                                                                value={expense.notes}
                                                                onChange={(e) => updateExpense(expense.id, 'notes', e.target.value)}
                                                                placeholder="Notes"
                                                                className="flex-1 hidden md:block"
                                                            />
                                                            <Button variant="ghost" size="icon" className="flex-shrink-0 text-destructive hover:bg-destructive/10" onClick={() => removeExpense(expense.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => addExpense(category.id)}>
                                                    <PlusCircle className="h-4 w-4 mr-2" /> Add Line Item
                                                </Button>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                            {totalExpenses > 0 && (
                                <div className="mt-3 text-right">
                                    <p className="text-sm font-semibold text-red-600">Total Expenses: ${totalExpenses.toFixed(2)}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

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
                                            <td className="px-4 py-2 text-muted-foreground">{timingCategories.find(c => c.id === fee.payment_timing)?.title || fee.payment_timing}</td>
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
                                    {expenses.filter(e => e.name && e.amount).map(expense => (
                                        <tr key={expense.id} className="border-b last:border-0">
                                            <td className="px-4 py-2">{expense.name}</td>
                                            <td className="px-4 py-2 text-muted-foreground">{expenseCategories.find(c => c.id === expense.category)?.title || expense.category}</td>
                                            <td className="px-4 py-2 text-right font-medium">${parseFloat(expense.amount).toFixed(2)}</td>
                                        </tr>
                                    ))}
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

const FeeCategory = ({ id, title, description, fees, onUpdate, onRemove, associations, allAssociationsData }) => {
    const { setNodeRef } = useSortable({ id: `droppable-${id}` });

    return (
        <Card ref={setNodeRef} className="flex flex-col bg-background/30">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <SortableContext items={fees.map(f => f.id)}>
                     <div className="space-y-3">
                    {fees.length > 0 ? (
                        fees.map(fee => (
                            <SortableFeeItem key={fee.id} fee={fee} onUpdate={onUpdate} onRemove={onRemove} associations={associations} allAssociationsData={allAssociationsData} />
                        ))
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-full">
                            <Banknote className="h-8 w-8 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground font-medium">No fees in this category.</p>
                            <p className="text-sm text-muted-foreground">Drag fees here to assign.</p>
                        </div>
                    )}
                    </div>
                </SortableContext>
            </CardContent>
        </Card>
    );
};