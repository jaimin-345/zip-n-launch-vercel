import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, BookCopy, CalendarDays, PlusCircle, ArrowRight, Pencil, ImageIcon, CalendarIcon, Archive, ChevronDown, ChevronRight, FolderOpen, Eye, Folder, Edit, Download } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import ProjectDetailModal from '@/components/ProjectDetailModal';

const accessPhaseLabels = {
    draft: 'Draft, Build, Review',
    approval: 'Approval and Locked',
    publication: 'Publication',
};

const COVER_COLORS = [
    '#4BCE97', '#F5CD47', '#FEA362', '#F87168', '#E774BB', '#C59CDF',
    '#579DFF', '#6CC3E0', '#94C748', '#E388A3'
];

const accessPhases = [
    { id: 'draft', name: 'Draft, Build, Review' },
    { id: 'approval', name: 'Approval and Locked' },
    { id: 'publication', name: 'Publication' },
];

// Staff Access Card inside folder
const StaffAccessCard = ({ staffMember, projectId, projectData, projectName, currentUserName, onRefresh }) => {
    const { toast } = useToast();
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedPhases, setSelectedPhases] = useState(staffMember.delegation?.accessPhase || []);
    const [currentPhases, setCurrentPhases] = useState(staffMember.delegation?.accessPhase || []);
    const [isSaving, setIsSaving] = useState(false);

    const getStatusFromAccessPhase = (accessPhase) => {
        if (!accessPhase || accessPhase.length === 0) return 'Pending';
        if (accessPhase.includes('approval') || accessPhase.includes('locked')) return 'Approval and Locked';
        if (accessPhase.includes('publication')) return 'Published';
        if (accessPhase.includes('draft')) return 'Review';
        return 'Pending';
    };

    const status = getStatusFromAccessPhase(currentPhases);
    const statusColor = status === 'Review' ? 'text-orange-500' : 
                        status === 'Approval and Locked' ? 'text-amber-500' :
                        status === 'Published' ? 'text-green-500' : 'text-muted-foreground';

    const handlePhaseToggle = (phaseId) => {
        setSelectedPhases(prev => 
            prev.includes(phaseId) 
                ? prev.filter(p => p !== phaseId) 
                : [...prev, phaseId]
        );
    };

    const sendStatusNotificationEmail = async (newPhases) => {
        try {
            // Determine the primary status to send
            const primaryStatus = newPhases.includes('publication') ? 'publication' :
                                  newPhases.includes('approval') ? 'approval' :
                                  newPhases.includes('draft') ? 'draft' : 'pending';
            
            const staffEmail = staffMember.email || staffMember.delegation?.email;
            const staffRole = staffMember.role || staffMember.delegation?.role || 'Staff';
            
            if (!staffEmail) {
                console.log("No email found for staff member, skipping notification");
                return;
            }

            const response = await supabase.functions.invoke('send-status-notification', {
                body: {
                    staffEmail,
                    staffName: staffMember.name || 'Staff Member',
                    staffRole,
                    projectName: projectName || 'Pattern Book',
                    newStatus: primaryStatus,
                    changedBy: currentUserName || 'System'
                }
            });

            if (response.error) {
                console.error("Error sending notification email:", response.error);
            } else {
                console.log("Status notification email sent successfully");
            }
        } catch (error) {
            console.error("Failed to send status notification:", error);
        }
    };

    const handleSaveStatus = async () => {
        setIsSaving(true);
        try {
            const updatedDelegations = {
                ...(projectData.delegations || {}),
                [staffMember.id]: {
                    ...(projectData.delegations?.[staffMember.id] || {}),
                    accessPhase: selectedPhases
                }
            };

            const updatedProjectData = {
                ...projectData,
                delegations: updatedDelegations
            };

            await supabase
                .from('projects')
                .update({ project_data: updatedProjectData })
                .eq('id', projectId);

            // Update local state immediately for UI refresh
            setCurrentPhases(selectedPhases);
            
            // Send email notification for status change
            await sendStatusNotificationEmail(selectedPhases);
            
            toast({ title: "Status updated", description: "Staff access phase has been updated and notification sent." });
            setStatusDialogOpen(false);
            if (onRefresh) onRefresh();
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div 
                className="border border-border rounded-lg p-4 bg-background hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setStatusDialogOpen(true)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Eye className="h-5 w-5 text-orange-400" />
                        <div>
                            <p className="font-semibold">{staffMember.name || 'Staff Member'}</p>
                            <p className="text-sm text-muted-foreground">
                                Last saved: {staffMember.updatedAt ? format(new Date(staffMember.updatedAt), 'MMM d, yyyy') : 'N/A'}
                            </p>
                            <p className="text-sm">
                                Status: <span className={cn("font-medium", statusColor)}>{status}</span>
                            </p>
                        </div>
                    </div>
                    <Edit className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>

            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent className="sm:max-w-[350px]">
                    <DialogHeader>
                        <DialogTitle>Edit Status - {staffMember.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm font-medium">Access Per Phase</p>
                        <div className="space-y-3">
                            {accessPhases.map(phase => (
                                <div key={phase.id} className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        id={`status-${staffMember.id}-${phase.id}`}
                                        checked={selectedPhases.includes(phase.id)}
                                        onChange={() => handlePhaseToggle(phase.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label 
                                        htmlFor={`status-${staffMember.id}-${phase.id}`}
                                        className="text-sm cursor-pointer"
                                    >
                                        {phase.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setStatusDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button className="flex-1" onClick={handleSaveStatus} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Collapsible Folder for Pattern Folder section
const PatternFolderItem = ({ project, onRefresh, currentUserName }) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [coverDialogOpen, setCoverDialogOpen] = useState(false);
    const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
    const [coverColor, setCoverColor] = useState(project.project_data?.coverColor || null);
    const [dueDate, setDueDate] = useState(project.project_data?.dueDate || null);
    
    // Get staff list from project_data (Step 8 Staff Access & Delegation)
    const getStaffList = () => {
        const formData = project.project_data || {};
        const delegations = formData.delegations || {};
        const staffList = [];
        
        // Get officials
        (formData.officials || []).forEach(official => {
            if (official && official.name) {
                staffList.push({
                    id: official.id,
                    name: official.name,
                    email: official.email || delegations[official.id]?.email,
                    role: official.role,
                    delegation: delegations[official.id] || { accessPhase: [], roles: [] },
                    updatedAt: project.updated_at
                });
            }
        });
        
        // Get judges from associationJudges
        Object.entries(formData.associationJudges || {}).forEach(([assocId, assocData]) => {
            (assocData.judges || []).forEach((judge, index) => {
                if (judge && judge.name) {
                    const judgeId = `judge-${assocId}-${index}`;
                    staffList.push({
                        id: judgeId,
                        name: judge.name,
                        email: judge.email || delegations[judgeId]?.email,
                        role: 'Judge',
                        delegation: delegations[judgeId] || { accessPhase: [], roles: [] },
                        updatedAt: project.updated_at
                    });
                }
            });
        });
        
        return staffList;
    };
    
    const staffList = getStaffList();

    // Check if all staff have locked or published status (hide Open card if true)
    const allStaffLockedOrPublished = staffList.length > 0 && staffList.every(staff => {
        const accessPhase = staff.delegation?.accessPhase || [];
        return accessPhase.includes('approval') || accessPhase.includes('locked') || accessPhase.includes('publication');
    });

    const handleMenuAction = async (action) => {
        switch (action) {
            case 'open':
                navigate(`/pattern-book-builder/${project.id}?step=8`);
                break;
            case 'preview':
                navigate(`/pattern-book-builder/${project.id}?step=1&mode=preview`);
                break;
            case 'cover':
                setCoverDialogOpen(true);
                break;
            default:
                console.log('Action:', action, project.id);
        }
    };

    const handleSelectColor = async (color) => {
        setCoverColor(color);
        const updatedData = { ...project.project_data, coverColor: color };
        await supabase
            .from('projects')
            .update({ project_data: updatedData })
            .eq('id', project.id);
        setCoverDialogOpen(false);
    };

    const handleRemoveCover = async () => {
        setCoverColor(null);
        const updatedData = { ...project.project_data, coverColor: null };
        await supabase
            .from('projects')
            .update({ project_data: updatedData })
            .eq('id', project.id);
        setCoverDialogOpen(false);
    };

    const handleSaveDueDate = async (date) => {
        setDueDate(date);
        const updatedData = { ...project.project_data, dueDate: date };
        await supabase
            .from('projects')
            .update({ project_data: updatedData })
            .eq('id', project.id);
        toast({ title: "Due date updated", description: date ? `Due date set to ${format(new Date(date), 'MMM d, yyyy')}` : "Due date removed" });
    };

    return (
        <>
            <div 
                className="border rounded-lg overflow-hidden bg-transparent mb-4"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Folder Header */}
                <div 
                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${!coverColor ? 'bg-muted border-b' : ''}`}
                    style={coverColor ? { backgroundColor: coverColor } : undefined}
                >
                    <div 
                        className="flex items-center gap-3 flex-1"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? (
                            <ChevronDown className={`h-5 w-5 ${coverColor ? 'text-white/80' : 'text-muted-foreground'}`} />
                        ) : (
                            <ChevronRight className={`h-5 w-5 ${coverColor ? 'text-white/80' : 'text-muted-foreground'}`} />
                        )}
                        <Folder className={`h-5 w-5 ${coverColor ? 'text-white' : 'text-primary'}`} />
                        <span className={`font-semibold ${coverColor ? 'text-white' : 'text-foreground'}`}>{project.project_name || 'Untitled Project'}</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 transition-opacity duration-200 ${coverColor ? 'text-white hover:bg-white/20' : 'text-muted-foreground hover:bg-muted'} ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {!allStaffLockedOrPublished && (
                                <DropdownMenuItem onClick={() => handleMenuAction('open')}>
                                    <Pencil className="mr-2 h-4 w-4" /> Open card
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleMenuAction('preview')}>
                                <Eye className="mr-2 h-4 w-4" /> Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMenuAction('cover')}>
                                <ImageIcon className="mr-2 h-4 w-4" /> Change cover
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                {/* Expanded Content - Staff Cards */}
                {isExpanded && (
                    <div className="px-4 pb-4 pt-3 space-y-3 bg-background">
                        {staffList.length > 0 ? (
                            staffList.map((staff, index) => (
                                <StaffAccessCard 
                                    key={staff.id || index} 
                                    staffMember={staff} 
                                    projectId={project.id}
                                    projectData={project.project_data || {}}
                                    projectName={project.project_name || 'Pattern Book'}
                                    currentUserName={currentUserName}
                                    onRefresh={onRefresh}
                                />
                            ))
                        ) : (
                            <div className="text-center py-6 text-muted-foreground">
                                No staff delegations configured. Configure in Step 8: Close Out & Review.
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <CoverColorDialog
                open={coverDialogOpen}
                onClose={() => setCoverDialogOpen(false)}
                currentColor={coverColor}
                onSelectColor={handleSelectColor}
                onRemoveCover={handleRemoveCover}
            />
            <DueDateDialog
                open={dueDateDialogOpen}
                onClose={() => setDueDateDialogOpen(false)}
                currentDate={dueDate}
                onSaveDate={handleSaveDueDate}
            />
        </>
    );
};

const CoverColorDialog = ({ open, onClose, currentColor, onSelectColor, onRemoveCover }) => {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[320px]">
                <DialogHeader>
                    <DialogTitle>Cover</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Size</p>
                        <div className="flex gap-2">
                            <div className="flex-1 h-12 bg-muted rounded border-2 border-primary flex items-center justify-center">
                                <div className="w-full h-2 bg-primary/30 mx-4 rounded" />
                            </div>
                            <div className="flex-1 h-12 bg-muted rounded border flex items-center justify-center">
                                <div className="w-full h-full bg-primary/20 rounded" />
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" className="w-full" onClick={onRemoveCover}>
                        Remove cover
                    </Button>
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Colors</p>
                        <div className="grid grid-cols-5 gap-2">
                            {COVER_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => onSelectColor(color)}
                                    className={`w-10 h-8 rounded cursor-pointer transition-all hover:scale-110 ${currentColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const DueDateDialog = ({ open, onClose, currentDate, onSaveDate }) => {
    const [selectedDate, setSelectedDate] = useState(currentDate ? new Date(currentDate) : undefined);
    
    const handleSave = () => {
        onSaveDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
        onClose();
    };
    
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[320px]">
                <DialogHeader>
                    <DialogTitle>Edit Due Date</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Due Date</p>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setSelectedDate(undefined)}>
                            Clear
                        </Button>
                        <Button className="flex-1" onClick={handleSave}>
                            Save
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const ProjectCard = ({ project, menuType = 'full', onRefresh }) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [coverDialogOpen, setCoverDialogOpen] = useState(false);
    const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [coverColor, setCoverColor] = useState(project.project_data?.coverColor || null);
    const [dueDate, setDueDate] = useState(project.project_data?.dueDate || null);
    const [isHovered, setIsHovered] = useState(false);
    
    const isPatternBook = project.project_type === 'pattern_book';
    const isPatternFolder = project.project_type === 'pattern_folder';
    const editPath = isPatternBook
        ? `/pattern-book-builder/${project.id}`
        : isPatternFolder
        ? `/pattern-folder/${project.id}`
        : `/horse-show-manager/edit/${project.id}`;

    const handleMenuAction = async (action) => {
        switch (action) {
            case 'open':
                navigate(editPath);
                break;
            case 'cover':
                setCoverDialogOpen(true);
                break;
            case 'dates':
                setDueDateDialogOpen(true);
                break;
            case 'archive':
                await supabase
                    .from('projects')
                    .update({ status: 'archived' })
                    .eq('id', project.id);
                toast({ title: "Project archived", description: "Project has been archived" });
                break;
            case 'preview':
                navigate(`${editPath}?preview=true`);
                break;
            case 'download':
                toast({ title: "Download started", description: "Your folder is being prepared for download" });
                break;
            default:
                console.log('Action:', action, project.id);
        }
    };

    const handleSelectColor = async (color) => {
        setCoverColor(color);
        const updatedData = { ...project.project_data, coverColor: color };
        await supabase
            .from('projects')
            .update({ project_data: updatedData })
            .eq('id', project.id);
        setCoverDialogOpen(false);
    };

    const handleRemoveCover = async () => {
        setCoverColor(null);
        const updatedData = { ...project.project_data, coverColor: null };
        await supabase
            .from('projects')
            .update({ project_data: updatedData })
            .eq('id', project.id);
        setCoverDialogOpen(false);
    };

    const handleSaveDueDate = async (date) => {
        setDueDate(date);
        const updatedData = { ...project.project_data, dueDate: date };
        await supabase
            .from('projects')
            .update({ project_data: updatedData })
            .eq('id', project.id);
        toast({ title: "Due date updated", description: date ? `Due date set to ${format(new Date(date), 'MMM d, yyyy')}` : "Due date removed" });
    };

    // Render menu items based on menuType
    const renderMenuItems = () => {
        if (menuType === 'folder') {
            // Pattern Folder: open card, change cover, preview only
            return (
                <>
                    <DropdownMenuItem onClick={() => handleMenuAction('open')}>
                        <Pencil className="mr-2 h-4 w-4" /> Open card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('cover')}>
                        <ImageIcon className="mr-2 h-4 w-4" /> Change cover
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('preview')}>
                        <Eye className="mr-2 h-4 w-4" /> Preview
                    </DropdownMenuItem>
                </>
            );
        } else {
            // Pattern Books and Horse Shows: open card, change cover, edit dates, download folder, archive
            return (
                <>
                    <DropdownMenuItem onClick={() => handleMenuAction('open')}>
                        <Pencil className="mr-2 h-4 w-4" /> Open card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('cover')}>
                        <ImageIcon className="mr-2 h-4 w-4" /> Change cover
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('dates')}>
                        <CalendarIcon className="mr-2 h-4 w-4" /> Edit dates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('download')}>
                        <Download className="mr-2 h-4 w-4" /> Download Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('archive')}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>
                </>
            );
        }
    };

    // Folder-style card for Pattern Folder
    if (isPatternFolder) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                className="flex flex-col h-full relative group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Folder Tab */}
                <div className="flex">
                    <div 
                        className="h-4 w-20 rounded-t-lg"
                        style={{ backgroundColor: coverColor || 'hsl(var(--primary))' }}
                    />
                    <div 
                        className="h-4 w-4"
                        style={{ 
                            background: `linear-gradient(135deg, ${coverColor || 'hsl(var(--primary))'} 50%, transparent 50%)`
                        }}
                    />
                </div>
                
                {/* Edit Menu Button */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`absolute top-6 right-2 z-10 h-7 w-7 bg-background/80 hover:bg-background shadow-sm border transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        {renderMenuItems()}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Folder Body */}
                <Card className="flex flex-col flex-grow rounded-tl-none border-t-0" style={{ borderColor: coverColor || undefined }}>
                    {coverColor && (
                        <div className="h-2 w-full rounded-tr-lg" style={{ backgroundColor: coverColor }} />
                    )}
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <FolderOpen className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="leading-tight">{project.project_name || 'Untitled Project'}</CardTitle>
                                <CardDescription>Pattern Folder</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground">
                            Last saved: {format(new Date(project.updated_at), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Status: <span className="capitalize font-medium text-foreground">{project.status || 'Draft'}</span></p>
                        {dueDate && (
                            <p className="text-sm text-muted-foreground mt-1">
                                Due: <span className="font-medium text-foreground">{format(new Date(dueDate), 'MMM d, yyyy')}</span>
                            </p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => setDetailModalOpen(true)} className="w-full">
                            Continue Editing <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>

                <CoverColorDialog
                    open={coverDialogOpen}
                    onClose={() => setCoverDialogOpen(false)}
                    currentColor={coverColor}
                    onSelectColor={handleSelectColor}
                    onRemoveCover={handleRemoveCover}
                />
                
                <ProjectDetailModal
                    open={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    project={project}
                    onRefresh={onRefresh}
                />
            </motion.div>
        );
    }

    // Folder colors - use primary (blue) for tab/border, transparent body
    const tabColor = coverColor || 'hsl(var(--primary))';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -5 }}
            className="flex flex-col h-full relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Back paper layers - 3D effect */}
            <div className="absolute top-3 left-2 right-0 bottom-0 z-0">
                {/* Third layer (furthest back) */}
                <div 
                    className="absolute inset-0 rounded-lg border-2 bg-card/30 translate-x-2 translate-y-2"
                    style={{ borderColor: coverColor || 'hsl(var(--primary))' }}
                />
                {/* Second layer */}
                <div 
                    className="absolute inset-0 rounded-lg border-2 bg-card/50 translate-x-1 translate-y-1"
                    style={{ borderColor: coverColor || 'hsl(var(--primary))' }}
                />
            </div>

            {/* Folder Tab - small tab on left */}
            <div className="flex items-end relative z-20">
                <div 
                    className="h-5 w-16 rounded-t-md border-2 border-b-0 bg-card/80"
                    style={{ borderColor: coverColor || 'hsl(var(--primary))' }}
                />
                {/* Slanted edge connector */}
                <svg 
                    className="h-5 w-4 -ml-px"
                    viewBox="0 0 16 20" 
                    fill="none"
                >
                    <path 
                        d="M0 0 L16 20 L0 20 Z" 
                        className="fill-card/80"
                    />
                    <path 
                        d="M0 0 L16 20" 
                        stroke={coverColor || 'hsl(var(--primary))'} 
                        strokeWidth="2"
                    />
                </svg>
            </div>
            
            {/* Folder Body - main front panel */}
            <div 
                className="flex-grow rounded-lg rounded-tl-none shadow-xl overflow-hidden relative bg-card/90 backdrop-blur-sm border-2 z-20"
                style={{ borderColor: coverColor || 'hsl(var(--primary))' }}
            >
                {/* Edit Menu Button - Only visible on hover */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`absolute top-2 right-2 z-10 h-7 w-7 bg-background/80 hover:bg-background shadow-sm border transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 bg-popover">
                        {renderMenuItems()}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="p-4">
                    {/* Project Name */}
                    <div className="flex items-center gap-2 mb-3">
                        {isPatternBook ? (
                            <BookCopy className="h-5 w-5 text-primary shrink-0" />
                        ) : (
                            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                        )}
                        <h3 className="font-semibold text-foreground truncate">
                            {project.project_name || 'Untitled Project'}
                        </h3>
                    </div>
                    
                    {/* Project Type Badge */}
                    <div className="mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                            {isPatternBook ? 'Pattern Book' : 'Horse Show'}
                        </span>
                    </div>
                    
                    {/* Project Details */}
                    <div className="space-y-1 text-sm text-muted-foreground mb-4">
                        <p>Last saved: {format(new Date(project.updated_at), "MMM d, yyyy")}</p>
                        <p>Status: <span className="capitalize font-medium text-foreground">{project.status || 'Draft'}</span></p>
                        {dueDate && (
                            <p>Due: <span className="font-medium text-foreground">{format(new Date(dueDate), 'MMM d, yyyy')}</span></p>
                        )}
                    </div>
                    
                    {/* Action Button */}
                    <Button 
                        onClick={() => setDetailModalOpen(true)} 
                        className="w-full" 
                        size="sm"
                    >
                        Continue Editing <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <CoverColorDialog
                open={coverDialogOpen}
                onClose={() => setCoverDialogOpen(false)}
                currentColor={coverColor}
                onSelectColor={handleSelectColor}
                onRemoveCover={handleRemoveCover}
            />
            
            <DueDateDialog
                open={dueDateDialogOpen}
                onClose={() => setDueDateDialogOpen(false)}
                currentDate={dueDate}
                onSaveDate={handleSaveDueDate}
            />
            
            <ProjectDetailModal
                open={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                project={project}
                onRefresh={onRefresh}
            />
        </motion.div>
    );
};

const CustomerPortalPage = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProjects = async () => {
        if (!user) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
        } else {
            setProjects(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchProjects();
    }, [user]);

    const patternBookProjects = projects.filter(p => p.project_type === 'pattern_book');
    const showManagerProjects = projects.filter(p => p.project_type !== 'pattern_book' && p.project_type !== 'pattern_folder');
    
    const [expandedSections, setExpandedSections] = useState({
        patternFolders: true,
        patternBooks: true,
        horseShows: true
    });
    
    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const renderProjectList = (projectList, title, description, newProjectPath, newProjectLabel, sectionKey, menuType = 'full', hideNewButton = false) => (
        <div className="mb-16">
            <div className="flex justify-between items-center mb-4">
                <button 
                    onClick={() => toggleSection(sectionKey)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                    {expandedSections[sectionKey] ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="text-left">
                        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                        <p className="text-muted-foreground mt-1">{description}</p>
                    </div>
                </button>
                {!hideNewButton && (
                    <Button onClick={() => navigate(newProjectPath)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> {newProjectLabel}
                    </Button>
                )}
            </div>
            {expandedSections[sectionKey] && (
                projectList.length > 0 ? (
                    menuType === 'folder' ? (
                        // Folder-style layout for Pattern Portal - 3 folders per row
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projectList.map(project => (
                                <PatternFolderItem key={project.id} project={project} currentUserName={profile?.full_name || user?.email || 'User'} />
                            ))}
                        </div>
                    ) : (
                        // Grid layout for Pattern Books and Horse Shows
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {projectList.map(project => (
                                <ProjectCard key={project.id} project={project} menuType={menuType} onRefresh={fetchProjects} />
                            ))}
                        </div>
                    )
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">You haven't created any projects here yet.</p>
                    </div>
                )
            )}
        </div>
    );

    return (
        <>
            <Helmet>
                <title>Customer Portal - EquiPatterns</title>
                <meta name="description" content="Manage your horse show projects, pattern books, and access exclusive customer tools." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-8">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                            Welcome to Your Portal
                        </h1>
                        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                            This is your command center for all your projects. Manage your pattern books, build show schedules, and access your assets.
                        </p>
                    </motion.div>

                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div>
                            {renderProjectList(
                                patternBookProjects,
                                "Pattern Books",
                                "Build and manage your horse show pattern books.",
                                "/pattern-book-builder",
                                "New Pattern Book",
                                "patternBooks",
                                "default"
                            )}
                            {renderProjectList(
                                patternBookProjects,
                                "Pattern Portal",
                                "Organize and store your pattern collections.",
                                "",
                                "",
                                "patternFolders",
                                "folder",
                                true
                            )}
                            {renderProjectList(
                                showManagerProjects,
                                "Horse Shows",
                                "Manage your horse show schedules and events.",
                                "/horse-show-manager/create",
                                "New Horse Show",
                                "horseShows",
                                "default"
                            )}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default CustomerPortalPage;
