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
    const { showDetails, fees = [], associations = {} } = formData;
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

    const renderDetails = (section, associationId = null) => {
        const data = associationId ? showDetails?.[section]?.[associationId] : showDetails?.[section];
        if (!data) return <p>No details provided.</p>;
        
        const entries = Object.entries(data).map(([key, value]) => {
            if (!value) return null;
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
            return (
                <div key={key}>
                    <span className="font-semibold text-foreground">{label}:</span> {value}
                </div>
            )
        }).filter(Boolean);

        return entries.length > 0 ? entries : <p>No details provided for this section.</p>;
    };
    
    const renderFees = () => {
        if (fees.length === 0) return <p>No fees defined.</p>;
        return fees.map(fee => (
            <div key={fee.id} className="p-2 border-b">
                <p><span className="font-semibold text-foreground">{fee.name}:</span> ${fee.amount}</p>
                <p className="text-xs">Type: {fee.type}, {fee.apply_per_judge ? "Applied per judge." : "Not applied per judge."}</p>
                {fee.association_specific && <p className="text-xs">For: {getAssociationName(fee.association_specific)}</p>}
                {fee.notes && <p className="text-xs italic">Notes: {fee.notes}</p>}
            </div>
        ))
    };

    const selectedAssociations = Object.keys(associations || {}).filter(id => associations[id]);

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 7: Review All Details</CardTitle>
                <CardDescription>Review all the information you've entered. Click "Edit" on any section to make changes.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Accordion type="multiple" defaultValue={['General & Venue']} className="w-full">
                    <ReviewSection title="General & Venue" onEditClick={() => setCurrentStep(1)}>
                        {renderDetails('general')}
                        {renderDetails('venue')}
                    </ReviewSection>
                    <ReviewSection title="Associations" onEditClick={() => setCurrentStep(2)}>
                        {selectedAssociations.length > 0 ? selectedAssociations.map(id => getAssociationName(id)).join(', ') : 'No associations selected.'}
                    </ReviewSection>
                    <ReviewSection title="Officials & Staff" onEditClick={() => setCurrentStep(3)}>
                        {selectedAssociations.map(assocId => (
                            <div key={assocId} className="mt-2">
                                <h4 className="font-bold text-foreground">{getAssociationName(assocId)}</h4>
                                {renderDetails('officials', assocId)}
                            </div>
                        ))}
                        <div className="mt-4">
                            <h4 className="font-bold text-foreground">General Staff</h4>
                            {renderDetails('officials')}
                        </div>
                    </ReviewSection>
                     <ReviewSection title="Fee Structure" onEditClick={() => setCurrentStep(4)}>
                        {renderFees()}
                    </ReviewSection>
                     <ReviewSection title="Entry, Rules & Scheduling" onEditClick={() => setCurrentStep(5)}>
                        {renderDetails('membership')}
                        {renderDetails('entry')}
                        {renderDetails('officeAdmin')}
                        {renderDetails('scheduling')}
                    </ReviewSection>
                    <ReviewSection title="Awards, Sponsors & Events" onEditClick={() => setCurrentStep(6)}>
                         {renderDetails('awards')}
                         {renderDetails('sponsorship')}
                         {renderDetails('healthSafety')}
                         {renderDetails('specialEvents')}
                    </ReviewSection>
                </Accordion>
            </CardContent>
        </motion.div>
    );
};