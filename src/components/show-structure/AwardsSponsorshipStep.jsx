import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export const AwardsSponsorshipStep = ({ formData, setFormData }) => {
    const handleDetailChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            showDetails: {
                ...prev.showDetails,
                [section]: {
                    ...(prev.showDetails[section] || {}),
                    [field]: value
                }
            }
        }));
    };

    const renderTextarea = (section, field, label, placeholder) => (
        <div className="space-y-2">
            <Label htmlFor={`${section}-${field}`}>{label}</Label>
            <Textarea 
                id={`${section}-${field}`}
                value={formData.showDetails?.[section]?.[field] || ''} 
                onChange={e => handleDetailChange(section, field, e.target.value)} 
                placeholder={placeholder}
            />
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 6: Awards, Sponsorship, & Special Events</CardTitle>
                <CardDescription>Highlight what makes your event special.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-semibold text-lg mb-3">Awards & Recognition</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderTextarea('awards', 'highPoint', 'High Point / All-Around Awards', 'Criteria, divisions, points system...')}
                        {renderTextarea('awards', 'circuitAwards', 'Circuit Awards', 'e.g., Must show to all judges in a class...')}
                        {renderTextarea('awards', 'specialAwards', 'Special Awards', 'Sponsor trophies, scholarships...')}
                        {renderTextarea('awards', 'nsbaPayouts', 'NSBA Payouts / Added Money', 'Jackpots, futurities, distribution rules...')}
                    </div>
                </div>

                <div className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-semibold text-lg mb-3">Sponsorship & Marketing</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderTextarea('sponsorship', 'presentingSponsors', 'Presenting Sponsors', 'Top-tier logo placement details...')}
                        {renderTextarea('sponsorship', 'classSponsors', 'Class Sponsors', 'Specific awards/class announcements...')}
                        {renderTextarea('sponsorship', 'vendors', 'Commercial Exhibitors / Vendors', 'Booth listings, locations...')}
                        {renderTextarea('sponsorship', 'qrLinks', 'QR Codes / Links', 'Sponsor offers, raffle entries, vendor coupons...')}
                    </div>
                </div>

                <div className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-semibold text-lg mb-3">Health, Safety & Legal</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderTextarea('healthSafety', 'healthReqs', 'Equine Health Requirements', 'Negative Coggins, vaccinations, vet inspection...')}
                        {renderTextarea('healthSafety', 'emergencyContacts', 'Emergency Contacts', 'Vet on call, farrier, EMT, show office phone...')}
                        {renderTextarea('healthSafety', 'liability', 'Liability Release Statement', 'Standard assumption of risk language...')}
                        {renderTextarea('healthSafety', 'insurance', 'Insurance Requirements', 'If breed or venue requires...')}
                        {renderTextarea('healthSafety', 'facilityRules', 'Facility Rules', 'No dogs off leash, golf cart restrictions, smoking policy...')}
                    </div>
                </div>

                <div className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-semibold text-lg mb-3">Special Events</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderTextarea('specialEvents', 'clinics', 'Clinics / Schooling Sessions', 'Details, times, costs...')}
                        {renderTextarea('specialEvents', 'socialEvents', 'Exhibitor Party / Social Events', 'Date, time, location...')}
                        {renderTextarea('specialEvents', 'meetings', 'Youth / Amateur Meetings', 'Details...')}
                        {renderTextarea('specialEvents', 'fundraisers', 'Silent Auctions / Fundraisers', 'Details...')}
                        {renderTextarea('specialEvents', 'banquets', 'Banquets / Awards Dinners', 'Details...')}
                    </div>
                </div>
            </CardContent>
        </motion.div>
    );
};