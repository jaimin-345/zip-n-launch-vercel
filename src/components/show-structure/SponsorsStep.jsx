import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, HeartHandshake } from 'lucide-react';
import { isBudgetFrozen } from '@/lib/contractUtils';
import { BudgetFrozenBanner } from '@/components/contract-management/BudgetFrozenBanner';

export const SponsorsStep = ({ formData, setFormData }) => {
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

    const totalSponsorshipRevenue = useMemo(() => sponsorshipRevenue.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0), [sponsorshipRevenue]);

    const locked = isBudgetFrozen(formData);

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardContent className="space-y-8 pt-6">

                {locked && <BudgetFrozenBanner />}

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
                                        disabled={locked}
                                    />
                                    <Input
                                        type="number"
                                        value={item.amount}
                                        onChange={(e) => updateSponsorshipItem(item.id, 'amount', e.target.value)}
                                        placeholder="Amount ($)"
                                        className="w-32"
                                        disabled={locked}
                                    />
                                    <Input
                                        value={item.notes || ''}
                                        onChange={(e) => updateSponsorshipItem(item.id, 'notes', e.target.value)}
                                        placeholder="Notes"
                                        className="flex-1 hidden md:block"
                                        disabled={locked}
                                    />
                                    {!locked && (
                                        <Button variant="ghost" size="icon" className="flex-shrink-0 text-destructive hover:bg-destructive/10" onClick={() => removeSponsorshipItem(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-3" onClick={addSponsorshipItem} disabled={locked}>
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
                                    <Textarea id="sponsorship-presentingSponsors" value={formData.showDetails?.sponsorship?.presentingSponsors || ''} onChange={e => handleDetailChange('sponsorship', 'presentingSponsors', e.target.value)} placeholder="Top-tier logo placement details..." disabled={locked} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sponsorship-classSponsors">Class Sponsors</Label>
                                    <Textarea id="sponsorship-classSponsors" value={formData.showDetails?.sponsorship?.classSponsors || ''} onChange={e => handleDetailChange('sponsorship', 'classSponsors', e.target.value)} placeholder="Specific awards/class announcements..." disabled={locked} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sponsorship-vendors">Commercial Exhibitors / Vendors</Label>
                                    <Textarea id="sponsorship-vendors" value={formData.showDetails?.sponsorship?.vendors || ''} onChange={e => handleDetailChange('sponsorship', 'vendors', e.target.value)} placeholder="Booth listings, locations..." disabled={locked} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sponsorship-qrLinks">QR Codes / Links</Label>
                                    <Textarea id="sponsorship-qrLinks" value={formData.showDetails?.sponsorship?.qrLinks || ''} onChange={e => handleDetailChange('sponsorship', 'qrLinks', e.target.value)} placeholder="Sponsor offers, raffle entries, vendor coupons..." disabled={locked} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </CardContent>
        </motion.div>
    );
};
