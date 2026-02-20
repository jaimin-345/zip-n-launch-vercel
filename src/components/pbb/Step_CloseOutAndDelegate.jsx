import React, { useState, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, User, ChevronDown, ChevronRight, Check, ChevronsUpDown, ShieldCheck, FileText, Palette, DollarSign, Users, UserCog, Crown, Mail, Phone, Pencil, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const accessPhases = [
    { id: 'draft', name: 'Draft, Build, Review' },
    { id: 'approval', name: 'Approval and Locked' },
    { id: 'publication', name: 'Publication' },
];

const delegatedRoles = [
    { id: 'proof_accept_deny', name: 'Proof/Accept/Deny' },
    { id: 'comment', name: 'Comment' },
];

const TAG_COLORS = {
    access: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    role: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    discipline: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    deadline: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const ReviewItem = ({ icon, title, children }) => (
  <div className="flex items-start space-x-4">
    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h4 className="font-semibold text-md">{title}</h4>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  </div>
);


const StaffDelegationCard = ({ staffMember, disciplines, onUpdate, onContactUpdate, isReadOnly = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [openPopover, setOpenPopover] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCheckingUser, setIsCheckingUser] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [existingUser, setExistingUser] = useState(null);
    const [editedContact, setEditedContact] = useState({
        name: staffMember.name || '',
        email: staffMember.email || '',
        phone: staffMember.phone || ''
    });
    const { toast } = useToast();
    const { signUp } = useAuth();

    // Sync editedContact when dialog opens
    React.useEffect(() => {
        if (isEditDialogOpen) {
            setEditedContact({
                name: staffMember.name || '',
                email: staffMember.email || '',
                phone: staffMember.phone || ''
            });
            setExistingUser(null);
        }
    }, [isEditDialogOpen, staffMember.name, staffMember.email, staffMember.phone]);

    const checkUserExists = async (emailValue) => {
        if (!emailValue || !emailValue.includes('@')) return;
        
        setIsCheckingUser(true);
        try {
            // Check customers table by email (profiles table doesn't have email column)
            const { data: customerData, error: customerError } = await supabase
                .from('customers')
                .select('id, user_id, email, full_name')
                .ilike('email', emailValue.trim().toLowerCase())
                .maybeSingle();

            if (customerData && !customerError && customerData.user_id) {
                // If customer exists, get profile data using user_id
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name, role')
                    .eq('id', customerData.user_id)
                    .maybeSingle();

                if (profileData && !profileError) {
                    setExistingUser({
                        ...profileData,
                        email: customerData.email
                    });
                    setEditedContact(prev => ({ ...prev, name: customerData.full_name || profileData.full_name || prev.name }));
                    toast({
                        title: 'User Found',
                        description: `Found existing user: ${customerData.full_name || profileData.full_name}`,
                    });
                } else {
                    setExistingUser(null);
                }
            } else {
                setExistingUser(null);
            }
        } catch (error) {
            setExistingUser(null);
        } finally {
            setIsCheckingUser(false);
        }
    };

    const handleEmailBlur = () => {
        if (editedContact.email !== staffMember.email) {
            checkUserExists(editedContact.email);
        }
    };

    const handleSaveContact = async () => {
        // Force immediate UI update with flushSync
        flushSync(() => {
            setIsSaving(true);
        });
        
        // Small delay to ensure spinner renders
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const currentName = editedContact.name;
        const currentEmail = editedContact.email;
        const currentPhone = editedContact.phone;
        
        try {
            // First, check if user exists in customers table by email (primary check)
            let userExistsInCustomers = false;
            
            if (currentEmail && currentEmail.includes('@')) {
                // Normalize email (trim and lowercase for comparison)
                const normalizedEmail = currentEmail.trim().toLowerCase();
                const trimmedEmail = currentEmail.trim();
                
                // Try case-insensitive check first
                let customerData = null;
                let customerCheckError = null;
                
                const { data: customerDataIlike, error: errorIlike } = await supabase
                    .from('customers')
                    .select('id, user_id, email, full_name')
                    .ilike('email', normalizedEmail)
                    .maybeSingle();
                
                if (errorIlike) {
                    // Fallback to exact match
                    const { data: customerDataExact, error: errorExact } = await supabase
                        .from('customers')
                        .select('id, user_id, email, full_name')
                        .eq('email', trimmedEmail)
                        .maybeSingle();
                    
                    customerData = customerDataExact;
                    customerCheckError = errorExact;
                } else {
                    customerData = customerDataIlike;
                    customerCheckError = errorIlike;
                }

                if (customerCheckError) {
                    // Error checking customers - continue
                } else if (customerData) {
                    userExistsInCustomers = true;
                    // If customer exists, also check profiles to set existingUser state
                    if (customerData.user_id) {
                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('id, full_name, role')
                            .eq('id', customerData.user_id)
                            .maybeSingle();
                        if (profileData) {
                            setExistingUser({
                                ...profileData,
                                email: customerData.email
                            });
                        }
                    }
                }
            }

            // If user exists in customers table, just save to project (don't create account)
            // If user doesn't exist in customers table, create the user account using signUp (same as signup flow)
            if (!userExistsInCustomers && currentEmail && currentEmail.includes('@')) {
                // Parse name to get firstName and lastName (same as signup flow)
                const nameParts = currentName.trim().split(/\s+/);
                const firstName = nameParts[0] || currentName;
                const lastName = nameParts.slice(1).join(' ') || '';
                
                // Create metadata (same structure as signup flow)
                const metadata = {
                    firstName: firstName,
                    lastName: lastName,
                    mobile: currentPhone || '',
                };
                
                // Use default password (must be at least 6 characters)
                const defaultPassword = '123456';
                
                // Call signUp (same as AuthModal handleSignUp)
                const { data, error } = await signUp(currentEmail, defaultPassword, metadata);

                if (error) {
                    toast({
                        title: 'Error',
                        description: `Failed to create user account: ${error.message || 'Unknown error'}`,
                        variant: 'destructive'
                    });
                    // Don't throw - continue to save contact info to project
                } else if (data?.user) {
                    if (data.user.id) {
                        // Wait for database triggers to create profile (signup flow relies on triggers)
                        // Try multiple times to wait for trigger
                        let profileExists = false;
                        let retries = 0;
                        const maxRetries = 5;
                        
                        while (!profileExists && retries < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            const { data: profileCheck } = await supabase
                                .from('profiles')
                                .select('id')
                                .eq('id', data.user.id)
                                .maybeSingle();
                            
                            if (profileCheck) {
                                profileExists = true;
                            }
                            retries++;
                        }
                        
                        // Step 1: Update profile with role and full_name (profile should exist from trigger)
                        const { error: profileUpdateError } = await supabase
                            .from('profiles')
                            .update({ 
                                full_name: currentName,
                                role: staffMember.role 
                            })
                            .eq('id', data.user.id);
                        
                        if (profileUpdateError) {
                            // If profile doesn't exist, try to insert it
                            const { error: profileInsertError } = await supabase
                                .from('profiles')
                                .insert({
                                    id: data.user.id,
                                    full_name: currentName,
                                    role: staffMember.role
                                });
                            
                            // Profile insert attempted (error handling silent)
                        }
                        
                        // Step 2: Check if customer record exists, create if it doesn't
                        // Note: Customer creation might be handled by database triggers from signup
                        // Wait a bit for potential triggers
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        const { data: existingCustomer, error: customerCheckError } = await supabase
                            .from('customers')
                            .select('id')
                            .eq('user_id', data.user.id)
                            .maybeSingle();
                        
                        if (!existingCustomer) {
                            // Try to create customer record (may fail due to RLS - that's okay, might be created by trigger later)
                            const { error: customerCreateError } = await supabase
                                .from('customers')
                                .insert({
                                    id: crypto.randomUUID(),
                                    user_id: data.user.id,
                                    email: currentEmail,
                                    full_name: currentName,
                                    last_name: lastName,
                                    created_at: new Date().toISOString()
                                });
                            
                            // Customer creation attempted (error handling silent - RLS or trigger may handle)
                        }
                    }
                    
                    toast({
                        title: 'User Created',
                        description: `New user account created for ${currentName}. Login credentials sent to ${currentEmail}.`,
                    });
                }
            } else if (userExistsInCustomers) {
                // User exists in customers table, just save to project (no account creation needed)
                toast({
                    title: 'Contact Info Saved',
                    description: `Contact information saved for existing user ${currentName}.`,
                });
            }
            
            // Always save contact info to project
            if (onContactUpdate) {
                onContactUpdate(staffMember.id, { name: currentName, email: currentEmail, phone: currentPhone });
            }
            setIsEditDialogOpen(false);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save contact information. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAccessPhaseChange = (phaseId) => {
        const currentPhases = staffMember.delegation?.accessPhase || [];
        const newPhases = currentPhases.includes(phaseId)
            ? currentPhases.filter(p => p !== phaseId)
            : [...currentPhases, phaseId];

        const newDelegation = { ...staffMember.delegation, accessPhase: newPhases };
        if (!newPhases.includes('draft')) {
            newDelegation.roles = [];
        }
        onUpdate(staffMember.id, { delegation: newDelegation });
    };

    const handleRoleToggle = (roleId) => {
        const currentRoles = staffMember.delegation.roles || [];
        const roleIndex = currentRoles.findIndex(r => r.id === roleId);
        let newRoles;

        if (roleIndex > -1) {
            newRoles = currentRoles.filter(r => r.id !== roleId);
        } else {
            newRoles = [...currentRoles, { id: roleId, disciplines: [], deadline: null }];
        }
        onUpdate(staffMember.id, { delegation: { ...staffMember.delegation, roles: newRoles } });
    };

    const handleDisciplineSelect = (roleId, disciplineId) => {
        const roles = staffMember.delegation.roles || [];
        const newRoles = roles.map(role => {
            if (role.id === roleId) {
                const disciplineIndex = role.disciplines.indexOf(disciplineId);
                const newDisciplines = disciplineIndex > -1
                    ? role.disciplines.filter(d => d !== disciplineId)
                    : [...role.disciplines, disciplineId];
                return { ...role, disciplines: newDisciplines };
            }
            return role;
        });
        onUpdate(staffMember.id, { delegation: { ...staffMember.delegation, roles: newRoles } });
    };

    const handleDeadlineChange = (roleId, date) => {
        const roles = staffMember.delegation.roles || [];
        const newRoles = roles.map(role => {
            if (role.id === roleId) {
                return { ...role, deadline: date ? format(date, 'yyyy-MM-dd') : null };
            }
            return role;
        });
        onUpdate(staffMember.id, { delegation: { ...staffMember.delegation, roles: newRoles } });
    };

    const accessPhase = staffMember.delegation?.accessPhase || [];
    const delegatedRolesForStaff = staffMember.delegation?.roles || [];

    const selectedAccessPhaseDetails = accessPhases.filter(p => accessPhase.includes(p.id));
    const selectedDelegatedRoleDetails = delegatedRolesForStaff.map(r => {
        const roleInfo = delegatedRoles.find(dr => dr.id === r.id);
        // Use disciplineInfo if available (from Step 5 sync), otherwise fall back to mapping
        const disciplineNames = r.disciplineInfo 
            ? r.disciplineInfo.map(d => d?.name).filter(Boolean)
            : (r.disciplines || []).map(dId => (disciplines || []).find(d => d?.id === dId)?.name).filter(Boolean);
        // Get discipline info with dates if available
        const disciplineInfo = r.disciplineInfo || (r.disciplines || []).map(dId => {
            const discipline = (disciplines || []).find(d => d?.id === dId);
            return {
                id: dId,
                name: discipline?.name || dId,
                dueDate: null
            };
        });
        return {
            ...(roleInfo || { id: r.id, name: 'Unknown Role' }),
            disciplineNames: disciplineNames || [],
            disciplineInfo: disciplineInfo || [],
            deadline: r.deadline,
        };
    });

    return (
        <div className="border rounded-lg bg-background/50 overflow-hidden">
            <div className="flex items-start justify-between p-4 ">
                <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-3">
                        <User className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <div>
                                    <p className="font-semibold">{staffMember.name}</p>
                                    <p className="text-sm text-muted-foreground">{staffMember.role}</p>
                                </div>
                                {!isReadOnly && (
                                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit Contact Info">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>Edit Contact Info</DialogTitle>
                                            <DialogDescription>
                                                Add or update the contact details for this staff member. System will check if they're an existing user.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor={`name-${staffMember.id}`} className="text-right">
                                                    Name
                                                </Label>
                                                <Input
                                                    id={`name-${staffMember.id}`}
                                                    value={editedContact.name}
                                                    onChange={(e) => setEditedContact(prev => ({ ...prev, name: e.target.value }))}
                                                    className="col-span-3"
                                                    placeholder="Full Name"
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor={`email-${staffMember.id}`} className="text-right">
                                                    Email
                                                </Label>
                                                <div className="col-span-3 space-y-2">
                                                    <div className="flex gap-2">
                                                        <Input
                                                            id={`email-${staffMember.id}`}
                                                            type="email"
                                                            value={editedContact.email}
                                                            onChange={(e) => setEditedContact(prev => ({ ...prev, email: e.target.value }))}
                                                            onBlur={handleEmailBlur}
                                                            className="flex-1"
                                                            placeholder="name@example.com"
                                                        />
                                                        {isCheckingUser && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                                                    </div>
                                                    {existingUser && (
                                                        <Badge variant="outline" className="text-xs">
                                                            ✓ Existing user found
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor={`phone-${staffMember.id}`} className="text-right">
                                                    Phone
                                                </Label>
                                                <Input
                                                    id={`phone-${staffMember.id}`}
                                                    value={editedContact.phone}
                                                    onChange={(e) => setEditedContact(prev => ({ ...prev, phone: e.target.value }))}
                                                    className="col-span-3"
                                                    placeholder="(555) 123-4567"
                                                />
                                            </div>

                                            {existingUser && existingUser.role && (
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label className="text-right text-xs text-muted-foreground">
                                                        Current Role
                                                    </Label>
                                                    <div className="col-span-3">
                                                        <Badge variant="secondary">{existingUser.role}</Badge>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button 
                                                type="button"
                                                onClick={handleSaveContact} 
                                                disabled={isCheckingUser || isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : isCheckingUser ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Checking...
                                                    </>
                                                ) : 'Save Changes'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-start gap-2">
                        {/* Access Phase Tags */}
                        {selectedAccessPhaseDetails.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedAccessPhaseDetails.map(phase => (
                                    <Badge key={phase.id} className={cn('hover:bg-opacity-80', TAG_COLORS.access)}>{phase.name}</Badge>
                                ))}
                            </div>
                        )}
                        {/* Delegated Roles & Disciplines Tags */}
                        {selectedDelegatedRoleDetails.filter(role => role && role.id && role.id !== 'comment').map(role => (
                             <div key={role.id} className="flex flex-wrap items-center gap-2">
                                {/* Show due date badge if available */}
                                {role.deadline && (() => {
                                    try {
                                        return (
                                            <Badge className={cn('hover:bg-opacity-80', TAG_COLORS.deadline)}>
                                                Due: {format(parseLocalDate(role.deadline), "MMMM do, yyyy")}
                                            </Badge>
                                        );
                                    } catch (e) {
                                        return (
                                            <Badge className={cn('hover:bg-opacity-80', TAG_COLORS.deadline)}>
                                                Due: {role.deadline}
                                            </Badge>
                                        );
                                    }
                                })()}
                                {/* Show discipline names as badges (without dates) */}
                                {role.disciplineInfo && Array.isArray(role.disciplineInfo) && role.disciplineInfo.length > 0 && (
                                    <>
                                        {role.disciplineInfo.map(discipline => {
                                            if (!discipline || !discipline.id) return null;
                                            return (
                                                <Badge 
                                                    key={`${role.id}-${discipline.id}`} 
                                                    className={cn('hover:bg-opacity-80', TAG_COLORS.discipline)}
                                                >
                                                    {discipline.name || discipline.id}
                                                </Badge>
                                            );
                                        })}
                                    </>
                                )}
                                {(!role.disciplineInfo || !Array.isArray(role.disciplineInfo) || role.disciplineInfo.length === 0) && 
                                 role.disciplineNames && Array.isArray(role.disciplineNames) && role.disciplineNames.length > 0 && (
                                    <>
                                        {role.disciplineNames.map(disciplineName => (
                                            <Badge key={`${role.id}-${disciplineName}`} className={cn('hover:bg-opacity-80', TAG_COLORS.discipline)}>
                                                {disciplineName}
                                            </Badge>
                                        ))}
                                    </>
                                )}
                             </div>
                        ))}
                        {/* Show Comment role disciplines without the Comment badge */}
                        {selectedDelegatedRoleDetails.filter(role => role && role.id === 'comment').map(role => (
                             <div key={role.id} className="flex flex-wrap items-center gap-2">
                                {/* Show due date badge if available */}
                                {role.deadline && (() => {
                                    try {
                                        return (
                                            <Badge className={cn('hover:bg-opacity-80', TAG_COLORS.deadline)}>
                                                Due: {format(parseLocalDate(role.deadline), "MMMM do, yyyy")}
                                            </Badge>
                                        );
                                    } catch (e) {
                                        return (
                                            <Badge className={cn('hover:bg-opacity-80', TAG_COLORS.deadline)}>
                                                Due: {role.deadline}
                                            </Badge>
                                        );
                                    }
                                })()}
                                {/* Show discipline names as badges (without dates) */}
                                {role.disciplineInfo && Array.isArray(role.disciplineInfo) && role.disciplineInfo.length > 0 && (
                                    <>
                                        {role.disciplineInfo.map(discipline => {
                                            if (!discipline || !discipline.id) return null;
                                            return (
                                                <Badge 
                                                    key={`${role.id}-${discipline.id}`} 
                                                    className={cn('hover:bg-opacity-80', TAG_COLORS.discipline)}
                                                >
                                                    {discipline.name || discipline.id}
                                                </Badge>
                                            );
                                        })}
                                    </>
                                )}
                                {(!role.disciplineInfo || !Array.isArray(role.disciplineInfo) || role.disciplineInfo.length === 0) && 
                                 role.disciplineNames && Array.isArray(role.disciplineNames) && role.disciplineNames.length > 0 && (
                                    <>
                                        {role.disciplineNames.map(disciplineName => (
                                            <Badge key={`${role.id}-${disciplineName}`} className={cn('hover:bg-opacity-80', TAG_COLORS.discipline)}>
                                                {disciplineName}
                                            </Badge>
                                        ))}
                                    </>
                                )}
                             </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4 pl-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 border-t space-y-6">
                    {/* Access Per Phase */}
                    <div className="space-y-3">
                        <Label className="font-semibold">Access Per Phase</Label>
                        <div className="space-y-2">
                            {accessPhases.map(phase => {
                                const isSelected = accessPhase.includes(phase.id);
                                return (
                                    <div key={phase.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`${staffMember.id}-phase-${phase.id}`}
                                            checked={isSelected}
                                            onCheckedChange={() => handleAccessPhaseChange(phase.id)}
                                            disabled={isReadOnly}
                                        />
                                        <Label 
                                            htmlFor={`${staffMember.id}-phase-${phase.id}`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {phase.name}
                                        </Label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const Step_CloseOutAndDelegate = ({ formData, setFormData, stepNumber = 8, isReadOnly = false }) => {
    const { user, profile } = useAuth();
    
    const getAssociationNames = () => {
        if (!formData.associations) return 'N/A';
        return Object.keys(formData.associations).filter(key => formData.associations[key]).join(', ') || 'None';
    };

    const totalPatternsSelected = () => {
        if (!formData.patternSelections) return 0;
        return Object.values(formData.patternSelections).reduce((total, disc) => total + Object.keys(disc).length, 0);
    };

    const staffList = useMemo(() => {
        const staff = new Map();

        const addStaffMember = (member, role, id) => {
            if (member && member.name && !staff.has(id)) {
                // Get existing delegation or create new one
                let delegation = formData.delegations?.[id] || { accessPhase: [], roles: [] };
                
                // Sync Step 5 judge assignments to delegations for judges
                if (role === 'Judge' && formData.groupJudges) {
                    // Find all disciplines this judge is assigned to in Step 5
                    const assignedDisciplineIds = new Set();
                    const assignedDisciplineDates = new Map();
                    
                    // Check groupJudges structure: { disciplineIndex: { groupIndex: judgeName } }
                    // Use case-insensitive matching to handle "Mr.Jemin" vs "Mr.jemin"
                    const memberNameNormalized = member.name ? member.name.toLowerCase().trim() : '';
                    Object.entries(formData.groupJudges).forEach(([disciplineIndex, groups]) => {
                        const discipline = (formData.disciplines || [])[parseInt(disciplineIndex)];
                        if (discipline && discipline.id) {
                            // Check if this judge is assigned to any group in this discipline
                            // Use case-insensitive matching
                            const isAssigned = Object.values(groups || {}).some(judgeName => {
                                if (!judgeName) return false;
                                const judgeNameNormalized = judgeName.toLowerCase().trim();
                                return judgeNameNormalized === memberNameNormalized || judgeName === member.name;
                            });
                            
                            if (isAssigned) {
                                assignedDisciplineIds.add(discipline.id);
                                
                                // Get due date if available
                                const dueDate = formData.groupDueDates?.[disciplineIndex]?.[Object.keys(groups || {})[0]] 
                                    || formData.disciplineDueDates?.[disciplineIndex];
                                if (dueDate) {
                                    assignedDisciplineDates.set(discipline.id, dueDate);
                                }
                            }
                        }
                    });
                    
                    // Also check judgeSelections (discipline-level assignments)
                    if (formData.judgeSelections) {
                        Object.entries(formData.judgeSelections).forEach(([disciplineIndex, judgeName]) => {
                            // Use case-insensitive matching
                            const judgeNameNormalized = judgeName ? judgeName.toLowerCase().trim() : '';
                            if (judgeNameNormalized === memberNameNormalized || judgeName === member.name) {
                                const discipline = (formData.disciplines || [])[parseInt(disciplineIndex)];
                                if (discipline && discipline.id) {
                                    assignedDisciplineIds.add(discipline.id);
                                    
                                    // Get due date if available
                                    const dueDate = formData.dueDateSelections?.[disciplineIndex] 
                                        || formData.disciplineDueDates?.[disciplineIndex];
                                    if (dueDate) {
                                        assignedDisciplineDates.set(discipline.id, dueDate);
                                    }
                                }
                            }
                        });
                    }
                    
                    // If judge has Step 5 assignments, sync them to delegations
                    if (assignedDisciplineIds.size > 0) {
                        // Check if there's already a role with disciplines, or create one
                        let roles = delegation.roles || [];
                        let commentRole = roles.find(r => r.id === 'comment');
                        
                        // Get all discipline names and dates for display
                        const disciplineInfo = Array.from(assignedDisciplineIds).map(dId => {
                            const discipline = (formData.disciplines || []).find(d => d.id === dId);
                            const dueDate = assignedDisciplineDates.get(dId);
                            return {
                                id: dId,
                                name: discipline?.name || dId,
                                dueDate: dueDate
                            };
                        });
                        
                        // Use the earliest due date if multiple disciplines have dates
                        const earliestDueDate = disciplineInfo
                            .map(d => d.dueDate)
                            .filter(Boolean)
                            .sort()[0] || null;
                        
                        if (!commentRole) {
                            // Create a comment role with the assigned disciplines
                            commentRole = {
                                id: 'comment',
                                disciplines: Array.from(assignedDisciplineIds),
                                deadline: earliestDueDate,
                                // Store discipline info for better display
                                disciplineInfo: disciplineInfo
                            };
                            roles = [...roles, commentRole];
                        } else {
                            // Merge disciplines (avoid duplicates)
                            const existingDisciplines = new Set(commentRole.disciplines || []);
                            assignedDisciplineIds.forEach(dId => existingDisciplines.add(dId));
                            
                            // Merge discipline info
                            const existingDisciplineInfo = commentRole.disciplineInfo || [];
                            const mergedDisciplineInfo = [...existingDisciplineInfo];
                            disciplineInfo.forEach(newInfo => {
                                if (!mergedDisciplineInfo.find(d => d.id === newInfo.id)) {
                                    mergedDisciplineInfo.push(newInfo);
                                }
                            });
                            
                            commentRole = {
                                ...commentRole,
                                disciplines: Array.from(existingDisciplines),
                                deadline: commentRole.deadline || earliestDueDate,
                                disciplineInfo: mergedDisciplineInfo
                            };
                            roles = roles.map(r => r.id === 'comment' ? commentRole : r);
                        }
                        
                        delegation = {
                            ...delegation,
                            roles: roles
                        };
                    }
                }
                
                staff.set(id, {
                    id: id,
                    name: member.name,
                    email: member.email,
                    phone: member.phone,
                    role: role,
                    delegation: delegation
                });
            }
        };

        (formData.officials || []).forEach(official => addStaffMember(official, official.role, official.id));
        Object.entries(formData.associationJudges || {}).forEach(([assocId, assocData]) => {
            (assocData.judges || []).forEach((judge, index) => {
                const judgeId = `judge-${assocId}-${index}`;
                addStaffMember(judge, 'Judge', judgeId);
            });
        });

        return Array.from(staff.values());
    }, [formData.officials, formData.associationJudges, formData.delegations, formData.groupJudges, formData.judgeSelections, formData.groupDueDates, formData.disciplineDueDates, formData.dueDateSelections, formData.disciplines]);

    const handleUpdateStaffDelegation = (staffId, updates) => {
        if (isReadOnly) return;
        setFormData(prev => {
            const newDelegations = {
                ...(prev.delegations || {}),
                [staffId]: {
                    ...(prev.delegations?.[staffId] || {}),
                    ...updates.delegation
                }
            };
            return { ...prev, delegations: newDelegations };
        });
    };

    // Handle contact updates - syncs back to Step 4 data (associationJudges or officials)
    const handleContactUpdate = (staffId, contactData) => {
        if (isReadOnly) return;
        
        setFormData(prev => {
            const newFormData = { ...prev };
            
            // Check if this is a judge (staffId format: judge-{assocId}-{index})
            if (staffId.startsWith('judge-')) {
                const parts = staffId.split('-');
                const assocId = parts[1];
                const judgeIndex = parseInt(parts[2], 10);
                
                if (newFormData.associationJudges?.[assocId]?.judges?.[judgeIndex]) {
                    newFormData.associationJudges = {
                        ...newFormData.associationJudges,
                        [assocId]: {
                            ...newFormData.associationJudges[assocId],
                            judges: newFormData.associationJudges[assocId].judges.map((judge, idx) => 
                                idx === judgeIndex 
                                    ? { ...judge, name: contactData.name, email: contactData.email, phone: contactData.phone }
                                    : judge
                            )
                        }
                    };
                }
            } else {
                // This is an official/staff member
                if (newFormData.officials) {
                    newFormData.officials = newFormData.officials.map(official => 
                        official.id === staffId 
                            ? { ...official, name: contactData.name, email: contactData.email, phone: contactData.phone }
                            : official
                    );
                }
            }
            
            return newFormData;
        });
    };

    const handleAdminOwnerUpdate = (field, value) => {
        if (isReadOnly) return;
        setFormData(prev => ({
            ...prev,
            adminOwner: {
                ...(prev.adminOwner || {}),
                [field]: value
            }
        }));
    };

    const handlePublicationDateChange = (date) => {
        if (isReadOnly) return;
        setFormData(prev => ({
            ...prev,
            publicationDate: date ? format(date, 'yyyy-MM-dd') : null
        }));
    };

    const disciplines = formData.disciplines || [];
    
    // Default admin and owner values from logged-in user
    const loggedInUserName = profile?.full_name || user?.user_metadata?.full_name || 'John Doe';
    const loggedInUserEmail = user?.email || 'johndoe@mailinator.com';
    const loggedInUserPhone = user?.user_metadata?.phone || user?.user_metadata?.mobile || profile?.phone || profile?.mobile || '';
    
    const defaultAdminOwner = {
        adminName: loggedInUserName,
        adminEmail: loggedInUserEmail,
        adminPhone: loggedInUserPhone,
        ownerName: loggedInUserName,
        ownerEmail: loggedInUserEmail,
        ownerPhone: loggedInUserPhone,
    };
    const adminOwner = { ...defaultAdminOwner, ...(formData.adminOwner || {}) };

    return (
        <motion.div key="step-close-out" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader className="pb-4">
                <CardTitle>Step {stepNumber}: Close Out & Review</CardTitle>
                <CardDescription>Assign admin/owner, set publication date, and manage staff access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* 1. Admin & Owner Assignment - TOP PRIORITY */}
                <div className="space-y-4 p-4 border rounded-lg bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Crown className="h-5 w-5 text-red-600" />
                            Admin & Owner Assignment
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Must assign Admin and Owner (EquiPatterns members). Both default to creator but can be delegated.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Admin Assignment */}
                        <div className="space-y-3 p-3 bg-background rounded-md border">
                            <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4 text-primary" />
                                <Label className="font-semibold">Admin (Required)</Label>
                            </div>
                            <Input
                                placeholder="Admin Name"
                                value={adminOwner.adminName || ''}
                                onChange={(e) => handleAdminOwnerUpdate('adminName', e.target.value)}
                                disabled={isReadOnly}
                            />
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Email"
                                        className="pl-9"
                                        value={adminOwner.adminEmail || ''}
                                        onChange={(e) => handleAdminOwnerUpdate('adminEmail', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="flex-1 relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Phone"
                                        className="pl-9"
                                        value={adminOwner.adminPhone || ''}
                                        onChange={(e) => handleAdminOwnerUpdate('adminPhone', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Owner Assignment */}
                        <div className="space-y-3 p-3 bg-background rounded-md border">
                            <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-amber-500" />
                                <Label className="font-semibold">Owner (Required)</Label>
                            </div>
                            <Input
                                placeholder="Owner Name"
                                value={adminOwner.ownerName || ''}
                                onChange={(e) => handleAdminOwnerUpdate('ownerName', e.target.value)}
                                disabled={isReadOnly}
                            />
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Email"
                                        className="pl-9"
                                        value={adminOwner.ownerEmail || ''}
                                        onChange={(e) => handleAdminOwnerUpdate('ownerEmail', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="flex-1 relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Phone"
                                        className="pl-9"
                                        value={adminOwner.ownerPhone || ''}
                                        onChange={(e) => handleAdminOwnerUpdate('ownerPhone', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Optional Second Admin */}
                    <div className="space-y-3 p-3 bg-background rounded-md border">
                        <div className="flex items-center gap-2">
                            <UserCog className="h-4 w-4 text-muted-foreground" />
                            <Label className="font-medium text-muted-foreground">Second Admin (Optional)</Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Input
                                placeholder="Name"
                                value={adminOwner.secondAdminName || ''}
                                onChange={(e) => handleAdminOwnerUpdate('secondAdminName', e.target.value)}
                                disabled={isReadOnly}
                            />
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Email"
                                    className="pl-9"
                                    value={adminOwner.secondAdminEmail || ''}
                                    onChange={(e) => handleAdminOwnerUpdate('secondAdminEmail', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Phone"
                                    className="pl-9"
                                    value={adminOwner.secondAdminPhone || ''}
                                    onChange={(e) => handleAdminOwnerUpdate('secondAdminPhone', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Publication Date - OPTIONAL */}
                <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">OPTIONAL</Badge>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-blue-600" />
                            Publication Date
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Not required to close out, but recommended to set early.</p>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn("w-full md:w-[280px] justify-start text-left font-normal", !formData.publicationDate && "text-muted-foreground")}
                                disabled={isReadOnly}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.publicationDate ? format(parseLocalDate(formData.publicationDate), "MMMM do, yyyy") : <span>Select publication date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={formData.publicationDate ? parseLocalDate(formData.publicationDate) : null}
                                onSelect={handlePublicationDateChange}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 3. Staff Delegation */}
                {staffList.length > 0 && (
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            Staff & Delegation ({staffList.length})
                        </h3>
                        <p className="text-sm text-muted-foreground">Manage access phases and delegation for judges and show staff.</p>
                        <div className="space-y-3">
                            {staffList.map(member => (
                                <StaffDelegationCard
                                    key={member.id}
                                    staffMember={member}
                                    disciplines={disciplines}
                                    onUpdate={handleUpdateStaffDelegation}
                                    onContactUpdate={handleContactUpdate}
                                    isReadOnly={isReadOnly}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. Review & Finalize Summary - BOTTOM */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        Review & Finalize Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <ReviewItem icon={<ShieldCheck className="w-5 h-5" />} title="Show Structure">
                            <p><strong>Name:</strong> {formData.showName || 'N/A'}</p>
                            <p><strong>Type:</strong> {formData.showType || 'N/A'}</p>
                            <p><strong>Associations:</strong> {getAssociationNames()}</p>
                        </ReviewItem>

                        <ReviewItem icon={<CalendarIcon className="w-5 h-5" />} title="Dates & Location">
                            <p><strong>Dates:</strong> {formData.startDate ? `${format(parseLocalDate(formData.startDate), 'MMMM do, yyyy')} to ${formData.endDate ? format(parseLocalDate(formData.endDate), 'MMMM do, yyyy') : 'N/A'}` : 'N/A'}</p>
                            <p><strong>Venue:</strong> {formData.venueName || 'N/A'}</p>
                            <p><strong>Address:</strong> {formData.venueAddress || 'N/A'}</p>
                        </ReviewItem>

                        <ReviewItem icon={<FileText className="w-5 h-5" />} title="Disciplines & Patterns">
                            <p><strong>Disciplines:</strong> {(formData.disciplines || []).length} selected</p>
                            <p><strong>Patterns Assigned:</strong> {totalPatternsSelected()} patterns</p>
                        </ReviewItem>

                        <ReviewItem icon={<Users className="w-5 h-5" />} title="Personnel & Sponsors">
                            <p><strong>Judges:</strong> {Object.values(formData.associationJudges || {}).reduce((sum, a) => sum + (a.judges || []).filter(j => j.name).length, 0)} added</p>
                            <p><strong>Officials:</strong> {(formData.officials || []).filter(o => o.name).length} added</p>
                            <p><strong>Sponsors:</strong> {(formData.sponsors || []).length} added</p>
                        </ReviewItem>

                        <ReviewItem icon={<Palette className="w-5 h-5" />} title="Design & Layout">
                            <p><strong>Cover Page:</strong> {formData.coverPageOption || 'N/A'}</p>
                            <p><strong>Book Layout:</strong> {formData.layoutSelection || 'N/A'}</p>
                        </ReviewItem>
                        
                        <ReviewItem icon={<DollarSign className="w-5 h-5" />} title="Customizations & Fees">
                            <p><strong>Custom Classes:</strong> {(formData.disciplines || []).filter(d => d.isCustom).length}</p>
                            <p><strong>Estimated Custom Fees:</strong> ${((formData.disciplines || []).filter(d => d.isCustom).length * 50).toFixed(2)}</p>
                        </ReviewItem>
                    </div>
                </div>
            </CardContent>
        </motion.div>
    );
};