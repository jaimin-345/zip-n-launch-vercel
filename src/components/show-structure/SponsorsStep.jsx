import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlusCircle, Trash2, HeartHandshake, Crown, Medal, Award, Pencil, Users, Link2, X, GripVertical } from 'lucide-react';
import { isBudgetFrozen } from '@/lib/contractUtils';
import { BudgetFrozenBanner } from '@/components/contract-management/BudgetFrozenBanner';
import { cn } from '@/lib/utils';

const LEVEL_ICONS = {
    platinum: Crown,
    gold: Medal,
    silver: Award,
};

const DEFAULT_LEVEL_COLORS = {
    platinum: 'bg-slate-100 text-slate-700 border-slate-300',
    gold: 'bg-amber-50 text-amber-700 border-amber-300',
    silver: 'bg-gray-50 text-gray-600 border-gray-300',
};

// ── Sponsor Level Management ──

const SponsorLevelCard = ({ level, onUpdate, onRemove, sponsorCount, locked }) => {
    const [isEditing, setIsEditing] = useState(false);
    const LevelIcon = LEVEL_ICONS[level.id] || Award;
    const colorClass = DEFAULT_LEVEL_COLORS[level.id] || 'bg-blue-50 text-blue-700 border-blue-300';

    return (
        <div className={cn('border rounded-lg p-4 transition-all', colorClass)}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <LevelIcon className="h-5 w-5" />
                    {isEditing ? (
                        <Input
                            value={level.name}
                            onChange={(e) => onUpdate(level.id, 'name', e.target.value)}
                            className="h-7 w-40 text-sm font-semibold"
                            autoFocus
                            onBlur={() => setIsEditing(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                        />
                    ) : (
                        <h4 className="font-semibold text-base">{level.name}</h4>
                    )}
                    <Badge variant="outline" className="text-xs">{sponsorCount} sponsor{sponsorCount !== 1 ? 's' : ''}</Badge>
                </div>
                <div className="flex items-center gap-1">
                    {!locked && (
                        <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(!isEditing)}>
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Remove {level.name} Level?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will remove the level and unassign {sponsorCount} sponsor{sponsorCount !== 1 ? 's' : ''} from it. Sponsors will not be deleted.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onRemove(level.id)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="space-y-1">
                    <Label className="text-xs">Price</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
                        <Input
                            type="number"
                            value={level.amount}
                            onChange={(e) => onUpdate(level.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="pl-7 h-8 text-sm"
                            disabled={locked}
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Benefits</Label>
                    <Input
                        value={level.benefits || ''}
                        onChange={(e) => onUpdate(level.id, 'benefits', e.target.value)}
                        placeholder="Describe benefits..."
                        className="h-8 text-sm"
                        disabled={locked}
                    />
                </div>
            </div>
        </div>
    );
};

// ── Individual Sponsor Row ──

const SponsorRow = ({ sponsor, levels, classes, onUpdate, onRemove, onLinkClass, onUnlinkClass, locked }) => {
    const level = levels.find(l => l.id === sponsor.levelId);

    return (
        <div className="border rounded-lg p-4 bg-background space-y-3">
            <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                        value={sponsor.name}
                        onChange={(e) => onUpdate(sponsor.id, 'name', e.target.value)}
                        placeholder="Sponsor name"
                        disabled={locked}
                    />
                    <Input
                        value={sponsor.contactEmail || ''}
                        onChange={(e) => onUpdate(sponsor.id, 'contactEmail', e.target.value)}
                        placeholder="Contact email"
                        disabled={locked}
                    />
                    <Select
                        value={sponsor.levelId || ''}
                        onValueChange={(val) => onUpdate(sponsor.id, 'levelId', val)}
                        disabled={locked}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select level..." />
                        </SelectTrigger>
                        <SelectContent>
                            {levels.map(l => (
                                <SelectItem key={l.id} value={l.id}>
                                    {l.name} — ${l.amount.toLocaleString()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {!locked && (
                    <Button variant="ghost" size="icon" className="flex-shrink-0 text-destructive hover:bg-destructive/10" onClick={() => onRemove(sponsor.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                    value={sponsor.amount || ''}
                    onChange={(e) => onUpdate(sponsor.id, 'amount', e.target.value)}
                    placeholder={level ? `Amount ($${level.amount} suggested)` : 'Amount ($)'}
                    type="number"
                    disabled={locked}
                />
                <Input
                    value={sponsor.notes || ''}
                    onChange={(e) => onUpdate(sponsor.id, 'notes', e.target.value)}
                    placeholder="Notes"
                    disabled={locked}
                />
            </div>

            {/* Class linking */}
            {classes.length > 0 && (
                <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 mb-2">
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Linked Classes</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {(sponsor.linkedClassIds || []).map(classId => {
                            const cls = classes.find(c => c.id === classId);
                            return cls ? (
                                <Badge key={classId} variant="secondary" className="text-xs gap-1">
                                    {cls.name}
                                    {!locked && (
                                        <button type="button" onClick={() => onUnlinkClass(sponsor.id, classId)} className="ml-0.5 hover:text-destructive">
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </Badge>
                            ) : null;
                        })}
                        {!locked && (
                            <Select onValueChange={(val) => onLinkClass(sponsor.id, val)}>
                                <SelectTrigger className="h-6 w-36 text-xs">
                                    <SelectValue placeholder="+ Link class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes
                                        .filter(c => !(sponsor.linkedClassIds || []).includes(c.id))
                                        .map(cls => (
                                            <SelectItem key={cls.id} value={cls.id} className="text-xs">
                                                {cls.name}
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Component ──

export const SponsorsStep = ({ formData, setFormData }) => {
    const sponsorLevels = formData.sponsorLevels || [];
    const sponsors = formData.sponsors || [];
    const locked = isBudgetFrozen(formData);

    // Derive classes from disciplines for class-linking
    const classes = useMemo(() => {
        const disciplines = formData.disciplines || [];
        const items = [];
        for (const disc of disciplines) {
            for (const divId of (disc.divisionOrder || [])) {
                const name = disc.divisionPrintTitles?.[divId] || divId.split('-').slice(1).join('-');
                items.push({ id: divId, name, disciplineName: disc.name });
            }
        }
        return items;
    }, [formData.disciplines]);

    // ── Level CRUD ──
    const updateLevel = (levelId, field, value) => {
        setFormData(prev => ({
            ...prev,
            sponsorLevels: (prev.sponsorLevels || []).map(l => l.id === levelId ? { ...l, [field]: value } : l),
        }));
    };

    const removeLevel = (levelId) => {
        setFormData(prev => ({
            ...prev,
            sponsorLevels: (prev.sponsorLevels || []).filter(l => l.id !== levelId),
            sponsors: (prev.sponsors || []).map(s => s.levelId === levelId ? { ...s, levelId: '' } : s),
        }));
    };

    const addLevel = () => {
        const newLevel = {
            id: uuidv4(),
            name: 'New Level',
            amount: 0,
            color: '#60a5fa',
            benefits: '',
        };
        setFormData(prev => ({
            ...prev,
            sponsorLevels: [...(prev.sponsorLevels || []), newLevel],
        }));
    };

    // ── Sponsor CRUD ──
    const addSponsor = (levelId) => {
        const level = sponsorLevels.find(l => l.id === levelId);
        const newSponsor = {
            id: uuidv4(),
            name: '',
            contactEmail: '',
            levelId: levelId || '',
            amount: level ? level.amount : '',
            notes: '',
            linkedClassIds: [],
        };
        setFormData(prev => ({
            ...prev,
            sponsors: [...(prev.sponsors || []), newSponsor],
        }));
    };

    const updateSponsor = (sponsorId, field, value) => {
        setFormData(prev => {
            let updatedSponsors = (prev.sponsors || []).map(s => {
                if (s.id !== sponsorId) return s;
                const updated = { ...s, [field]: value };
                // Auto-fill amount when level changes and amount is empty or was the old level's amount
                if (field === 'levelId') {
                    const newLevel = (prev.sponsorLevels || []).find(l => l.id === value);
                    const oldLevel = (prev.sponsorLevels || []).find(l => l.id === s.levelId);
                    const currentAmount = parseFloat(s.amount) || 0;
                    if (newLevel && (currentAmount === 0 || (oldLevel && currentAmount === oldLevel.amount))) {
                        updated.amount = newLevel.amount;
                    }
                }
                return updated;
            });
            return { ...prev, sponsors: updatedSponsors };
        });
    };

    const removeSponsor = (sponsorId) => {
        setFormData(prev => ({
            ...prev,
            sponsors: (prev.sponsors || []).filter(s => s.id !== sponsorId),
        }));
    };

    const linkClass = (sponsorId, classId) => {
        setFormData(prev => ({
            ...prev,
            sponsors: (prev.sponsors || []).map(s =>
                s.id === sponsorId
                    ? { ...s, linkedClassIds: [...(s.linkedClassIds || []), classId] }
                    : s
            ),
        }));
    };

    const unlinkClass = (sponsorId, classId) => {
        setFormData(prev => ({
            ...prev,
            sponsors: (prev.sponsors || []).map(s =>
                s.id === sponsorId
                    ? { ...s, linkedClassIds: (s.linkedClassIds || []).filter(id => id !== classId) }
                    : s
            ),
        }));
    };

    // ── Sponsorship program details ──
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

    // ── Stats ──
    const totalSponsorshipRevenue = useMemo(() =>
        sponsors.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0),
    [sponsors]);

    const sponsorsByLevel = useMemo(() => {
        const map = {};
        for (const level of sponsorLevels) {
            map[level.id] = sponsors.filter(s => s.levelId === level.id);
        }
        map['unassigned'] = sponsors.filter(s => !s.levelId || !sponsorLevels.find(l => l.id === s.levelId));
        return map;
    }, [sponsors, sponsorLevels]);

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HeartHandshake className="h-6 w-6 text-emerald-600" />
                    Sponsor Management
                </CardTitle>
                <CardDescription>
                    Define sponsorship levels, add sponsors, and link them to show classes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

                {locked && <BudgetFrozenBanner />}

                {/* Revenue Summary */}
                {totalSponsorshipRevenue > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                        <div>
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Total Sponsorship Revenue</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">{sponsors.length} sponsor{sponsors.length !== 1 ? 's' : ''} across {sponsorLevels.length} level{sponsorLevels.length !== 1 ? 's' : ''}</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">${totalSponsorshipRevenue.toLocaleString()}</p>
                    </div>
                )}

                {/* ── Section 1: Sponsor Levels ── */}
                <Card className="bg-background/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Sponsor Levels</CardTitle>
                        <CardDescription>Define pricing tiers and benefits for each sponsorship level.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {sponsorLevels.map(level => (
                            <SponsorLevelCard
                                key={level.id}
                                level={level}
                                onUpdate={updateLevel}
                                onRemove={removeLevel}
                                sponsorCount={(sponsorsByLevel[level.id] || []).length}
                                locked={locked}
                            />
                        ))}
                        {!locked && (
                            <Button variant="outline" size="sm" className="w-full" onClick={addLevel}>
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Sponsor Level
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* ── Section 2: Sponsors by Level ── */}
                <Card className="bg-background/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Sponsors
                        </CardTitle>
                        <CardDescription>Add sponsors and assign them to levels. Link sponsors to specific classes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" defaultValue={sponsorLevels.map(l => l.id)} className="w-full">
                            {sponsorLevels.map(level => {
                                const levelSponsors = sponsorsByLevel[level.id] || [];
                                const LevelIcon = LEVEL_ICONS[level.id] || Award;
                                return (
                                    <AccordionItem key={level.id} value={level.id}>
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center gap-2">
                                                <LevelIcon className="h-4 w-4" />
                                                <span className="font-semibold">{level.name}</span>
                                                <Badge variant="outline" className="text-xs ml-1">
                                                    {levelSponsors.length} sponsor{levelSponsors.length !== 1 ? 's' : ''}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ${level.amount.toLocaleString()}/ea
                                                </span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="space-y-3 pt-2">
                                            {levelSponsors.map(sponsor => (
                                                <SponsorRow
                                                    key={sponsor.id}
                                                    sponsor={sponsor}
                                                    levels={sponsorLevels}
                                                    classes={classes}
                                                    onUpdate={updateSponsor}
                                                    onRemove={removeSponsor}
                                                    onLinkClass={linkClass}
                                                    onUnlinkClass={unlinkClass}
                                                    locked={locked}
                                                />
                                            ))}
                                            {levelSponsors.length === 0 && (
                                                <p className="text-sm text-muted-foreground text-center py-4">No sponsors at this level yet.</p>
                                            )}
                                            {!locked && (
                                                <Button variant="outline" size="sm" className="w-full" onClick={() => addSponsor(level.id)}>
                                                    <PlusCircle className="h-4 w-4 mr-2" /> Add {level.name} Sponsor
                                                </Button>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}

                            {/* Unassigned sponsors */}
                            {(sponsorsByLevel['unassigned'] || []).length > 0 && (
                                <AccordionItem value="unassigned">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-muted-foreground">Unassigned</span>
                                            <Badge variant="outline" className="text-xs">
                                                {sponsorsByLevel['unassigned'].length}
                                            </Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2">
                                        {sponsorsByLevel['unassigned'].map(sponsor => (
                                            <SponsorRow
                                                key={sponsor.id}
                                                sponsor={sponsor}
                                                levels={sponsorLevels}
                                                classes={classes}
                                                onUpdate={updateSponsor}
                                                onRemove={removeSponsor}
                                                onLinkClass={linkClass}
                                                onUnlinkClass={unlinkClass}
                                                locked={locked}
                                            />
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                        </Accordion>

                        {!locked && (
                            <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => addSponsor('')}>
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Sponsor (Unassigned)
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* ── Section 3: Sponsorship Program Details ── */}
                <Card className="bg-background/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Sponsorship Program Details</CardTitle>
                        <CardDescription>Additional details for the show bill / program.</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                </Card>

                {/* ── Levels Summary Table ── */}
                {sponsorLevels.length > 0 && sponsors.length > 0 && (
                    <Card className="bg-background/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Sponsorship Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="text-left px-3 py-2 font-medium">Level</th>
                                            <th className="text-right px-3 py-2 font-medium">Price</th>
                                            <th className="text-center px-3 py-2 font-medium">Sponsors</th>
                                            <th className="text-center px-3 py-2 font-medium">Classes Linked</th>
                                            <th className="text-right px-3 py-2 font-medium">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sponsorLevels.map(level => {
                                            const lvlSponsors = sponsorsByLevel[level.id] || [];
                                            const lvlRevenue = lvlSponsors.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
                                            const lvlClasses = lvlSponsors.reduce((sum, s) => sum + (s.linkedClassIds || []).length, 0);
                                            return (
                                                <tr key={level.id} className="border-b last:border-0">
                                                    <td className="px-3 py-2 font-medium">{level.name}</td>
                                                    <td className="px-3 py-2 text-right">${level.amount.toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-center">{lvlSponsors.length}</td>
                                                    <td className="px-3 py-2 text-center">{lvlClasses}</td>
                                                    <td className="px-3 py-2 text-right font-medium">${lvlRevenue.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted/30 font-semibold">
                                            <td className="px-3 py-2" colSpan={2}>Total</td>
                                            <td className="px-3 py-2 text-center">{sponsors.length}</td>
                                            <td className="px-3 py-2 text-center">{sponsors.reduce((sum, s) => sum + (s.linkedClassIds || []).length, 0)}</td>
                                            <td className="px-3 py-2 text-right">${totalSponsorshipRevenue.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

            </CardContent>
        </motion.div>
    );
};
