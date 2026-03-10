import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';
import { Calendar as CalendarIcon, Plus, Trash2, User, Users, PlusCircle, Copy, ChevronDown } from 'lucide-react';
import { staffRoles, associationStaffing, roleGroups } from '@/lib/staffingData';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

// ─── Role Icon ───────────────────────────────────────────────────
const RoleIcon = ({ roleId }) => {
    const role = staffRoles[roleId];
    if (!role || !role.icon) return <User className="h-5 w-5 text-muted-foreground" />;
    const IconComponent = role.icon;
    return <IconComponent className="h-5 w-5 text-muted-foreground" />;
};

// ─── Staff Member Row ────────────────────────────────────────────
const StaffMemberRow = ({ member, roleId, associationId, onUpdate, onRemove }) => {
    const isCustom = roleId === 'CUSTOM';

    return (
        <div className="flex items-center gap-2 pl-7">
            {isCustom && (
                <Input
                    value={member.custom_role_name || ''}
                    onChange={(e) => onUpdate(member.id, associationId, roleId, 'custom_role_name', e.target.value)}
                    placeholder="Role name"
                    className="max-w-[160px] text-sm"
                />
            )}
            <Input
                value={member.name || ''}
                onChange={(e) => onUpdate(member.id, associationId, roleId, 'name', e.target.value)}
                placeholder="Name"
                className="text-sm"
            />
            <Input
                value={member.email || ''}
                onChange={(e) => onUpdate(member.id, associationId, roleId, 'email', e.target.value)}
                placeholder="Email"
                type="email"
                className="text-sm hidden md:block"
            />
            <Input
                value={member.phone || ''}
                onChange={(e) => onUpdate(member.id, associationId, roleId, 'phone', e.target.value)}
                placeholder="Phone"
                type="tel"
                className="text-sm hidden md:block"
            />
            <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(member.id, associationId, roleId)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" title="Show contact fields">
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

// ─── Staff Role Section ──────────────────────────────────────────
const StaffRoleSection = ({ roleId, staff, associationId, onAdd, onUpdate, onRemove }) => {
    const role = staffRoles[roleId];
    if (!role) return null;
    const roleName = role.name;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <RoleIcon roleId={roleId} />
                    <h4 className="font-medium text-sm">{roleName}</h4>
                </div>
                <Button size="sm" variant="outline" onClick={() => onAdd(associationId, roleId)}>
                    <Plus className="h-4 w-4 mr-1" /> Add {roleName}
                </Button>
            </div>
            {staff.map(member => (
                <StaffMemberRow
                    key={member.id}
                    member={member}
                    roleId={roleId}
                    associationId={associationId}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
};

// ─── Officials & Staff Section ───────────────────────────────────
const OfficialsStaffSection = ({ formData, setFormData }) => {
    const { toast } = useToast();
    const [associationsData, setAssociationsData] = useState([]);

    const selectedAssociationIds = useMemo(() =>
        Object.keys(formData.associations || {}).filter(id => formData.associations[id]),
        [formData.associations]
    );
    const primaryAffiliates = formData.primaryAffiliates || [];

    useEffect(() => {
        const fetchAssociations = async () => {
            const { data, error } = await supabase.from('associations').select('*');
            if (error) {
                toast({ title: 'Error', description: error.message, variant: 'destructive' });
            } else {
                setAssociationsData(data || []);
            }
        };
        fetchAssociations();
    }, [toast]);

    const officials = (formData.showDetails?.officials) || {};

    const getAssociationName = (id) => {
        if (id === 'default') return 'General';
        const assocData = associationsData.find(a => a.id === id);
        return assocData?.name || id;
    };

    const handleAddStaff = (assocId, roleId) => {
        setFormData(prev => {
            const currentDetails = prev.showDetails || {};
            const newOfficials = JSON.parse(JSON.stringify(currentDetails.officials || {}));
            if (!newOfficials[assocId]) newOfficials[assocId] = {};
            if (!newOfficials[assocId][roleId]) newOfficials[assocId][roleId] = [];

            const newMember = {
                id: uuidv4(),
                association_id: assocId,
                role_id: roleId,
                name: '',
                email: '',
                phone: '',
                ...(roleId === 'CUSTOM' && { custom_role_name: '' }),
            };
            newOfficials[assocId][roleId].push(newMember);
            return { ...prev, showDetails: { ...currentDetails, officials: newOfficials } };
        });
    };

    const handleUpdateStaff = (memberId, assocId, roleId, field, value) => {
        setFormData(prev => {
            const currentDetails = prev.showDetails || {};
            const newOfficials = JSON.parse(JSON.stringify(currentDetails.officials || {}));
            if (newOfficials[assocId]?.[roleId]) {
                const idx = newOfficials[assocId][roleId].findIndex(m => m.id === memberId);
                if (idx > -1) {
                    newOfficials[assocId][roleId][idx][field] = value;
                }
            }
            return { ...prev, showDetails: { ...currentDetails, officials: newOfficials } };
        });
    };

    const handleRemoveStaff = (memberId, assocId, roleId) => {
        setFormData(prev => {
            const currentDetails = prev.showDetails || {};
            const newOfficials = JSON.parse(JSON.stringify(currentDetails.officials || {}));
            if (newOfficials[assocId]?.[roleId]) {
                newOfficials[assocId][roleId] = newOfficials[assocId][roleId].filter(m => m.id !== memberId);
            }
            return { ...prev, showDetails: { ...currentDetails, officials: newOfficials } };
        });
    };

    const handleSyncStaff = (targetAssocId) => {
        const primaryAssocId = primaryAffiliates[0];
        if (!primaryAssocId || primaryAssocId === targetAssocId) return;
        const primaryStaff = officials[primaryAssocId];
        if (!primaryStaff) return;

        setFormData(prev => {
            const currentDetails = prev.showDetails || {};
            const newOfficials = JSON.parse(JSON.stringify(currentDetails.officials || {}));
            newOfficials[targetAssocId] = JSON.parse(JSON.stringify(newOfficials[targetAssocId] || {}));

            for (const roleId in primaryStaff) {
                if (!newOfficials[targetAssocId][roleId]) {
                    newOfficials[targetAssocId][roleId] = [];
                }
                const syncedMembers = primaryStaff[roleId].map(member => ({
                    id: uuidv4(),
                    association_id: targetAssocId,
                    role_id: roleId,
                    name: member.name || '',
                    email: member.email || '',
                    phone: member.phone || '',
                    ...(roleId === 'CUSTOM' && { custom_role_name: member.custom_role_name || '' }),
                }));
                newOfficials[targetAssocId][roleId].push(...syncedMembers);
            }
            return { ...prev, showDetails: { ...currentDetails, officials: newOfficials } };
        });
        toast({ title: 'Staff Synced', description: `Synced staff from ${getAssociationName(primaryAssocId)}.` });
    };

    // Build association-specific role lists
    const associationRoles = useMemo(() => {
        const roles = {};
        const assocList = selectedAssociationIds.length > 0 ? selectedAssociationIds : ['default'];
        assocList.forEach(assocId => {
            const staffingConfig = associationStaffing[assocId] || associationStaffing['default'];
            roles[assocId] = [...new Set([...(staffingConfig.core || []), ...(staffingConfig.specialized || [])])];
        });
        return roles;
    }, [selectedAssociationIds]);

    // Group roles by category
    const groupedRoles = useMemo(() => {
        const groups = {};
        Object.entries(roleGroups)
            .sort(([, a], [, b]) => a.order - b.order)
            .forEach(([key, value]) => {
                if (key !== 'custom') {
                    groups[key] = { ...value, roles: [] };
                }
            });
        Object.keys(staffRoles).forEach(roleId => {
            const role = staffRoles[roleId];
            if (role.group && groups[role.group]) {
                groups[role.group].roles.push(roleId);
            }
        });
        return groups;
    }, []);

    const sortedAssociations = useMemo(() => {
        const uniqueAssociations = [...new Set(selectedAssociationIds)];
        if (uniqueAssociations.length === 0) return ['default'];
        return uniqueAssociations.sort((a, b) => {
            const aIsPrimary = primaryAffiliates.includes(a);
            const bIsPrimary = primaryAffiliates.includes(b);
            if (aIsPrimary && !bIsPrimary) return -1;
            if (!aIsPrimary && bIsPrimary) return 1;
            return 0;
        });
    }, [selectedAssociationIds, primaryAffiliates]);

    const hasPrimary = primaryAffiliates.length > 0;
    const primaryAssocId = hasPrimary ? primaryAffiliates[0] : null;

    return (
        <Accordion type="multiple" defaultValue={sortedAssociations} className="w-full space-y-4">
            {sortedAssociations.map((assocId) => {
                const rolesForAssoc = associationRoles[assocId];
                if (!rolesForAssoc) return null;
                const isPrimary = primaryAffiliates.includes(assocId);
                const staffCount = Object.values(officials[assocId] || {}).reduce((sum, arr) => sum + arr.length, 0);

                return (
                    <AccordionItem key={assocId} value={assocId} className="border rounded-lg bg-background/50">
                        <AccordionTrigger className="px-4 py-3 text-lg font-semibold hover:no-underline">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    {getAssociationName(assocId)} Staff
                                    {isPrimary && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md">Primary</span>}
                                </div>
                                {staffCount > 0 && (
                                    <span className="text-xs font-medium text-muted-foreground mr-2">
                                        {staffCount} member{staffCount !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0 space-y-6">
                            {!isPrimary && hasPrimary && (
                                <div className="flex justify-end -mt-4 mb-4">
                                    <Button variant="outline" size="sm" onClick={() => handleSyncStaff(assocId)}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Sync Staff from {getAssociationName(primaryAssocId)}
                                    </Button>
                                </div>
                            )}
                            {Object.values(groupedRoles).map(group => {
                                const relevantRoles = group.roles.filter(roleId => rolesForAssoc.includes(roleId));
                                if (relevantRoles.length === 0) return null;

                                return (
                                    <div key={group.name} className="pt-4">
                                        <h3 className="text-md font-semibold mb-3 border-b pb-2">{group.name}</h3>
                                        <div className="space-y-4">
                                            {relevantRoles.map(roleId => (
                                                <StaffRoleSection
                                                    key={roleId}
                                                    roleId={roleId}
                                                    staff={(officials[assocId]?.[roleId]) || []}
                                                    associationId={assocId}
                                                    onAdd={handleAddStaff}
                                                    onUpdate={handleUpdateStaff}
                                                    onRemove={handleRemoveStaff}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Add Custom Role */}
                            <div className="pt-6 text-center">
                                <Button variant="outline" onClick={() => handleAddStaff(assocId, 'CUSTOM')}>
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Add Custom Role
                                </Button>
                            </div>
                            {/* Custom Roles List */}
                            {officials[assocId]?.['CUSTOM'] && officials[assocId]['CUSTOM'].length > 0 && (
                                <div className="pt-4">
                                    <h3 className="text-md font-semibold mb-3 border-b pb-2">{roleGroups.custom.name}</h3>
                                    <div className="space-y-2">
                                        {officials[assocId]['CUSTOM'].map(member => (
                                            <StaffMemberRow
                                                key={member.id}
                                                member={member}
                                                roleId="CUSTOM"
                                                associationId={assocId}
                                                onUpdate={handleUpdateStaff}
                                                onRemove={handleRemoveStaff}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
};

// ─── Main Component ──────────────────────────────────────────────
export const Step4_ShowDetails = ({ formData, setFormData }) => {
    const handleUpdate = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleDateChange = (field, date) => {
        if (date) {
            handleUpdate(field, format(date, 'yyyy-MM-dd'));
        }
    };

    return (
        <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>Step 4: Show Details</CardTitle>
                <CardDescription>Enter essential information, define venues, and assign staff for your event. This will be used to populate your show bill and configure the schedule builder.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-lg font-semibold">Event Information</AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="showName">Show Name</Label>
                                    <Input id="showName" value={formData.showName || ''} onChange={(e) => handleUpdate('showName', e.target.value)} placeholder="E.g., Summer Sizzler" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Start Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn("w-full justify-start text-left font-normal", !formData.startDate && "text-muted-foreground")}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {formData.startDate ? format(parseLocalDate(formData.startDate), "MMMM do, yyyy") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.startDate ? parseLocalDate(formData.startDate) : undefined}
                                                    onSelect={(date) => handleDateChange('startDate', date)}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div>
                                        <Label>End Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn("w-full justify-start text-left font-normal", !formData.endDate && "text-muted-foreground")}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {formData.endDate ? format(parseLocalDate(formData.endDate), "MMMM do, yyyy") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.endDate ? parseLocalDate(formData.endDate) : undefined}
                                                    onSelect={(date) => handleDateChange('endDate', date)}
                                                    disabled={{ before: formData.startDate ? parseLocalDate(formData.startDate) : undefined }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="venueName">Venue Name</Label>
                                    <Input id="venueName" value={formData.venueName || ''} onChange={(e) => handleUpdate('venueName', e.target.value)} placeholder="E.g., Grand Oak Arena" />
                                </div>
                                <div>
                                    <Label htmlFor="venueAddress">Venue Address</Label>
                                    <Input id="venueAddress" value={formData.venueAddress || ''} onChange={(e) => handleUpdate('venueAddress', e.target.value)} placeholder="E.g., 123 Stable Rd, City, State" />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger className="text-lg font-semibold">Officials & Staff</AccordionTrigger>
                        <AccordionContent className="pt-4">
                            <OfficialsStaffSection
                                formData={formData}
                                setFormData={setFormData}
                            />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </motion.div>
    );
};
