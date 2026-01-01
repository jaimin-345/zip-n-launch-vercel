import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, User, ChevronDown, ChevronRight, Check, ChevronsUpDown, ShieldCheck, FileText, Palette, DollarSign, Users, UserCog, Crown, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/SupabaseAuthContext';

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


const StaffDelegationCard = ({ staffMember, disciplines, onUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [openPopover, setOpenPopover] = useState(null);

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
        const disciplineNames = r.disciplines.map(dId => disciplines.find(d => d.id === dId)?.name).filter(Boolean);
        return {
            ...roleInfo,
            disciplineNames,
            deadline: r.deadline,
        };
    });

    return (
        <div className="border rounded-lg bg-background/50 overflow-hidden">
            <div className="flex items-start justify-between p-4 ">
                <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-3">
                        <User className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-semibold">{staffMember.name}</p>
                            <p className="text-sm text-muted-foreground">{staffMember.role}</p>
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
                        {selectedDelegatedRoleDetails.map(role => (
                             <div key={role.id} className="flex flex-col items-start gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={cn('hover:bg-opacity-80', TAG_COLORS.role)}>
                                        {role.name}
                                    </Badge>
                                    {role.deadline && (
                                        <Badge className={cn('hover:bg-opacity-80', TAG_COLORS.deadline)}>
                                            Due: {format(new Date(role.deadline), "PPP")}
                                        </Badge>
                                    )}
                                </div>
                                {role.disciplineNames.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pl-4">
                                        {role.disciplineNames.map(disciplineName => (
                                            <Badge key={`${role.id}-${disciplineName}`} className={cn('hover:bg-opacity-80', TAG_COLORS.discipline)}>
                                                {disciplineName}
                                            </Badge>
                                        ))}
                                    </div>
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

                    {/* Delegate Roles - Conditional */}
                    {/* {accessPhase.includes('draft') && (
                        <div className="space-y-4 p-4 border rounded-md bg-background">
                            <h4 className="font-semibold">Delegate Roles</h4>
                            {delegatedRoles.map(role => {
                                const isSelected = delegatedRolesForStaff.some(r => r.id === role.id);
                                const roleData = delegatedRolesForStaff.find(r => r.id === role.id);

                                return (
                                    <div key={role.id} className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`${staffMember.id}-${role.id}`}
                                                checked={isSelected}
                                                onChange={() => handleRoleToggle(role.id)}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <Label htmlFor={`${staffMember.id}-${role.id}`} className="font-medium">{role.name}</Label>
                                        </div>

                                        {isSelected && roleData && (
                                            <div className="pl-6 space-y-3">
                                                <Popover open={openPopover === role.id} onOpenChange={(isOpen) => setOpenPopover(isOpen ? role.id : null)}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start">
                                                            <ChevronsUpDown className="mr-2 h-4 w-4" />
                                                            Select Disciplines
                                                            {roleData.disciplines.length > 0 && (
                                                                <Badge variant="secondary" className="ml-auto">{roleData.disciplines.length} selected</Badge>
                                                            )}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Search disciplines..." />
                                                            <CommandList>
                                                                <CommandEmpty>No disciplines found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {disciplines.map(disc => {
                                                                        const isDisciplineSelected = roleData.disciplines.includes(disc.id);
                                                                        return (
                                                                            <CommandItem key={disc.id} onSelect={() => handleDisciplineSelect(role.id, disc.id)}>
                                                                                <Check className={cn("mr-2 h-4 w-4", isDisciplineSelected ? "opacity-100" : "opacity-0")} />
                                                                                <span>{disc.name}</span>
                                                                            </CommandItem>
                                                                        );
                                                                    })}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>

                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !roleData.deadline && "text-muted-foreground")}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {roleData.deadline ? format(new Date(roleData.deadline), "PPP") : <span>Set Deadline (Optional)</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={roleData.deadline ? new Date(roleData.deadline) : null} onSelect={(date) => handleDeadlineChange(role.id, date)} initialFocus /></PopoverContent>
                                                </Popover>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )} */}
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
                    Object.entries(formData.groupJudges).forEach(([disciplineIndex, groups]) => {
                        const discipline = (formData.disciplines || [])[parseInt(disciplineIndex)];
                        if (discipline && discipline.id) {
                            // Check if this judge is assigned to any group in this discipline
                            const isAssigned = Object.values(groups || {}).some(judgeName => 
                                judgeName === member.name
                            );
                            
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
                            if (judgeName === member.name) {
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
                        
                        if (!commentRole) {
                            // Create a comment role with the assigned disciplines
                            commentRole = {
                                id: 'comment',
                                disciplines: Array.from(assignedDisciplineIds),
                                deadline: assignedDisciplineDates.size > 0 
                                    ? Array.from(assignedDisciplineDates.values())[0] 
                                    : null
                            };
                            roles = [...roles, commentRole];
                        } else {
                            // Merge disciplines (avoid duplicates)
                            const existingDisciplines = new Set(commentRole.disciplines || []);
                            assignedDisciplineIds.forEach(dId => existingDisciplines.add(dId));
                            commentRole = {
                                ...commentRole,
                                disciplines: Array.from(existingDisciplines),
                                deadline: commentRole.deadline || (assignedDisciplineDates.size > 0 
                                    ? Array.from(assignedDisciplineDates.values())[0] 
                                    : null)
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
    
    const defaultAdminOwner = {
        adminName: loggedInUserName,
        adminEmail: loggedInUserEmail,
        ownerName: loggedInUserName,
        ownerEmail: loggedInUserEmail,
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
                                {formData.publicationDate ? format(new Date(formData.publicationDate), "PPP") : <span>Select publication date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={formData.publicationDate ? new Date(formData.publicationDate) : null}
                                onSelect={handlePublicationDateChange}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 3. Staff Access & Delegation */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Staff Access & Delegation
                    </h3>
                    <p className="text-sm text-muted-foreground">Manage staff members' access rights and delegation settings.</p>
                    {staffList.length > 0 ? (
                        staffList.map(staff => (
                            <StaffDelegationCard
                                key={staff.id}
                                staffMember={staff}
                                disciplines={disciplines}
                                onUpdate={handleUpdateStaffDelegation}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">No staff members found.</p>
                            <p className="text-sm text-muted-foreground mt-1">Go back to Step 4 to add judges and staff.</p>
                        </div>
                    )}
                </div>

                {/* 4. Review & Finalize Summary - BOTTOM */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        Review & Finalize Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <ReviewItem icon={<ShieldCheck className="w-5 h-5" />} title="Show Information">
                            <p><strong>Name:</strong> {formData.showName || 'N/A'}</p>
                            <p><strong>Type:</strong> {formData.showType || 'N/A'}</p>
                            <p><strong>Associations:</strong> {getAssociationNames()}</p>
                        </ReviewItem>

                        <ReviewItem icon={<CalendarIcon className="w-5 h-5" />} title="Dates & Location">
                            <p><strong>Dates:</strong> {formData.startDate ? `${format(new Date(formData.startDate), 'PPP')} to ${formData.endDate ? format(new Date(formData.endDate), 'PPP') : 'N/A'}` : 'N/A'}</p>
                            <p><strong>Venue:</strong> {formData.venueName || 'N/A'}</p>
                            <p><strong>Address:</strong> {formData.venueAddress || 'N/A'}</p>
                        </ReviewItem>

                        <ReviewItem icon={<FileText className="w-5 h-5" />} title="Disciplines & Patterns">
                            <p><strong>Disciplines:</strong> {(formData.disciplines || []).length} selected</p>
                            <p><strong>Patterns Assigned:</strong> {totalPatternsSelected()} patterns</p>
                        </ReviewItem>

                        <ReviewItem icon={<Users className="w-5 h-5" />} title="Personnel & Sponsors">
                            <p><strong>Officials:</strong> {(formData.officials || []).length} added</p>
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