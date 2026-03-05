import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

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

    const renderFeeStructure = () => {
        const totalFeeRevenue = fees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

        return (
            <div className="space-y-4">
                {fees.length > 0 ? fees.map(fee => (
                    <div key={fee.id} className="p-2 border-b">
                        <p><span className="font-semibold text-foreground">{fee.name}:</span> ${fee.amount}</p>
                        <p className="text-xs">Type: {fee.type}, {fee.apply_per_judge ? "Applied per judge." : "Not applied per judge."}</p>
                        {fee.association_specific && <p className="text-xs">For: {getAssociationName(fee.association_specific)}</p>}
                        {fee.notes && <p className="text-xs italic">Notes: {fee.notes}</p>}
                    </div>
                )) : <p>No fees defined.</p>}
                {totalFeeRevenue > 0 && (
                    <div className="mt-2 p-3 rounded-lg bg-emerald-500/5">
                        <div className="flex justify-between text-sm font-bold">
                            <span>Total Fee Revenue</span>
                            <span className="text-emerald-600">${totalFeeRevenue.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSponsors = () => {
        const sponsorship = formData.sponsorshipRevenue || [];
        const totalSponsorship = sponsorship.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

        return (
            <div className="space-y-4">
                {sponsorship.filter(s => s.name).length > 0 ? sponsorship.filter(s => s.name).map(s => (
                    <div key={s.id} className="p-2 border-b">
                        <p><span className="font-semibold text-foreground">{s.name}:</span> ${s.amount}</p>
                        {s.notes && <p className="text-xs italic">Notes: {s.notes}</p>}
                    </div>
                )) : <p>No sponsors defined.</p>}
                {totalSponsorship > 0 && (
                    <div className="mt-2 p-3 rounded-lg bg-emerald-500/5">
                        <div className="flex justify-between text-sm font-bold">
                            <span>Total Sponsorship Revenue</span>
                            <span className="text-emerald-600">${totalSponsorship.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const selectedAssociations = Object.keys(associations || {}).filter(id => associations[id]);

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardContent className="pt-6">
                 <Accordion type="multiple" defaultValue={['Associations']} className="w-full">
                    <ReviewSection title="Associations" onEditClick={() => setCurrentStep(1)}>
                        {selectedAssociations.length > 0 ? selectedAssociations.map(id => getAssociationName(id)).join(', ') : 'No associations selected.'}
                    </ReviewSection>
                    <ReviewSection title="Fee Structure" onEditClick={() => setCurrentStep(2)}>
                        {renderFeeStructure()}
                    </ReviewSection>
                    <ReviewSection title="Sponsors" onEditClick={() => setCurrentStep(3)}>
                        {renderSponsors()}
                    </ReviewSection>
                </Accordion>
            </CardContent>
        </motion.div>
    );
};