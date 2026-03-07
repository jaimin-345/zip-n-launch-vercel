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

export const ReviewStep = ({ formData, setCurrentStep, variant = 'full' }) => {
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
    const sponsors = formData.sponsors || [];
    const totalSponsorshipRevenue = useMemo(() => sponsors.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0), [sponsors]);
    const totalRevenue = totalFeeRevenue + totalSponsorshipRevenue;
    const expenses = formData.showExpenses || [];
    const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0), [expenses]);
    const awardExpenses = formData.awardExpenses || [];
    const totalAwardExpenses = useMemo(() => awardExpenses.reduce((sum, a) => sum + ((parseFloat(a.amount) || 0) * (parseInt(a.qty) || 1)), 0), [awardExpenses]);
    const netProfitLoss = totalRevenue - totalExpenses - totalAwardExpenses;

    const selectedAssociations = Object.keys(associations || {}).filter(id => associations[id]);
    const details = formData.showDetails || {};

    const isFull = variant === 'full';

    const FeesAndSponsorsContent = () => (
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
            {sponsors.filter(s => s.name).length > 0 && (
                <>
                    <p className="font-semibold text-foreground pt-2">Sponsorship Revenue</p>
                    {sponsors.filter(s => s.name).map(s => (
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
    );

    // Build review sections based on variant
    const sections = isFull ? [
        { num: 1, title: 'Associations', step: 1 },
        { num: 2, title: 'General & Venue', step: 2 },
        { num: 3, title: 'Officials & Staff', step: 3 },
        { num: 4, title: 'Fees & Sponsors (Revenue)', step: 4 },
        { num: 5, title: 'Show Expenses', step: 5 },
        { num: 6, title: 'Awards', step: 6 },
        { num: 7, title: 'Entry & Scheduling', step: 7 },
    ] : [
        { num: 1, title: 'Associations', step: 1 },
        { num: 2, title: 'Fees & Sponsors (Revenue)', step: 2 },
        { num: 3, title: 'Sponsors', step: 3 },
    ];

    const renderSectionContent = (title) => {
        switch (title) {
            case 'Associations':
                return (
                    <>
                        {selectedAssociations.length > 0
                            ? selectedAssociations.map(id => getAssociationName(id)).join(', ')
                            : 'No associations selected.'}
                        <ReviewField label="Show Name" value={formData.showName} />
                    </>
                );
            case 'General & Venue':
                return (
                    <>
                        <ReviewField label="Facility" value={details.venue?.facilityName} />
                        <ReviewField label="Address" value={details.venue?.address} />
                        <ReviewField label="Stalls" value={details.venue?.numberOfStalls} />
                        <ReviewField label="Arenas" value={details.venue?.numberOfArenas} />
                        <ReviewField label="RV Spots" value={details.venue?.numberOfRVSpots} />
                        <ReviewField label="Host Hotel" value={details.venue?.hostHotel} />
                        <ReviewField label="Show Manager" value={details.general?.managerName} />
                        <ReviewField label="Show Secretary" value={details.general?.secretaryName} />
                    </>
                );
            case 'Officials & Staff':
                return (formData.staff || []).length > 0
                    ? <p>{formData.staff.length} staff member{formData.staff.length !== 1 ? 's' : ''} configured.</p>
                    : <p>No staff configured.</p>;
            case 'Fees & Sponsors (Revenue)':
                return <FeesAndSponsorsContent />;
            case 'Show Expenses':
                return (
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
                );
            case 'Awards':
                return (
                    <>
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
                    </>
                );
            case 'Entry & Scheduling':
                return (
                    <>
                        <ReviewField label="Entry Deadlines" value={details.entry?.deadlines} />
                        <ReviewField label="Scratch Policy" value={details.entry?.scratchPolicy} />
                        <ReviewField label="Health Requirements" value={details.healthSafety?.healthReqs} />
                        <ReviewField label="Emergency Contacts" value={details.healthSafety?.emergencyContacts} />
                        <ReviewField label="Facility Rules" value={details.healthSafety?.facilityRules} />
                        <ReviewField label="Liability Release" value={details.healthSafety?.liability} />
                    </>
                );
            case 'Sponsors':
                return sponsors.length > 0
                    ? <p>{sponsors.length} sponsor{sponsors.length !== 1 ? 's' : ''} added. Total: ${totalSponsorshipRevenue.toFixed(2)}</p>
                    : <p>No sponsors added.</p>;
            default:
                return null;
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Review</CardTitle>
                <CardDescription>Review all details before saving. Click Edit to jump to any section.</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
                 <Accordion type="multiple" defaultValue={['Associations']} className="w-full">
                    {sections.map(({ num, title, step }) => (
                        <ReviewSection key={title} title={`${num}. ${title}`} onEditClick={() => setCurrentStep(step)}>
                            {renderSectionContent(title)}
                        </ReviewSection>
                    ))}
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
                            {(isFull || totalExpenses > 0 || totalAwardExpenses > 0) && (
                                <div className="flex justify-between text-sm">
                                    <span>Total Expenses</span>
                                    <span className="font-semibold text-red-600">${(totalExpenses + totalAwardExpenses).toFixed(2)}</span>
                                </div>
                            )}
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
