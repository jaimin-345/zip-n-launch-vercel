import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ReviewSection = ({ title, onEditClick, children }) => {
    return (
        <AccordionItem value={title}>
            <AccordionTrigger className="text-lg font-semibold">
                <div className="flex justify-between items-center w-full pr-4">
                    <span>{title}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEditClick(); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                    </Button>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                    {children}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
};

const ReviewField = ({ label, value }) => {
    if (!value) return null;
    return (
        <p><span className="font-semibold text-foreground">{label}:</span> {value}</p>
    );
};

export const ReviewStep = ({ formData, setCurrentStep }) => {
    const { fees = [], associations = {} } = formData;
    const { toast } = useToast();
    const [associationsData, setAssociationsData] = useState([]);

    useEffect(() => {
        const fetchAssociations = async () => {
            const { data, error } = await supabase.from('associations').select('*');
            if (error) {
                toast({ title: 'Error fetching associations', description: error.message, variant: 'destructive' });
            } else {
                setAssociationsData(data);
            }
        };
        fetchAssociations();
    }, [toast]);

    const getAssociationName = (id) => associationsData.find(a => a.id === id)?.name || id;

    const totalFeeRevenue = useMemo(() => fees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0), [fees]);
    const sponsorshipRevenue = formData.sponsorshipRevenue || [];
    const totalSponsorshipRevenue = useMemo(() => sponsorshipRevenue.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0), [sponsorshipRevenue]);
    const totalRevenue = totalFeeRevenue + totalSponsorshipRevenue;
    const expenses = formData.showExpenses || [];
    const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0), [expenses]);
    const awardExpenses = formData.awardExpenses || [];
    const totalAwardExpenses = useMemo(() => awardExpenses.reduce((sum, a) => sum + ((parseFloat(a.amount) || 0) * (parseInt(a.qty) || 1)), 0), [awardExpenses]);
    const netProfitLoss = totalRevenue - totalExpenses - totalAwardExpenses;

    const selectedAssociations = Object.keys(associations || {}).filter(id => associations[id]);
    const details = formData.showDetails || {};

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 8: Review</CardTitle>
                <CardDescription>Review all details before saving. Click Edit to jump to any section.</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
                 <Accordion type="multiple" defaultValue={['Associations']} className="w-full">
                    {/* Step 1 */}
                    <ReviewSection title="1. Associations" onEditClick={() => setCurrentStep(1)}>
                        {selectedAssociations.length > 0
                            ? selectedAssociations.map(id => getAssociationName(id)).join(', ')
                            : 'No associations selected.'}
                        <ReviewField label="Show Name" value={formData.showName} />
                    </ReviewSection>

                    {/* Step 2 */}
                    <ReviewSection title="2. General & Venue" onEditClick={() => setCurrentStep(2)}>
                        <ReviewField label="Facility" value={details.venue?.facilityName} />
                        <ReviewField label="Address" value={details.venue?.address} />
                        <ReviewField label="Stalls" value={details.venue?.numberOfStalls} />
                        <ReviewField label="Arenas" value={details.venue?.numberOfArenas} />
                        <ReviewField label="RV Spots" value={details.venue?.numberOfRVSpots} />
                        <ReviewField label="Host Hotel" value={details.venue?.hostHotel} />
                        <ReviewField label="Show Manager" value={details.general?.managerName} />
                        <ReviewField label="Show Secretary" value={details.general?.secretaryName} />
                    </ReviewSection>

                    {/* Step 3 */}
                    <ReviewSection title="3. Officials & Staff" onEditClick={() => setCurrentStep(3)}>
                        {(formData.staff || []).length > 0
                            ? <p>{formData.staff.length} staff member{formData.staff.length !== 1 ? 's' : ''} configured.</p>
                            : <p>No staff configured.</p>}
                    </ReviewSection>

                    {/* Step 4 */}
                    <ReviewSection title="4. Fees & Sponsors (Revenue)" onEditClick={() => setCurrentStep(4)}>
                        <div className="space-y-3">
                            {fees.length > 0 ? fees.map(fee => (
                                <div key={fee.id} className="p-2 border-b">
                                    <p><span className="font-semibold text-foreground">{fee.name}:</span> ${fee.amount}</p>
                                    {fee.association_specific && <p className="text-xs">For: {getAssociationName(fee.association_specific)}</p>}
                                </div>
                            )) : <p>No fees defined.</p>}
                            {totalFeeRevenue > 0 && (
                                <div className="p-2 rounded-lg bg-emerald-500/5">
                                    <div className="flex justify-between text-sm font-bold">
                                        <span>Total Fee Revenue</span>
                                        <span className="text-emerald-600">${totalFeeRevenue.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                            {sponsorshipRevenue.filter(s => s.name).length > 0 && (
                                <>
                                    <p className="font-semibold text-foreground pt-2">Sponsorship Revenue</p>
                                    {sponsorshipRevenue.filter(s => s.name).map(s => (
                                        <div key={s.id} className="p-2 border-b">
                                            <p><span className="font-semibold text-foreground">{s.name}:</span> ${s.amount}</p>
                                        </div>
                                    ))}
                                    <div className="p-2 rounded-lg bg-emerald-500/5">
                                        <div className="flex justify-between text-sm font-bold">
                                            <span>Total Sponsorship</span>
                                            <span className="text-emerald-600">${totalSponsorshipRevenue.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </ReviewSection>

                    {/* Step 5 */}
                    <ReviewSection title="5. Show Expenses" onEditClick={() => setCurrentStep(5)}>
                        <div className="space-y-3">
                            {expenses.length > 0 ? (
                                <>
                                    {expenses.filter(e => e.name).map(e => (
                                        <div key={e.id} className="p-2 border-b">
                                            <p><span className="font-semibold text-foreground">{e.name}:</span> ${e.amount}</p>
                                            <p className="text-xs">{e.timing?.replace('_', ' ')} {e.category ? `/ ${e.category}` : ''}</p>
                                        </div>
                                    ))}
                                    <div className="p-2 rounded-lg bg-red-500/5">
                                        <div className="flex justify-between text-sm font-bold">
                                            <span>Total Expenses</span>
                                            <span className="text-red-600">${totalExpenses.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </>
                            ) : <p>No expenses defined.</p>}
                        </div>
                    </ReviewSection>

                    {/* Step 6 */}
                    <ReviewSection title="6. Awards" onEditClick={() => setCurrentStep(6)}>
                        <ReviewField label="High Point / All-Around" value={details.awards?.highPoint} />
                        <ReviewField label="Circuit Awards" value={details.awards?.circuitAwards} />
                        <ReviewField label="Special Awards" value={details.awards?.specialAwards} />
                        {totalAwardExpenses > 0 && (
                            <div className="p-2 rounded-lg bg-red-500/5 mt-2">
                                <div className="flex justify-between text-sm font-bold">
                                    <span>Total Award Expenses</span>
                                    <span className="text-red-600">${totalAwardExpenses.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </ReviewSection>

                    {/* Step 7 */}
                    <ReviewSection title="7. Entry & Scheduling" onEditClick={() => setCurrentStep(7)}>
                        <ReviewField label="Entry Deadlines" value={details.entry?.deadlines} />
                        <ReviewField label="Scratch Policy" value={details.entry?.scratchPolicy} />
                        <ReviewField label="Health Requirements" value={details.healthSafety?.healthReqs} />
                        <ReviewField label="Emergency Contacts" value={details.healthSafety?.emergencyContacts} />
                        <ReviewField label="Facility Rules" value={details.healthSafety?.facilityRules} />
                        <ReviewField label="Liability Release" value={details.healthSafety?.liability} />
                    </ReviewSection>
                </Accordion>

                {/* Budget Summary */}
                {(totalRevenue > 0 || totalExpenses > 0 || totalAwardExpenses > 0) && (
                    <div className="mt-6 border rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-muted/50 border-b">
                            <h4 className="font-semibold text-base">Budget Summary</h4>
                        </div>
                        <div className="p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Total Revenue</span>
                                <span className="font-semibold text-emerald-600">${totalRevenue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Total Expenses</span>
                                <span className="font-semibold text-red-600">${(totalExpenses + totalAwardExpenses).toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between text-sm font-bold">
                                <span>Projected Profit / Loss</span>
                                <span className={cn(netProfitLoss >= 0 ? "text-emerald-600" : "text-red-600")}>
                                    {netProfitLoss >= 0 ? '' : '-'}${Math.abs(netProfitLoss).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </motion.div>
    );
};
