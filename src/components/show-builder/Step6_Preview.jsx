import React from 'react';
    import { motion } from 'framer-motion';
    import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { Button } from '@/components/ui/button';
    import { useToast } from '@/components/ui/use-toast';
    import { parseLocalDate } from '@/lib/utils';
    import { FileText } from 'lucide-react';
    import { getAllClassItems } from '@/lib/showBillUtils';
    import { generateShowBillPdf } from '@/lib/showBillPdfGenerator';

    export const Step6_Preview = ({ formData, setFormData, associationsData }) => {
        const { toast } = useToast();

        const handleFeatureRequest = () => {
            toast({
                title: 'Coming Soon',
                description: "This feature isn't implemented yet — it will be available in a future update.",
            });
        };

        const allClassItems = React.useMemo(() => getAllClassItems(formData), [formData]);

        const handleGenerateShowBill = async () => {
            if (!formData.showBill) {
                toast({
                    title: 'No Show Bill Data',
                    description: 'Please build your show bill in Step 5 before generating a PDF.',
                    variant: 'destructive',
                });
                return;
            }
            try {
                await generateShowBillPdf(formData.showBill, allClassItems, associationsData);
                toast({ title: 'PDF Generated', description: 'Your show bill PDF has been downloaded.' });
            } catch (err) {
                toast({ title: 'PDF Error', description: err.message, variant: 'destructive' });
            }
        };

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
                            {Object.keys(formData.associations || {}).map(assocId => (
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
                            {Object.entries(formData.associationJudges || {}).flatMap(([assocId, info]) =>
                                (info.judges || []).filter(j => j?.name).map((judge, index) => (
                                    <Badge key={`${assocId}-${index}`} variant="outline">{judge.name} ({assocId})</Badge>
                                ))
                            )}
                            {Object.keys(formData.associationJudges || {}).length === 0 && (
                                <p className="text-sm text-muted-foreground">No judges assigned yet.</p>
                            )}
                        </div>
                    </div>

                    {formData.showBill && (
                        <div className="p-4 border rounded-lg">
                            <h3 className="text-lg font-semibold mb-2">Show Bill Summary</h3>
                            <p className="text-sm text-muted-foreground">
                                {formData.showBill.days?.length || 0} day(s), {' '}
                                {formData.showBill.days?.reduce((sum, d) => sum + d.arenas.length, 0) || 0} arena(s), {' '}
                                {formData.showBill.days?.reduce((sum, d) => sum + d.arenas.reduce((s, a) => s + a.items.filter(i => i.type === 'classBox').length, 0), 0) || 0} class box(es) scheduled
                            </p>
                        </div>
                    )}

                    <div className="mt-8 flex justify-end gap-4">
                        <Button variant="outline" onClick={handleGenerateShowBill}>
                            <FileText className="h-4 w-4 mr-2" />Generate Show Bill
                        </Button>
                        <Button onClick={handleFeatureRequest}>Finalize & Pay</Button>
                    </div>
                </CardContent>
            </motion.div>
        );
    };
