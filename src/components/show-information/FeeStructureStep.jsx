import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Calendar, Layers, Banknote, GripVertical, BadgeCent } from 'lucide-react';
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

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 4: Fee Structure & Deadlines</CardTitle>
                <CardDescription>Add fees from the catalog, then drag and drop to organize them into payment categories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 <Card className="bg-background/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Layers className="h-6 w-6 text-primary"/> Fee Catalog</CardTitle>
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