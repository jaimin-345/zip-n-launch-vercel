import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Pencil, Save, Loader2, ShieldCheck, Lock, Rocket, Download,
    CheckCircle2, Info, Globe, Facebook, Crown, UserCog, Mail, Phone,
    LayoutDashboard, Trophy, DollarSign, Users, ClipboardList, FileSpreadsheet
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { exportShowBudgetToExcel } from '@/lib/showBudgetExport';

const STATUS_CONFIG = {
    draft:     { label: 'Draft',     color: 'bg-yellow-100 text-yellow-800 border-yellow-300', dotColor: 'bg-yellow-500' },
    locked:    { label: 'Locked',    color: 'bg-blue-100 text-blue-800 border-blue-300',      dotColor: 'bg-blue-600' },
    published: { label: 'Published', color: 'bg-green-100 text-green-800 border-green-300',   dotColor: 'bg-green-500' },
};

// --- Admin & Owner Assignment ---
const AdminOwnerSection = ({ formData, setFormData, user, profile }) => {
    const loggedInUserName = profile?.full_name || user?.user_metadata?.full_name || '';
    const loggedInUserEmail = user?.email || '';
    const loggedInUserPhone = user?.user_metadata?.phone || user?.user_metadata?.mobile || profile?.phone || profile?.mobile || '';

    const defaultAdminOwner = {
        adminName: loggedInUserName, adminEmail: loggedInUserEmail, adminPhone: loggedInUserPhone,
        ownerName: loggedInUserName, ownerEmail: loggedInUserEmail, ownerPhone: loggedInUserPhone,
    };
    const adminOwner = { ...defaultAdminOwner, ...(formData.adminOwner || {}) };

    const handleUpdate = (field, value) => {
        setFormData(prev => ({ ...prev, adminOwner: { ...(prev.adminOwner || {}), [field]: value } }));
    };

    const isLocked = formData.showStatus === 'locked' || formData.showStatus === 'published';

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Crown className="h-5 w-5 text-red-600" />
                    Admin & Owner Assignment
                </h3>
            </div>
            <p className="text-sm text-muted-foreground">Must assign Admin and Owner (EquiPatterns members). Both default to creator but can be delegated.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 p-3 bg-background rounded-md border">
                    <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-primary" />
                        <Label className="font-semibold">Admin (Required)</Label>
                    </div>
                    <Input placeholder="Admin Name" value={adminOwner.adminName || ''} onChange={(e) => handleUpdate('adminName', e.target.value)} disabled={isLocked} />
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Email" className="pl-9" value={adminOwner.adminEmail || ''} onChange={(e) => handleUpdate('adminEmail', e.target.value)} disabled={isLocked} />
                        </div>
                        <div className="flex-1 relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Phone" className="pl-9" value={adminOwner.adminPhone || ''} onChange={(e) => handleUpdate('adminPhone', e.target.value)} disabled={isLocked} />
                        </div>
                    </div>
                </div>

                <div className="space-y-3 p-3 bg-background rounded-md border">
                    <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        <Label className="font-semibold">Owner (Required)</Label>
                    </div>
                    <Input placeholder="Owner Name" value={adminOwner.ownerName || ''} onChange={(e) => handleUpdate('ownerName', e.target.value)} disabled={isLocked} />
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Email" className="pl-9" value={adminOwner.ownerEmail || ''} onChange={(e) => handleUpdate('ownerEmail', e.target.value)} disabled={isLocked} />
                        </div>
                        <div className="flex-1 relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Phone" className="pl-9" value={adminOwner.ownerPhone || ''} onChange={(e) => handleUpdate('ownerPhone', e.target.value)} disabled={isLocked} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3 p-3 bg-background rounded-md border">
                <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium text-muted-foreground">Second Admin (Optional)</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder="Name" value={adminOwner.secondAdminName || ''} onChange={(e) => handleUpdate('secondAdminName', e.target.value)} disabled={isLocked} />
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Email" className="pl-9" value={adminOwner.secondAdminEmail || ''} onChange={(e) => handleUpdate('secondAdminEmail', e.target.value)} disabled={isLocked} />
                    </div>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Phone" className="pl-9" value={adminOwner.secondAdminPhone || ''} onChange={(e) => handleUpdate('secondAdminPhone', e.target.value)} disabled={isLocked} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Left Panel: Project Info ---
const ProjectInfoCard = ({ formData, user, setFormData, totalAllExpenses, isFull }) => {
    const status = formData.showStatus || 'draft';
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const details = formData.showDetails || {};
    const isLocked = status === 'locked' || status === 'published';

    return (
        <div className="border rounded-lg bg-card p-5 space-y-4">
            <h3 className="text-base font-semibold">Project Info</h3>
            <div className="space-y-3">
                <div>
                    <p className="text-xs text-muted-foreground">Show Name</p>
                    <p className="text-sm font-medium">{formData.showName || 'Untitled Show'}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Owner</p>
                    <p className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email || 'Unknown'}</p>
                </div>
                {details.venue?.facilityName && (
                    <div>
                        <p className="text-xs text-muted-foreground">Venue</p>
                        <p className="text-sm">{details.venue.facilityName}</p>
                    </div>
                )}
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-full border ${cfg.color}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`} />
                        {cfg.label}
                    </span>
                </div>
            </div>

            {/* Quick stats */}
            <div className="pt-3 border-t space-y-1.5">
                {isFull ? (
                    <>
                        <p className="text-xs text-muted-foreground">
                            {(formData.showExpenses || []).filter(e => e.name).length} expense(s) configured
                        </p>
                        {totalAllExpenses > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Total expenses: ${totalAllExpenses.toFixed(2)}
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <p className="text-xs text-muted-foreground">
                            {(formData.fees || []).filter(f => f.name).length} fee(s) configured
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {(formData.sponsors || []).filter(s => s.name).length + (formData.classSponsors || []).filter(cs => cs.sponsorName).length + (formData.arenaSponsors || []).filter(as => as.sponsorName).length + (formData.customSponsors || []).filter(cs => cs.name).length} sponsor(s) added
                        </p>
                    </>
                )}
            </div>

            {/* Publish Info */}
            <div className="pt-3 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Publish Info (shown on Events page)</p>
                <div className="space-y-1.5">
                    <Label htmlFor="showWebsite" className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Website URL</Label>
                    <Input
                        id="showWebsite"
                        placeholder="https://yourshow.com"
                        value={formData.showWebsite || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, showWebsite: e.target.value }))}
                        className="h-8 text-xs"
                        disabled={isLocked}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="showFacebook" className="text-xs flex items-center gap-1"><Facebook className="h-3 w-3" /> Facebook Event URL</Label>
                    <Input
                        id="showFacebook"
                        placeholder="https://facebook.com/events/..."
                        value={formData.showFacebook || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, showFacebook: e.target.value }))}
                        className="h-8 text-xs"
                        disabled={isLocked}
                    />
                </div>
            </div>
        </div>
    );
};

// --- Center Panel: Action Buttons (grouped) ---
const ActionPanel = ({ formData, currentStatus, onStatusChange, onExportBudget, isSaving, isFull }) => {
    const isFinalized = currentStatus === 'published';
    const isLocked = currentStatus === 'locked' || isFinalized;

    return (
        <div className="space-y-5">
            {/* Section 1: Manage Status */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold">Manage Status</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                    {isFull
                        ? 'Save, lock, and publish your show structure & expenses.'
                        : 'Save, lock, and publish your fee structure & sponsors.'}
                </p>

                <Button variant="outline" size="lg" className="w-full justify-start text-sm h-12" onClick={() => onStatusChange('draft')} disabled={isSaving || isLocked}>
                    {isSaving ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
                    <div className="text-left">
                        <span className="font-semibold">Save as Draft</span>
                        <span className="block text-xs text-muted-foreground">Save to My Projects as draft</span>
                    </div>
                </Button>

                <Button variant="outline" size="lg" className="w-full justify-start text-sm h-12 border-blue-200 hover:bg-blue-50 hover:border-blue-300" onClick={() => onStatusChange('locked')} disabled={isSaving || isLocked}>
                    {isSaving ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : (
                        <div className="mr-3 relative">
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                            <Lock className="h-3 w-3 text-blue-800 absolute -bottom-0.5 -right-0.5" />
                        </div>
                    )}
                    <div className="text-left">
                        <span className="font-semibold text-blue-700">Lock Editing</span>
                        <span className="block text-xs text-muted-foreground">Lock all editing — export & view only</span>
                    </div>
                </Button>

                <Button size="lg" className="w-full justify-start text-sm h-12 bg-green-600 hover:bg-green-700 text-white" onClick={() => onStatusChange('published')} disabled={isSaving || isFinalized}>
                    {isSaving ? <Loader2 className="mr-3 h-5 w-5 animate-spin text-white" /> : <Rocket className="mr-3 h-5 w-5" />}
                    <div className="text-left">
                        <span className="font-semibold">Make Schedule Public</span>
                        <span className="block text-xs text-green-200">Publish your schedule — visible to exhibitors</span>
                    </div>
                </Button>
            </div>

            {/* Section 2: Exports */}
            {onExportBudget && (
                <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-semibold">Exports</h3>
                    </div>
                    <Button size="lg" className="w-full text-sm font-semibold h-12" onClick={onExportBudget} disabled={isSaving}>
                        <Download className="mr-2 h-5 w-5" /> Export Show Budget Spreadsheet
                    </Button>
                </div>
            )}
        </div>
    );
};

// --- Right Panel: Licensing ---
const LicensingCard = () => (
    <div className="border rounded-lg bg-card p-5 space-y-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Project Ownership & Licensing
        </h3>
        <div className="space-y-2.5">
            <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-sm">Ownership retained by creator</p>
            </div>
            <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-sm">Stored in your My Projects folder</p>
            </div>
            <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-sm">Admin access assigned</p>
            </div>
            <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-sm">Can be edited until locked</p>
            </div>
        </div>
        <hr className="border-border" />
        <div className="bg-muted/50 rounded-md p-3">
            <p className="text-sm font-medium">Pricing Notice</p>
            <p className="text-xs text-muted-foreground mt-1">
                Building a show is free for members. Licensing applies only when publishing or exporting.
            </p>
        </div>
    </div>
);

// --- Review Accordion Helpers ---
const ReviewSection = ({ title, onEditClick, children }) => (
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

const ReviewField = ({ label, value }) => {
    if (!value) return null;
    return <p><span className="font-semibold text-foreground">{label}:</span> {value}</p>;
};

// --- Show Summary Panel ---
const ShowSummaryPanel = ({ formData, totalExpenses, totalAwardExpenses, totalFeeIncome, totalSponsorship }) => {
    const disciplines = formData.disciplines || [];
    const totalClasses = disciplines.reduce((sum, d) => sum + (d.divisionOrder?.length || 0), 0);

    const judges = (formData.staff || []).filter(s =>
        s.role?.toLowerCase().includes('judge') || s.position?.toLowerCase().includes('judge')
    );
    const judgeCount = judges.length;

    const totalIncome = totalFeeIncome + totalSponsorship;
    const totalAllExpenses = totalExpenses + totalAwardExpenses;
    const projectedProfit = totalIncome - totalAllExpenses;

    const stats = [
        { label: 'Classes', value: totalClasses, icon: LayoutDashboard, color: 'text-blue-600' },
        { label: 'Judges', value: judgeCount, icon: Users, color: 'text-indigo-600' },
        { label: 'Awards Budget', value: `$${totalAwardExpenses.toFixed(0)}`, icon: Trophy, color: 'text-amber-600' },
        { label: 'Expenses Total', value: `$${totalAllExpenses.toFixed(0)}`, icon: DollarSign, color: 'text-red-600' },
        { label: 'Projected Profit', value: `$${projectedProfit.toFixed(0)}`, icon: DollarSign, color: projectedProfit >= 0 ? 'text-green-600' : 'text-red-600' },
    ];

    return (
        <div className="border rounded-lg overflow-hidden bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="px-4 py-3 border-b bg-primary/10">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Show Summary
                </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-border">
                {stats.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Icon className={`h-3.5 w-3.5 ${color}`} />
                            <span className="text-xs text-muted-foreground">{label}</span>
                        </div>
                        <p className={`text-lg font-bold ${color}`}>{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Success Confirmation Dialog ---
const SuccessDialog = ({ open, onClose, onGoToDashboard, statusLabel }) => (
    <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Show Saved Successfully
                </DialogTitle>
                <DialogDescription className="pt-2">
                    Your show has been saved successfully with status: <span className="font-semibold">{statusLabel}</span>.
                    <br /><br />
                    Would you like to return to the dashboard?
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-0">
                <Button variant="outline" onClick={onClose}>Stay on Page</Button>
                <Button onClick={onGoToDashboard}>Go to Dashboard</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

// --- Main Component ---
export const ReviewStep = ({ formData, setFormData, setCurrentStep, variant = 'full', onNavigateToDashboard }) => {
    const { associations = {} } = formData;
    const { toast } = useToast();
    const { user, profile } = useAuth();
    const [associationsData, setAssociationsData] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [successDialog, setSuccessDialog] = useState({ open: false, statusLabel: '' });

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

    const sponsors = formData.sponsors || [];
    const classSponsors = formData.classSponsors || [];
    const arenaSponsors = formData.arenaSponsors || [];
    const customSponsors = formData.customSponsors || [];
    const fees = formData.fees || [];
    const totalFeeIncome = useMemo(() => fees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0), [fees]);
    const levelSponsorRevenue = useMemo(() => sponsors.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0), [sponsors]);
    const classSponsorRevenue = useMemo(() => classSponsors.reduce((sum, cs) => sum + (parseFloat(cs.amount) || 0), 0), [classSponsors]);
    const arenaSponsorRevenue = useMemo(() => arenaSponsors.reduce((sum, as) => sum + (parseFloat(as.amount) || 0), 0), [arenaSponsors]);
    const customSponsorRevenue = useMemo(() => customSponsors.reduce((sum, cs) => sum + (parseFloat(cs.amount) || 0), 0), [customSponsors]);
    const totalSponsorshipRevenue = levelSponsorRevenue + classSponsorRevenue + arenaSponsorRevenue + customSponsorRevenue;
    const totalSponsorCount = sponsors.filter(s => s.name).length + classSponsors.filter(cs => cs.sponsorName).length + arenaSponsors.filter(as => as.sponsorName).length + customSponsors.filter(cs => cs.name).length;
    const expenses = formData.showExpenses || [];
    const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + ((parseFloat(e.amount) || 0) * (parseInt(e.quantity) || 1)), 0), [expenses]);
    const awardExpenses = formData.awardExpenses || [];
    const totalAwardExpenses = useMemo(() => awardExpenses.reduce((sum, a) => sum + ((parseFloat(a.amount) || 0) * (parseInt(a.qty) || 1)), 0), [awardExpenses]);
    const totalAllExpenses = totalExpenses + totalAwardExpenses;

    const selectedAssociations = Object.keys(associations || {}).filter(id => associations[id]);
    const details = formData.showDetails || {};
    const currentStatus = formData.showStatus || 'draft';

    const isFull = variant === 'full';

    const handleGoToDashboard = useCallback(() => {
        setSuccessDialog({ open: false, statusLabel: '' });
        if (onNavigateToDashboard) {
            onNavigateToDashboard();
        } else {
            window.location.href = '/horse-show-manager';
        }
    }, [onNavigateToDashboard]);

    const handleStatusChange = useCallback(async (newStatus) => {
        setIsSaving(true);
        try {
            setFormData(prev => ({ ...prev, showStatus: newStatus }));
            const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
            setSuccessDialog({ open: true, statusLabel });
        } finally {
            setIsSaving(false);
        }
    }, [setFormData]);

    const handleExportBudget = useCallback(() => {
        try {
            exportShowBudgetToExcel(formData);
            toast({ title: 'Budget Exported', description: 'Your budget spreadsheet has been downloaded.' });
        } catch (err) {
            toast({ title: 'Export Error', description: err.message, variant: 'destructive' });
        }
    }, [formData, toast]);

    // Build review sections based on variant
    const sections = isFull ? [
        { num: 1, title: 'Event Setup', step: 1 },
        { num: 2, title: 'General & Venue', step: 2 },
        { num: 3, title: 'Officials & Staff', step: 3 },
        { num: 4, title: 'Show Expenses', step: 4 },
        { num: 5, title: 'Awards', step: 5 },
        { num: 6, title: 'General Information', step: 6 },
    ] : [
        { num: 1, title: 'Event Setup', step: 1 },
        { num: 2, title: 'Fee Structure', step: 2 },
        { num: 3, title: 'Sponsors', step: 3 },
    ];

    const renderSectionContent = (title) => {
        switch (title) {
            case 'Event Setup':
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
                        <ReviewField label="Venue" value={details.venue?.facilityName} />
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
            case 'Show Expenses':
                return (
                    <div className="space-y-3">
                        {expenses.filter(e => e.name).length > 0 ? (
                            <>
                                {expenses.filter(e => e.name).map(e => (
                                    <div key={e.id} className="p-2 border-b">
                                        <p><span className="font-semibold text-foreground">{e.name}:</span> ${e.amount}{e.quantity > 1 ? ` x ${e.quantity}` : ''}</p>
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
            case 'General Information':
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
            case 'Fee Structure':
                return (
                    <div className="space-y-2">
                        {(formData.fees || []).filter(f => f.name).length > 0 ? (
                            (formData.fees || []).filter(f => f.name).map(fee => (
                                <div key={fee.id} className="p-2 border-b">
                                    <p><span className="font-semibold text-foreground">{fee.name}:</span> ${fee.amount}</p>
                                    {fee.type && <p className="text-xs">{fee.type}</p>}
                                </div>
                            ))
                        ) : <p>No fees defined.</p>}
                    </div>
                );
            case 'Sponsors':
                return totalSponsorCount > 0
                    ? <p>{totalSponsorCount} sponsor{totalSponsorCount !== 1 ? 's' : ''} added. Total: ${totalSponsorshipRevenue.toFixed(2)}</p>
                    : <p>No sponsors added.</p>;
            default:
                return null;
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>{isFull ? '7. Save & Manage Your Show' : '4. Save & Manage'}</CardTitle>
                <CardDescription>
                    {isFull
                        ? 'Save your show, manage status, and publish when ready.'
                        : 'Save your fee structure & sponsors, manage status, and publish when ready.'}
                    <span className="block mt-1 text-xs text-muted-foreground/70">
                        Building a show is free — licensing applies only when publishing/exporting.
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Show Summary Panel */}
                {isFull && (
                    <ShowSummaryPanel
                        formData={formData}
                        totalExpenses={totalExpenses}
                        totalAwardExpenses={totalAwardExpenses}
                        totalFeeIncome={totalFeeIncome}
                        totalSponsorship={totalSponsorshipRevenue}
                    />
                )}

                {/* Admin & Owner Assignment */}
                <AdminOwnerSection formData={formData} setFormData={setFormData} user={user} profile={profile} />

                {/* 3-Column Layout: Project Info | Manage Show | Licensing */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-3">
                        <ProjectInfoCard formData={formData} user={user} setFormData={setFormData} totalAllExpenses={totalAllExpenses} isFull={isFull} />
                    </div>
                    <div className="lg:col-span-5">
                        <ActionPanel
                            formData={formData}
                            currentStatus={currentStatus}
                            onStatusChange={handleStatusChange}
                            onExportBudget={isFull ? handleExportBudget : null}
                            isSaving={isSaving}
                            isFull={isFull}
                        />
                    </div>
                    <div className="lg:col-span-4">
                        <LicensingCard />
                    </div>
                </div>

                {/* Review Sections */}
                <Accordion type="multiple" defaultValue={['1. Event Setup']} className="w-full">
                    {sections.map(({ num, title, step }) => (
                        <ReviewSection key={title} title={`${num}. ${title}`} onEditClick={() => setCurrentStep(step)}>
                            {renderSectionContent(title)}
                        </ReviewSection>
                    ))}
                </Accordion>

                {/* Expense Summary — full variant only */}
                {isFull && (totalExpenses > 0 || totalAwardExpenses > 0) && (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-muted/50 border-b">
                            <h4 className="font-semibold text-base">Expense Summary</h4>
                        </div>
                        <div className="p-4 space-y-2">
                            {totalExpenses > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>Show Expenses</span>
                                    <span className="font-semibold text-red-600">${totalExpenses.toFixed(2)}</span>
                                </div>
                            )}
                            {totalAwardExpenses > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span>Award Expenses</span>
                                    <span className="font-semibold text-red-600">${totalAwardExpenses.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="border-t pt-2 flex justify-between text-sm font-bold">
                                <span>Total Expenses</span>
                                <span className="text-red-600">${totalAllExpenses.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
                {/* Success Confirmation Dialog */}
                <SuccessDialog
                    open={successDialog.open}
                    onClose={() => setSuccessDialog({ open: false, statusLabel: '' })}
                    onGoToDashboard={handleGoToDashboard}
                    statusLabel={successDialog.statusLabel}
                />
            </CardContent>
        </motion.div>
    );
};
