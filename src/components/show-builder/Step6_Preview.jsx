import React from 'react';
    import { motion } from 'framer-motion';
    import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { Button } from '@/components/ui/button';
    import { useToast } from '@/components/ui/use-toast';
    import { parseLocalDate } from '@/lib/utils';

    export const Step6_Preview = ({ formData, setFormData }) => {
        const { toast } = useToast();

        const handleFeatureRequest = () => {
            toast({
                title: '🚧 Feature Not Implemented',
                description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
            });
        };
        
        const allClassItems = React.useMemo(() => {
            return (formData.disciplines || []).flatMap(discipline => 
                (discipline.divisionOrder || []).map(divisionId => {
                    const [assocId, ...divisionParts] = divisionId.split('-');
                    const divisionName = divisionParts.join('-');
                    const customTitle = discipline.divisionPrintTitles?.[divisionId];
                    const name = customTitle || (divisionName.startsWith('custom-') ? divisionName.substring(7) : divisionName);
                    return { id: divisionId, name };
                })
            );
        }, [formData.disciplines]);

        return (
            <motion.div key="step6" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                <CardHeader>
                    <CardTitle>Step 6: Preview & Finalize</CardTitle>
                    <CardDescription>Review your complete show setup before finalizing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">{formData.showName || 'Untitled Show'}</h3>
                    <p className="text-muted-foreground">{formData.venueAddress}</p>
                    <p className="text-muted-foreground">
                        {formData.startDate && parseLocalDate(formData.startDate).toLocaleDateString()} - {formData.endDate && parseLocalDate(formData.endDate).toLocaleDateString()}
                    </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Associations</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(formData.associations).map(assocId => (
                                <Badge key={assocId} variant="secondary">{assocId}</Badge>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Classes ({allClassItems.length})</h3>
                         <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {allClassItems.map(pbbClass => (
                                <Badge key={pbbClass.id} variant="outline">{pbbClass.name}</Badge>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Judges</h3>
                         <div className="flex flex-wrap gap-2">
                            {(formData.judges || []).map((judge, index) => (
                                <Badge key={judge.id || index} variant="outline">{judge.name}</Badge>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                        <Button variant="outline" onClick={handleFeatureRequest}>Generate Show Bill</Button>
                        <Button onClick={handleFeatureRequest}>Finalize & Pay</Button>
                    </div>
                </CardContent>
            </motion.div>
        );
    };