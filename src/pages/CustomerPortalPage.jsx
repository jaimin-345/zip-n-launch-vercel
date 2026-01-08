import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, BookCopy, CalendarDays, PlusCircle, ArrowRight, Pencil, ImageIcon, CalendarIcon, Archive, ChevronDown, ChevronRight, FolderOpen, Eye, Folder, Edit, Download, FileText, LayoutGrid, Info, Users, Lock, MoreVertical } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, parseLocalDate } from '@/lib/utils';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import { downloadPatternBookFolder } from '@/lib/patternBookDownloader';

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
const PatternFolderItem = ({ project, onRefresh, currentUserName, isPastPatternPortal = false }) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [coverDialogOpen, setCoverDialogOpen] = useState(false);
    const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(() => {
        const currentStatus = project.status || 'Draft';
        // Map database status to display status
        if (currentStatus === 'Lock & Approve Mode') return 'Approval and Locked';
        if (currentStatus === 'Publication') return 'Publication';
        return 'Draft';
    });
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    const [coverColor, setCoverColor] = useState(project.project_data?.coverColor || null);
    const [dueDate, setDueDate] = useState(project.project_data?.dueDate || null);
    const [scoreSheetsDialogOpen, setScoreSheetsDialogOpen] = useState(false);
    const [scoreSheets, setScoreSheets] = useState([]);
    const [isLoadingScoreSheets, setIsLoadingScoreSheets] = useState(false);
    const [patternsDialogOpen, setPatternsDialogOpen] = useState(false);
    const [patterns, setPatterns] = useState([]);
    const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
    const [judgeCardsDialogOpen, setJudgeCardsDialogOpen] = useState(false);
    const [judgeCards, setJudgeCards] = useState([]);
    const [isLoadingJudgeCards, setIsLoadingJudgeCards] = useState(false);
    
    // Get judges list from project_data (Step 8 Staff Access & Delegation)
    const getJudgesList = () => {
        const formData = project.project_data || {};
        const delegations = formData.delegations || {};
        const judgesList = [];
        
        // Get judges from associationJudges
        Object.entries(formData.associationJudges || {}).forEach(([assocId, assocData]) => {
            (assocData.judges || []).forEach((judge, index) => {
                if (judge && judge.name) {
                    const judgeId = `judge-${assocId}-${index}`;
                    const judgeDelegation = delegations[judgeId] || {};
                    const accessPhase = judgeDelegation.accessPhase || [];
                    
                    // Determine status from accessPhase
                    let status = 'Pending';
                    if (accessPhase.includes('publication')) status = 'Published';
                    else if (accessPhase.includes('approval') || accessPhase.includes('locked')) status = 'Approval and Locked';
                    else if (accessPhase.includes('draft')) status = 'Review';
                    
                    judgesList.push({
                        id: judgeId,
                        name: judge.name,
                        email: judge.email || delegations[judgeId]?.email,
                        role: 'Judge',
                        delegation: judgeDelegation,
                        status: status,
                        updatedAt: project.updated_at
                    });
                }
            });
        });
        
        return judgesList;
    };
    
    const judgesList = getJudgesList();

    // Check if all judges have locked or published status (hide Open card if true)
    const allJudgesLockedOrPublished = judgesList.length > 0 && judgesList.every(judge => {
        const accessPhase = judge.delegation?.accessPhase || [];
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

    const handleSaveStatus = async () => {
        setIsSavingStatus(true);
        try {
            // Map selected status to database status values
            let dbStatus = selectedStatus;
            if (selectedStatus === 'Approval and Locked') {
                dbStatus = 'Lock & Approve Mode';
            } else if (selectedStatus === 'Publication') {
                dbStatus = 'Publication';
            } else {
                dbStatus = 'Draft';
            }

            await supabase
                .from('projects')
                .update({ status: dbStatus })
                .eq('id', project.id);
            
            toast({ 
                title: "Status updated", 
                description: `Pattern status changed to ${selectedStatus}` 
            });
            setStatusDialogOpen(false);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error updating status:', error);
            toast({ 
                title: "Error", 
                description: "Failed to update status.", 
                variant: "destructive" 
            });
        } finally {
            setIsSavingStatus(false);
        }
    };

    const fetchScoreSheets = async () => {
        setIsLoadingScoreSheets(true);
        try {
            const projectData = project.project_data || {};
            const patternSelections = projectData.patternSelections || {};
            const disciplines = projectData.disciplines || [];
            const associations = projectData.associations || {};
            
            // Fetch associations data
            const { data: associationsData } = await supabase
                .from('associations')
                .select('id, abbreviation, name');
            
            const associationsMap = {};
            (associationsData || []).forEach(a => {
                associationsMap[a.id] = a;
            });
            
            const scoreSheetsList = [];
            const processedScoresheets = new Set(); // To avoid duplicates
            
            // Iterate through disciplines and groups to get score sheets
            for (const discipline of disciplines) {
                const disciplineSelections = patternSelections[discipline.id] || patternSelections[discipline.name];
                if (!disciplineSelections) continue;
                
                const groups = discipline.patternGroups || [];
                for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                    const group = groups[groupIndex];
                    const patternSelection = disciplineSelections[group.id] || disciplineSelections[groupIndex];
                    if (!patternSelection) continue;
                    
                    // Get pattern ID
                    const patternId = typeof patternSelection === 'object' 
                        ? (patternSelection.patternId || patternSelection.id) 
                        : patternSelection;
                    
                    if (!patternId) continue;
                    
                    // Extract divisions for this group
                    const divisions = Array.isArray(group.divisions) ? group.divisions : [];
                    const extractedDivisions = divisions.map(div => {
                        if (typeof div === 'string') {
                            return { name: div, association: '' };
                        } else if (div && typeof div === 'object') {
                            let assocName = div.association || div.assocName || '';
                            if (!assocName && div.association_id) {
                                const assoc = associationsMap[div.association_id];
                                assocName = assoc?.abbreviation || assoc?.name || div.association_id;
                            }
                            return {
                                name: div.name || div.divisionName || div.division || div.title || '',
                                association: assocName
                            };
                        } else {
                            return { name: String(div || ''), association: '' };
                        }
                    }).filter(div => div.name && div.name.trim() !== '');
                    
                    // Priority 1: Check if scoresheet was selected in patternSelection
                    if (typeof patternSelection === 'object' && patternSelection.scoresheetData) {
                        const scoresheetId = `${patternSelection.scoresheetData.id || patternSelection.scoresheetData.pattern_id}`;
                        if (!processedScoresheets.has(scoresheetId)) {
                            scoreSheetsList.push({
                                ...patternSelection.scoresheetData,
                                disciplineName: discipline.name,
                                groupName: group.name,
                                divisions: extractedDivisions
                            });
                            processedScoresheets.add(scoresheetId);
                        }
                        continue;
                    }
                    
                    // Priority 2: Fetch by pattern_id
                    if (patternId && !isNaN(parseInt(patternId))) {
                        const { data: scoresheet } = await supabase
                            .from('tbl_scoresheet')
                            .select('id, pattern_id, image_url, storage_path, discipline, file_name, association_abbrev')
                            .eq('pattern_id', parseInt(patternId))
                            .maybeSingle();
                        
                        if (scoresheet && scoresheet.image_url) {
                            const scoresheetId = `${scoresheet.id}`;
                            if (!processedScoresheets.has(scoresheetId)) {
                                scoreSheetsList.push({
                                    ...scoresheet,
                                    disciplineName: discipline.name,
                                    groupName: group.name,
                                    divisions: extractedDivisions
                                });
                                processedScoresheets.add(scoresheetId);
                            }
                        }
                    }
                    
                    // Priority 3: Try by association and discipline
                    const association = associationsMap[discipline.association_id];
                    if (association?.abbreviation && discipline.name) {
                        const { data: scoresheet } = await supabase
                            .from('tbl_scoresheet')
                            .select('id, pattern_id, image_url, storage_path, discipline, file_name, association_abbrev')
                            .eq('association_abbrev', association.abbreviation)
                            .ilike('discipline', `%${discipline.name}%`)
                            .maybeSingle();
                        
                        if (scoresheet && scoresheet.image_url) {
                            const scoresheetId = `${scoresheet.id}`;
                            if (!processedScoresheets.has(scoresheetId)) {
                                scoreSheetsList.push({
                                    ...scoresheet,
                                    disciplineName: discipline.name,
                                    groupName: group.name,
                                    divisions: extractedDivisions
                                });
                                processedScoresheets.add(scoresheetId);
                            }
                        }
                    }
                }
            }
            
            setScoreSheets(scoreSheetsList);
        } catch (error) {
            console.error('Error fetching score sheets:', error);
            toast({
                title: 'Error',
                description: 'Failed to load score sheets.',
                variant: 'destructive'
            });
        } finally {
            setIsLoadingScoreSheets(false);
        }
    };

    const handleOpenScoreSheets = () => {
        setScoreSheetsDialogOpen(true);
        fetchScoreSheets();
    };

    const fetchPatterns = async () => {
        setIsLoadingPatterns(true);
        try {
            const projectData = project.project_data || {};
            const disciplines = projectData.disciplines || [];
            const patternSelections = projectData.patternSelections || {};
            const patternsList = [];
            const processedPatterns = new Set(); // To prevent duplicates
            
            // Collect all pattern IDs
            const patternIds = new Set();
            for (const discipline of disciplines) {
                const disciplineSelections = patternSelections[discipline.id] || patternSelections[discipline.name] || patternSelections[discipline.index];
                if (!disciplineSelections) continue;
                
                const groups = discipline.patternGroups || [];
                for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                    const group = groups[groupIndex];
                    const patternSelection = disciplineSelections[group.id] || disciplineSelections[groupIndex];
                    if (!patternSelection) continue;
                    
                    // Get pattern ID
                    const patternId = typeof patternSelection === 'object' 
                        ? (patternSelection.patternId || patternSelection.id) 
                        : patternSelection;
                    
                    if (patternId && !isNaN(parseInt(patternId))) {
                        patternIds.add(parseInt(patternId));
                    }
                }
            }
            
            // Fetch pattern images from tbl_pattern_media
            let patternImageMap = {};
            if (patternIds.size > 0) {
                const { data: patternMediaData, error: patError } = await supabase
                    .from('tbl_pattern_media')
                    .select('pattern_id, image_url')
                    .in('pattern_id', Array.from(patternIds));
                
                if (!patError && patternMediaData) {
                    patternMediaData.forEach(pm => {
                        if (!patternImageMap[pm.pattern_id]) {
                            patternImageMap[pm.pattern_id] = pm.image_url;
                        }
                    });
                }
            }
            
            // Fetch pattern details from tbl_patterns
            let patternDetailsMap = {};
            if (patternIds.size > 0) {
                const { data: patternData, error: patDetailError } = await supabase
                    .from('tbl_patterns')
                    .select('id, pdf_file_name, pattern_version, discipline, association_id')
                    .in('id', Array.from(patternIds));
                
                if (!patDetailError && patternData) {
                    patternData.forEach(p => {
                        patternDetailsMap[p.id] = p;
                    });
                }
            }
            
            // Build patterns list with discipline and group info
            for (const discipline of disciplines) {
                const disciplineSelections = patternSelections[discipline.id] || patternSelections[discipline.name] || patternSelections[discipline.index];
                if (!disciplineSelections) continue;
                
                const groups = discipline.patternGroups || [];
                for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                    const group = groups[groupIndex];
                    const patternSelection = disciplineSelections[group.id] || disciplineSelections[groupIndex];
                    if (!patternSelection) continue;
                    
                    // Get pattern ID
                    const patternId = typeof patternSelection === 'object' 
                        ? (patternSelection.patternId || patternSelection.id) 
                        : patternSelection;
                    
                    if (!patternId || isNaN(parseInt(patternId))) continue;
                    
                    const patternIdNum = parseInt(patternId);
                    const patternKey = `${patternIdNum}-${discipline.id}-${group.id || groupIndex}`;
                    
                    if (!processedPatterns.has(patternKey)) {
                        const patternDetail = patternDetailsMap[patternIdNum];
                        const imageUrl = patternImageMap[patternIdNum];
                        
                        // Extract divisions for this group
                        const divisions = Array.isArray(group.divisions) ? group.divisions : [];
                        const extractedDivisions = divisions.map(div => {
                            if (typeof div === 'string') {
                                return { name: div, association: '' };
                            } else if (div && typeof div === 'object') {
                                return {
                                    name: div.name || div.divisionName || div.division || div.title || '',
                                    association: div.association || div.assocName || (div.association_id ? div.association_id : '')
                                };
                            } else {
                                return { name: String(div || ''), association: '' };
                            }
                        }).filter(div => div.name && div.name.trim() !== '');
                        
                        patternsList.push({
                            patternId: patternIdNum,
                            imageUrl: imageUrl,
                            patternName: patternDetail?.pdf_file_name || `Pattern ${patternIdNum}`,
                            version: patternDetail?.pattern_version || patternSelection.version || 'ALL',
                            disciplineName: discipline.name,
                            groupName: group.name,
                            discipline: patternDetail?.discipline || discipline.name,
                            divisions: extractedDivisions
                        });
                        processedPatterns.add(patternKey);
                    }
                }
            }
            
            setPatterns(patternsList);
        } catch (error) {
            console.error('Error fetching patterns:', error);
            toast({
                title: 'Error',
                description: 'Failed to load patterns.',
                variant: 'destructive'
            });
        } finally {
            setIsLoadingPatterns(false);
        }
    };

    const handleOpenPatterns = () => {
        setPatternsDialogOpen(true);
        fetchPatterns();
    };

    const fetchJudgeCards = async () => {
        setIsLoadingJudgeCards(true);
        try {
            const projectData = project.project_data || {};
            const disciplines = projectData.disciplines || [];
            const groupJudges = projectData.groupJudges || {};
            const judgeSelections = projectData.judgeSelections || {};
            const patternSelections = projectData.patternSelections || {};
            const associationJudges = projectData.associationJudges || {};
            const officials = projectData.officials || [];
            
            // Fetch associations data for division association names
            const { data: associationsData } = await supabase
                .from('associations')
                .select('id, abbreviation, name');
            
            const associationsMap = {};
            (associationsData || []).forEach(a => {
                associationsMap[a.id] = a;
            });
            
            // Collect ALL judges from associationJudges and officials
            const allJudgesSet = new Set();
            
            // Collect from associationJudges
            Object.values(associationJudges).forEach(assocData => {
                const judgesList = assocData?.judges || [];
                judgesList.forEach(judge => {
                    if (judge && judge.name && typeof judge.name === 'string') {
                        allJudgesSet.add(judge.name.trim());
                    }
                });
            });
            
            // Collect from officials
            officials.forEach(official => {
                if (official && official.name && typeof official.name === 'string') {
                    allJudgesSet.add(official.name.trim());
                }
            });
            
            // Collect assigned judges to mark them
            const assignedJudgesSet = new Set();
            
            // Collect from discipline-level assignments
            Object.values(judgeSelections).forEach(judgeName => {
                if (judgeName && typeof judgeName === 'string') {
                    assignedJudgesSet.add(judgeName.trim());
                }
            });
            
            // Collect from group-level assignments
            Object.values(groupJudges).forEach(disciplineGroups => {
                if (disciplineGroups && typeof disciplineGroups === 'object' && !Array.isArray(disciplineGroups)) {
                    Object.values(disciplineGroups).forEach(judgeName => {
                        if (judgeName && typeof judgeName === 'string') {
                            assignedJudgesSet.add(judgeName.trim());
                        }
                    });
                } else if (Array.isArray(disciplineGroups)) {
                    disciplineGroups.forEach(judgeName => {
                        if (judgeName && typeof judgeName === 'string') {
                            assignedJudgesSet.add(judgeName.trim());
                        }
                    });
                }
            });
            
            // Build judge cards data for ALL judges
            const judgeCardsList = [];
            
            for (const judgeName of allJudgesSet) {
                const isAssigned = assignedJudgesSet.has(judgeName);
                const judgeAssignments = [];
                
                // Iterate through disciplines to find assignments
                disciplines.forEach((discipline, disciplineIndex) => {
                    const disciplineId = discipline.id || discipline.name || disciplineIndex;
                    const groups = discipline.patternGroups || [];
                    const assignedGroups = [];
                    
                    // Check discipline-level assignment
                    const isDisciplineAssigned = judgeSelections[disciplineIndex]?.toLowerCase().trim() === judgeName.toLowerCase().trim();
                    
                    // Check group-level assignments
                    groups.forEach((group, groupIndex) => {
                        if (!group) return;
                        
                        const groupJudge = groupJudges[disciplineIndex]?.[groupIndex] || 
                                         groupJudges[disciplineIndex]?.[group.id] ||
                                         groupJudges[disciplineIndex]?.[String(groupIndex)];
                        const isGroupAssigned = groupJudge && typeof groupJudge === 'string' && 
                                              groupJudge.toLowerCase().trim() === judgeName.toLowerCase().trim();
                        
                        if (isDisciplineAssigned || isGroupAssigned) {
                            // Get divisions for this group
                            const divisions = Array.isArray(group.divisions) ? group.divisions : [];
                            
                            // Get pattern selection for this group
                            const disciplinePatternSelections = patternSelections[disciplineId] || 
                                                               patternSelections[discipline.name] || 
                                                               patternSelections[disciplineIndex] ||
                                                               patternSelections[String(disciplineIndex)];
                            const patternSelection = disciplinePatternSelections?.[group.id] || 
                                                    disciplinePatternSelections?.[groupIndex] ||
                                                    disciplinePatternSelections?.[String(groupIndex)];
                            const patternId = typeof patternSelection === 'object' && patternSelection !== null
                                ? (patternSelection.patternId || patternSelection.id) 
                                : patternSelection;
                            
                            // Extract divisions with proper name handling
                            const extractedDivisions = divisions.map(div => {
                                // Handle different division formats
                                if (typeof div === 'string') {
                                    return {
                                        name: div,
                                        association: ''
                                    };
                                } else if (div && typeof div === 'object') {
                                    // Try multiple possible name fields
                                    const divName = div.name || div.divisionName || div.division || div.title || '';
                                    // Get association name from association_id if needed
                                    let assocName = div.association || div.assocName || '';
                                    if (!assocName && div.association_id) {
                                        // Try to get association name from associations map
                                        const assoc = associationsMap[div.association_id];
                                        assocName = assoc?.abbreviation || assoc?.name || div.association_id;
                                    }
                                    return {
                                        name: divName,
                                        association: assocName || div.assocId || ''
                                    };
                                } else {
                                    return {
                                        name: String(div || ''),
                                        association: ''
                                    };
                                }
                            }).filter(div => div.name && div.name.trim() !== ''); // Filter out empty divisions
                            
                            assignedGroups.push({
                                groupName: group.name || `Group ${groupIndex + 1}`,
                                divisions: extractedDivisions,
                                patternId: patternId && !isNaN(parseInt(patternId)) ? parseInt(patternId) : null
                            });
                        }
                    });
                    
                    if (assignedGroups.length > 0) {
                        judgeAssignments.push({
                            disciplineName: discipline.name,
                            groups: assignedGroups
                        });
                    }
                });
                
                // Add judge card whether assigned or not
                judgeCardsList.push({
                    judgeName,
                    isAssigned,
                    assignments: judgeAssignments.length > 0 ? judgeAssignments : []
                });
            }
            
            // Fetch pattern details for all pattern IDs
            const allPatternIds = new Set();
            judgeCardsList.forEach(judgeCard => {
                judgeCard.assignments.forEach(assignment => {
                    assignment.groups.forEach(group => {
                        if (group.patternId) {
                            allPatternIds.add(group.patternId);
                        }
                    });
                });
            });
            
            let patternDetailsMap = {};
            let patternImageMap = {};
            
            if (allPatternIds.size > 0) {
                // Fetch pattern details
                const { data: patternData, error: patDetailError } = await supabase
                    .from('tbl_patterns')
                    .select('id, pdf_file_name, pattern_version, discipline')
                    .in('id', Array.from(allPatternIds));
                
                if (!patDetailError && patternData) {
                    patternData.forEach(p => {
                        patternDetailsMap[p.id] = p;
                    });
                }
                
                // Fetch pattern images
                const { data: patternMediaData, error: patMediaError } = await supabase
                    .from('tbl_pattern_media')
                    .select('pattern_id, image_url')
                    .in('pattern_id', Array.from(allPatternIds));
                
                if (!patMediaError && patternMediaData) {
                    patternMediaData.forEach(pm => {
                        if (!patternImageMap[pm.pattern_id]) {
                            patternImageMap[pm.pattern_id] = pm.image_url;
                        }
                    });
                }
            }
            
            // Add pattern names and images to judge cards
            judgeCardsList.forEach(judgeCard => {
                judgeCard.assignments.forEach(assignment => {
                    assignment.groups.forEach(group => {
                        if (group.patternId && patternDetailsMap[group.patternId]) {
                            group.patternName = patternDetailsMap[group.patternId].pdf_file_name;
                            group.patternVersion = patternDetailsMap[group.patternId].pattern_version;
                            group.patternImageUrl = patternImageMap[group.patternId] || null;
                        }
                    });
                });
            });
            
            setJudgeCards(judgeCardsList);
        } catch (error) {
            console.error('Error fetching judge cards:', error);
            toast({
                title: 'Error',
                description: 'Failed to load judge cards.',
                variant: 'destructive'
            });
        } finally {
            setIsLoadingJudgeCards(false);
        }
    };

    const handleOpenJudgeCards = () => {
        setJudgeCardsDialogOpen(true);
        fetchJudgeCards();
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
                            {!allJudgesLockedOrPublished && !isPastPatternPortal && (
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
                
                {/* Expanded Content - Navigation Sections and Judge Cards */}
                {isExpanded && (
                    <div className="px-4 pb-4 pt-3 space-y-3 bg-background">
                        {/* Status Changer - Visible Button */}
                        <div className="mb-4 p-3 rounded-lg border border-border bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Status:</span>
                                    <Badge 
                                        variant="outline"
                                        className={cn(
                                            "font-medium",
                                            selectedStatus === 'Draft' 
                                                ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                                : selectedStatus === 'Approval and Locked'
                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                                                : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                                        )}
                                    >
                                        {selectedStatus === 'Approval and Locked' ? 'Lock & Approve Mode' : selectedStatus}
                                    </Badge>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setStatusDialogOpen(true);
                                    }}
                                    className="h-8"
                                >
                                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                    Change Status
                                </Button>
                            </div>
                        </div>
                        
                        {/* Navigation Sections */}
                        <div className="space-y-2 mb-4">
                            <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setStatusDialogOpen(true);
                                    }}
                                    className="h-8 w-8 hover:bg-primary hover:text-primary-foreground shrink-0"
                                    title="Change Status"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenScoreSheets();
                                    }}
                                    className="flex-1 text-left"
                                >
                                    <span className="text-foreground font-medium">Score Sheets</span>
                                </button>
                            </div>
                            <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setStatusDialogOpen(true);
                                    }}
                                    className="h-8 w-8 hover:bg-primary hover:text-primary-foreground shrink-0"
                                    title="Change Status"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenPatterns();
                                    }}
                                    className="flex-1 text-left"
                                >
                                    <span className="text-foreground font-medium">Patterns</span>
                                </button>
                            </div>
                            <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setStatusDialogOpen(true);
                                    }}
                                    className="h-8 w-8 hover:bg-primary hover:text-primary-foreground shrink-0"
                                    title="Change Status"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenJudgeCards();
                                    }}
                                    className="flex-1 text-left"
                                >
                                    <span className="text-foreground font-medium">Judge Cards</span>
                                </button>
                            </div>
                        </div>
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
            
            {/* Score Sheets Dialog */}
            <Dialog open={scoreSheetsDialogOpen} onOpenChange={setScoreSheetsDialogOpen}>
                <DialogContent className="sm:max-w-6xl max-h-[95vh] p-0 flex flex-col bg-white">
                    {/* Header Section */}
                    <div className="text-center border-b border-gray-300 px-6 py-4 bg-white">
                        <h2 className="text-2xl font-bold text-black mb-1">
                            {project.project_name || 'Pattern Book'}
                        </h2>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">
                            Score Sheet Details
                        </h3>
                        {project.project_data?.startDate && (
                            <p className="text-xs text-gray-500 mt-1">
                                Show Date: {format(parseLocalDate(project.project_data.startDate), 'MM-dd-yyyy')}
                            </p>
                        )}
                    </div>
                    
                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
                        {isLoadingScoreSheets ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="ml-3 text-muted-foreground">Loading score sheets...</span>
                            </div>
                        ) : scoreSheets.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4 items-start">
                                {scoreSheets.map((scoresheet, index) => (
                                    <div 
                                        key={scoresheet.id || index} 
                                        className="border border-gray-300 bg-white overflow-hidden flex flex-col h-full"
                                    >
                                        {/* Pattern Title */}
                                        <div className="bg-gray-50 border-b border-gray-300 px-3 py-3 text-center min-h-[80px] flex flex-col justify-center">
                                            <p className="font-semibold text-sm text-black">
                                                {scoresheet.disciplineName || scoresheet.discipline || 'Score Sheet'}
                                            </p>
                                            {scoresheet.groupName && (
                                                <p className="text-xs text-gray-600 mt-0.5 font-medium">
                                                    {scoresheet.groupName}
                                                </p>
                                            )}
                                            {/* Divisions per Group */}
                                            {scoresheet.divisions && scoresheet.divisions.length > 0 ? (
                                                <div className="mt-2 flex flex-wrap justify-center gap-1">
                                                    {scoresheet.divisions.map((division, divIndex) => {
                                                        const divName = division?.name || '';
                                                        const divAssoc = division?.association || '';
                                                        if (!divName || divName.trim() === '') return null;
                                                        return (
                                                            <span 
                                                                key={`div-${divIndex}`}
                                                                className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                                            >
                                                                {divName}
                                                                {divAssoc && ` (${divAssoc})`}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="mt-2 h-5"></div>
                                            )}
                                        </div>
                                        
                                        {/* Pattern Image */}
                                        <div className="relative bg-white p-4 min-h-[400px] flex items-center justify-center flex-1">
                                            {scoresheet.image_url ? (
                                                <img
                                                    src={scoresheet.image_url}
                                                    alt={scoresheet.file_name || scoresheet.discipline || 'Score Sheet'}
                                                    className="max-w-full max-h-[500px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                                    onClick={() => window.open(scoresheet.image_url, '_blank')}
                                                />
                                            ) : (
                                                <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-300">
                                                    No image available
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Footer Info */}
                                        <div className="bg-gray-50 border-t border-gray-300 px-3 py-2 text-center">
                                            <p className="text-xs text-gray-600">
                                                {scoresheet.file_name || scoresheet.discipline || 'Score Sheet'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No score sheets found for this pattern book.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Patterns Dialog */}
            <Dialog open={patternsDialogOpen} onOpenChange={setPatternsDialogOpen}>
                <DialogContent className="sm:max-w-6xl max-h-[95vh] p-0 flex flex-col bg-white">
                    {/* Header Section */}
                    <div className="text-center border-b border-gray-300 px-6 py-4 bg-white">
                        <h2 className="text-2xl font-bold text-black mb-1">
                            {project.project_name || 'Pattern Book'}
                        </h2>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">
                            Pattern Details
                        </h3>
                        {project.project_data?.startDate && (
                            <p className="text-xs text-gray-500 mt-1">
                                Show Date: {format(parseLocalDate(project.project_data.startDate), 'MM-dd-yyyy')}
                            </p>
                        )}
                    </div>
                    
                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
                        {isLoadingPatterns ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="ml-3 text-muted-foreground">Loading patterns...</span>
                            </div>
                        ) : patterns.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {patterns.map((pattern, index) => (
                                    <div 
                                        key={`${pattern.patternId}-${index}`} 
                                        className="border border-gray-300 bg-white overflow-hidden"
                                    >
                                        {/* Pattern Title */}
                                        <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 text-center">
                                            <p className="font-semibold text-sm text-black">
                                                {pattern.disciplineName || pattern.discipline || 'Pattern'}
                                            </p>
                                            {pattern.groupName && (
                                                <p className="text-xs text-gray-600 mt-0.5 font-medium">
                                                    {pattern.groupName}
                                                </p>
                                            )}
                                            {/* Divisions per Group */}
                                            {pattern.divisions && pattern.divisions.length > 0 && (
                                                <div className="mt-2 flex flex-wrap justify-center gap-1">
                                                    {pattern.divisions.map((division, divIndex) => {
                                                        const divName = division?.name || '';
                                                        const divAssoc = division?.association || '';
                                                        if (!divName || divName.trim() === '') return null;
                                                        return (
                                                            <span 
                                                                key={`div-${divIndex}`}
                                                                className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                                            >
                                                                {divName}
                                                                {divAssoc && ` (${divAssoc})`}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Pattern Image */}
                                        <div className="relative bg-white p-4 min-h-[400px] flex items-center justify-center">
                                            {pattern.imageUrl ? (
                                                <img
                                                    src={pattern.imageUrl}
                                                    alt={pattern.patternName || 'Pattern'}
                                                    className="max-w-full max-h-[500px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                                    onClick={() => window.open(pattern.imageUrl, '_blank')}
                                                />
                                            ) : (
                                                <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-300">
                                                    No image available
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Footer Info */}
                                        <div className="bg-gray-50 border-t border-gray-300 px-3 py-2 text-center">
                                            <p className="text-xs text-gray-600">
                                                {pattern.patternName || `Pattern ${pattern.patternId}`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No patterns found for this pattern book.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Judge Cards Dialog */}
            <Dialog open={judgeCardsDialogOpen} onOpenChange={setJudgeCardsDialogOpen}>
                <DialogContent className="sm:max-w-6xl max-h-[95vh] p-0 flex flex-col bg-white">
                    {/* Header Section */}
                    <div className="text-center border-b border-gray-300 px-6 py-4 bg-white">
                        <h2 className="text-2xl font-bold text-black mb-1">
                            {project.project_name || 'Pattern Book'}
                        </h2>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">
                            Judges Details
                        </h3>
                        {project.project_data?.startDate && (
                            <p className="text-xs text-gray-500 mt-1">
                                Show Date: {format(parseLocalDate(project.project_data.startDate), 'MM-dd-yyyy')}
                            </p>
                        )}
                    </div>
                    
                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
                        {isLoadingJudgeCards ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="ml-3 text-muted-foreground">Loading judge cards...</span>
                            </div>
                        ) : judgeCards.length > 0 ? (
                            <div className="space-y-8">
                                {judgeCards.map((judgeCard, judgeIndex) => (
                                    <div 
                                        key={`judge-${judgeIndex}`} 
                                        className="border border-gray-300 bg-white rounded-lg overflow-hidden"
                                    >
                                        {/* Judge Name Header - Prominent */}
                                        <div className="bg-white border-b-2 border-gray-300 px-6 py-4 flex items-center justify-between">
                                            <h3 className="text-2xl font-bold text-black">
                                                {judgeCard.judgeName}
                                            </h3>
                                            {judgeCard.isAssigned ? (
                                                <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                    Assigned
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                                    Not Assigned
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Judge Assignments */}
                                        <div className="p-6 space-y-6">
                                            {judgeCard.assignments.length > 0 ? (
                                                judgeCard.assignments.map((assignment, assignmentIndex) => (
                                                <div 
                                                    key={`assignment-${assignmentIndex}`}
                                                    className="space-y-4"
                                                >
                                                    {/* Discipline Name */}
                                                    <h4 className="text-xl font-semibold text-black">
                                                        {assignment.disciplineName}
                                                    </h4>
                                                    
                                                    {/* Groups - Horizontal Layout */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {assignment.groups.map((group, groupIndex) => (
                                                            <div 
                                                                key={`group-${groupIndex}`}
                                                                className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col"
                                                            >
                                                                {/* Group Name */}
                                                                <div className="mb-3">
                                                                    <p className="font-semibold text-base text-gray-900">
                                                                        {group.groupName}
                                                                    </p>
                                                                </div>
                                                                
                                                                {/* Divisions - Per Group */}
                                                                <div className="mb-3">
                                                                    <p className="text-xs font-medium text-gray-600 mb-2">Divisions:</p>
                                                                    {group.divisions && group.divisions.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {group.divisions.map((division, divIndex) => {
                                                                                const divName = division?.name || division || '';
                                                                                const divAssoc = division?.association || '';
                                                                                if (!divName || divName.trim() === '') return null;
                                                                                return (
                                                                                    <span 
                                                                                        key={`div-${divIndex}`}
                                                                                        className="inline-block px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                                                                    >
                                                                                        {divName}
                                                                                        {divAssoc && ` (${divAssoc})`}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-400 italic">No divisions assigned</p>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Pattern Image and Name */}
                                                                {group.patternId && (
                                                                    <div className="mt-auto">
                                                                        {group.patternImageUrl ? (
                                                                            <div className="space-y-2">
                                                                                <img
                                                                                    src={group.patternImageUrl}
                                                                                    alt={group.patternName || `Pattern ${group.patternId}`}
                                                                                    className="w-full h-auto border border-gray-200 rounded cursor-pointer hover:opacity-90 transition-opacity"
                                                                                    onClick={() => window.open(group.patternImageUrl, '_blank')}
                                                                                />
                                                                                <div className="text-center">
                                                                                    <p className="text-sm text-gray-900 font-semibold">
                                                                                        {group.patternName || `Pattern ${group.patternId}`}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-center border border-gray-200 rounded p-4 bg-white">
                                                                                <p className="text-sm text-gray-900 font-semibold">
                                                                                    {group.patternName || `Pattern ${group.patternId}`}
                                                                                </p>
                                                                                <p className="text-xs text-gray-400 mt-2">No image available</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-gray-500">
                                                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                                    <p className="text-sm">No assignments for this judge</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No judge assignments found for this pattern book.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Status Change Dialog */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Change Pattern Status</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Select the status for this pattern book:
                        </p>
                        <div className="space-y-2">
                            <button
                                onClick={() => setSelectedStatus('Draft')}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border-2 transition-colors",
                                    selectedStatus === 'Draft'
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <div className="font-medium text-foreground">Draft</div>
                                <div className="text-sm text-muted-foreground mt-1">Pattern is in draft mode</div>
                            </button>
                            <button
                                onClick={() => setSelectedStatus('Approval and Locked')}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border-2 transition-colors",
                                    selectedStatus === 'Approval and Locked'
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <div className="font-medium text-foreground">Approval and Locked</div>
                                <div className="text-sm text-muted-foreground mt-1">Pattern is locked and ready for approval</div>
                            </button>
                            <button
                                onClick={() => setSelectedStatus('Publication')}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border-2 transition-colors",
                                    selectedStatus === 'Publication'
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <div className="font-medium text-foreground">Publication</div>
                                <div className="text-sm text-muted-foreground mt-1">Pattern is published and available</div>
                            </button>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button 
                                variant="outline" 
                                className="flex-1" 
                                onClick={() => setStatusDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                className="flex-1" 
                                onClick={handleSaveStatus} 
                                disabled={isSavingStatus}
                            >
                                {isSavingStatus ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
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

// Active Pattern Book Card Component - matches the image design
const ActivePatternBookCard = ({ project, onRefresh, profile, user }) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isHovered, setIsHovered] = useState(false);
    const [associationsData, setAssociationsData] = useState([]);
    const [patternBookDialogOpen, setPatternBookDialogOpen] = useState(false);
    const [patternsList, setPatternsList] = useState([]);
    const [isLoadingPatternsList, setIsLoadingPatternsList] = useState(false);
    
    const projectData = project.project_data || {};
    const editPath = `/pattern-book-builder/${project.id}`;
    const coverColor = projectData.coverColor || 'hsl(var(--primary))';
    
    // Fetch associations data
    useEffect(() => {
        const fetchAssociations = async () => {
            const { data } = await supabase
                .from('associations')
                .select('id, abbreviation, name, logo')
                .order('name');
            if (data) {
                // Process logos - check if logo is a URL or needs to be constructed
                const processedData = data.map(assoc => ({
                    ...assoc,
                    logo_url: assoc.logo && typeof assoc.logo === 'string' && assoc.logo.startsWith('http') ? assoc.logo : null
                }));
                setAssociationsData(processedData);
            }
        };
        fetchAssociations();
    }, []);
    
    // Extract people data
    const getPeopleData = () => {
        const owner = projectData.adminOwner || profile?.full_name || user?.email || 'Not set';
        const admin = projectData.secondAdmin || projectData.officials?.find(o => o.role === 'admin')?.name || 'Not set';
        
        // Count judges from associationJudges
        let judgesCount = 0;
        Object.values(projectData.associationJudges || {}).forEach(assocData => {
            const judges = assocData?.judges || (Array.isArray(assocData) ? assocData : []);
            judgesCount += Array.isArray(judges) ? judges.length : 0;
        });
        
        // Count staff from officials (excluding judges)
        const officials = projectData.officials || [];
        const staffCount = officials.filter(o => o.role !== 'judge' && o.role !== 'admin').length;
        
        return { owner, admin, judgesCount, staffCount };
    };
    
    const { owner, admin, judgesCount, staffCount } = getPeopleData();
    
    // Get selected associations - they're stored by abbreviation in projectData.associations
    const selectedAssociations = Object.keys(projectData.associations || {}).filter(key => projectData.associations[key]);
    const affiliations = associationsData.filter(a => 
        selectedAssociations.includes(a.id) || selectedAssociations.includes(a.abbreviation)
    );
    
    const handleContinueEditing = () => {
        navigate(editPath);
    };
    
    // Format status for display - map to dropdown options
    const getDisplayStatus = () => {
        const status = (project.status || '').toString().trim();
        // Map status values to dropdown options
        if (status === 'Lock & Approve Mode') {
            return 'Lock & Approve Mode';
        }
        if (status === 'Publication') {
            return 'Publication';
        }
        // Default to Draft (includes 'In progress' and 'Draft')
        return 'Draft';
    };
    
    const displayStatus = getDisplayStatus();
    
    const handleStatusChange = async (newStatus) => {
        try {
            await supabase
                .from('projects')
                .update({ status: newStatus })
                .eq('id', project.id);
            toast({
                title: "Status updated",
                description: `Status changed to ${newStatus === 'Lock & Approve Mode' ? 'Apprvd & Locked' : newStatus}`
            });
            if (onRefresh) onRefresh();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update status",
                variant: "destructive"
            });
        }
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Back paper layers - 3D effect */}
            <div className="absolute top-3 left-2 right-0 bottom-0 z-0">
                {/* Third layer (furthest back) */}
                <div 
                    className="absolute inset-0 rounded-lg border-2 bg-card/30 translate-x-2 translate-y-2"
                    style={{ borderColor: coverColor }}
                />
                {/* Second layer */}
                <div 
                    className="absolute inset-0 rounded-lg border-2 bg-card/50 translate-x-1 translate-y-1"
                    style={{ borderColor: coverColor }}
                />
            </div>

            {/* Folder Tab - small tab on left */}
            <div className="flex items-end relative z-20">
                <div 
                    className="h-5 w-16 rounded-t-md border-2 border-b-0 bg-card/80"
                    style={{ borderColor: coverColor }}
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
                        stroke={coverColor} 
                        strokeWidth="2"
                    />
                </svg>
            </div>
            
            {/* Folder Body - main front panel */}
            <div 
                className="flex-grow rounded-lg rounded-tl-none shadow-xl overflow-hidden relative bg-card/90 backdrop-blur-sm border-2 z-20"
                style={{ borderColor: coverColor }}
            >
                {/* Header Section */}
                <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <BookCopy className="h-5 w-5 text-primary shrink-0" />
                            <h3 className="text-lg font-bold text-foreground">
                                {project.project_name || 'Untitled Project'}
                            </h3>
                        </div>
                        {/* Horse Show Logo Placeholder */}
                        <div className="w-16 h-16 bg-primary/10 border-2 border-primary/30 rounded-full flex items-center justify-center">
                            <BookCopy className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex gap-2 mb-4">
                        <button 
                            onClick={() => setPatternBookDialogOpen(true)}
                            className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary/90 cursor-pointer"
                        >
                            Pattern Book
                        </button>
                        <button className="px-3 py-1.5 bg-transparent border border-primary/30 text-muted-foreground text-sm font-medium rounded-full hover:bg-primary/20">
                            Results
                        </button>
                    </div>
                </div>
                
                {/* Main Content - Two Columns */}
                <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - People */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">People:</h4>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-muted-foreground">Owner</span>
                                <span className="font-medium text-foreground ml-auto">{owner}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-muted-foreground">Admin</span>
                                <span className="font-medium text-foreground ml-auto">{admin}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="relative">
                                    <Users className="h-4 w-4 text-primary shrink-0" />
                                    <span className="absolute -top-1 -right-1 text-[8px] text-primary">*</span>
                                </div>
                                <span className="text-muted-foreground">Judges</span>
                                <span className="font-medium text-foreground ml-auto">{judgesCount} Assigned</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="relative">
                                    <Users className="h-4 w-4 text-primary shrink-0" />
                                    <span className="absolute -top-1 -right-1 text-[8px] text-primary">*</span>
                                </div>
                                <span className="text-muted-foreground">Staff</span>
                                <span className="font-medium text-foreground ml-auto">{staffCount} Assigned</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column - Affiliations */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">Affiliated with:</h4>
                        <div className="flex flex-wrap gap-2">
                            {affiliations.length > 0 ? (
                                affiliations.map(assoc => {
                                    // Check if logo is a URL or needs to be constructed
                                    const logoUrl = assoc.logo_url || (assoc.logo && typeof assoc.logo === 'string' && assoc.logo.startsWith('http') ? assoc.logo : null);
                                    // If only one association, make logo bigger
                                    const isSingleAssociation = affiliations.length === 1;
                                    return (
                                        <div key={assoc.id} className="flex items-center">
                                            {logoUrl ? (
                                                <img 
                                                    src={logoUrl} 
                                                    alt={assoc.name} 
                                                    className={isSingleAssociation 
                                                        ? "h-12 w-auto max-w-[180px] object-contain" 
                                                        : "h-8 w-auto max-w-[120px] object-contain"
                                                    } 
                                                />
                                            ) : (
                                                <div className={isSingleAssociation 
                                                    ? "h-12 px-4 bg-primary/20 border border-primary/30 rounded flex items-center" 
                                                    : "h-8 px-3 bg-primary/20 border border-primary/30 rounded flex items-center"
                                                }>
                                                    <span className={isSingleAssociation 
                                                        ? "text-sm font-medium text-primary" 
                                                        : "text-xs font-medium text-primary"
                                                    }>{assoc.abbreviation || assoc.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-muted-foreground">No affiliations</p>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Footer Section */}
                <div className="px-4 pb-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">
                            Last saved: {format(new Date(project.updated_at), "MMM d, yyyy")}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <Select value={displayStatus} onValueChange={handleStatusChange}>
                                <SelectTrigger 
                                    className={`text-sm font-medium py-1.5 h-auto focus:ring-2 focus:ring-primary cursor-pointer transition-colors ${
                                        displayStatus === 'Lock & Approve Mode' 
                                            ? 'bg-green-600 text-white pl-8 pr-8 border border-green-700/50 [&>svg]:hidden' 
                                            : displayStatus === 'Publication' 
                                                ? 'bg-green-500 text-white pl-3 pr-8 border border-green-600/50' 
                                                : 'bg-background border border-primary/30 text-foreground pl-3 pr-8'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {displayStatus === 'Lock & Approve Mode' && (
                                            <Lock className="h-3.5 w-3.5 text-white" />
                                        )}
                                        <SelectValue>
                                            {displayStatus === 'Lock & Approve Mode' ? 'Apprvd & Locked' : displayStatus}
                                        </SelectValue>
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-popover border border-border">
                                    <SelectItem 
                                        value="Draft"
                                        className="cursor-pointer focus:bg-primary focus:text-primary-foreground"
                                    >
                                        Draft
                                    </SelectItem>
                                    <SelectItem 
                                        value="Lock & Approve Mode"
                                        className="cursor-pointer focus:bg-primary focus:text-primary-foreground"
                                    >
                                        Apprvd & Locked
                                    </SelectItem>
                                    <SelectItem 
                                        value="Publication"
                                        className="cursor-pointer focus:bg-primary focus:text-primary-foreground"
                                    >
                                        Publication
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Continue Editing Button - Only show when status is Draft */}
                    {displayStatus === 'Draft' && (
                        <Button 
                            onClick={handleContinueEditing} 
                            className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                        >
                            Continue Editing <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Pattern Book Dialog */}
            <Dialog open={patternBookDialogOpen} onOpenChange={setPatternBookDialogOpen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
                    <PatternBookDialogContent 
                        project={project}
                        profile={profile}
                        user={user}
                        associationsData={associationsData}
                        onClose={() => setPatternBookDialogOpen(false)}
                        onRefresh={onRefresh}
                    />
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};

// Pattern Book Dialog Content Component
const PatternBookDialogContent = ({ project, profile, user, associationsData, onClose, onRefresh }) => {
    const [activeTab, setActiveTab] = useState('patternBook');
    const [activeSubTab, setActiveSubTab] = useState('patterns');
    const [patterns, setPatterns] = useState([]);
    const [scoresheets, setScoresheets] = useState([]);
    const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
    const [isLoadingScoresheets, setIsLoadingScoresheets] = useState(false);
    const [selectedSidebarItem, setSelectedSidebarItem] = useState('allItems');
    const [filterDiscipline, setFilterDiscipline] = useState('all');
    const [filterClass, setFilterClass] = useState('all');
    const [filterJudge, setFilterJudge] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [previewItem, setPreviewItem] = useState(null); // For pattern/scoresheet preview modal
    const [previewType, setPreviewType] = useState(null); // 'pattern' or 'scoresheet'
    const [previewImage, setPreviewImage] = useState(null); // Image URL for preview
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [projectStatus, setProjectStatus] = useState(project.status || 'Draft'); // Local status state
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    
    const projectData = project.project_data || {};
    const { toast } = useToast();
    
    // Handle status change
    const handleStatusChange = async (newStatus) => {
        setIsUpdatingStatus(true);
        try {
            await supabase
                .from('projects')
                .update({ status: newStatus })
                .eq('id', project.id);
            
            setProjectStatus(newStatus);
            
            toast({
                title: "Status updated",
                description: `Pattern book status changed to ${newStatus === 'Lock & Approve Mode' ? 'Apprvd & Locked' : newStatus}`
            });
            
            // Refresh parent component if callback provided
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast({
                title: "Error",
                description: "Failed to update status",
                variant: "destructive"
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    };
    
    // Format status for display
    const getDisplayStatus = () => {
        return projectStatus || 'Draft';
    };
    
    const displayStatus = getDisplayStatus();
    
    // Handle preview button click
    const handleViewPattern = async (pattern) => {
        setPreviewItem(pattern);
        setPreviewType('pattern');
        setIsLoadingPreview(true);
        setPreviewImage(null);
        
        try {
            // Get pattern image (same as download logic)
            let imageUrl = pattern.image_url || null;
            
            if (!imageUrl && pattern.numericId) {
                const { data: imageData } = await supabase
                    .from('tbl_pattern_media')
                    .select('image_url')
                    .eq('pattern_id', pattern.numericId)
                    .maybeSingle();
                
                imageUrl = imageData?.image_url || null;
            }
            
            setPreviewImage(imageUrl);
        } catch (error) {
            console.error('Error loading pattern image:', error);
        } finally {
            setIsLoadingPreview(false);
        }
    };
    
    const handleViewScoresheet = async (scoresheet) => {
        setPreviewItem(scoresheet);
        setPreviewType('scoresheet');
        setIsLoadingPreview(true);
        setPreviewImage(null);
        
        try {
            // Get scoresheet image (same as download logic)
            let imageUrl = scoresheet.image_url || null;
            
            if (!imageUrl && scoresheet.id) {
                let numericId = null;
                if (typeof scoresheet.id === 'number') {
                    numericId = scoresheet.id;
                } else if (typeof scoresheet.id === 'string' && !isNaN(parseInt(scoresheet.id))) {
                    numericId = parseInt(scoresheet.id);
                }
                
                if (numericId) {
                    const { data: scoresheetData } = await supabase
                        .from('tbl_scoresheet')
                        .select('image_url')
                        .eq('id', numericId)
                        .maybeSingle();
                    
                    imageUrl = scoresheetData?.image_url || null;
                }
            }
            
            setPreviewImage(imageUrl);
        } catch (error) {
            console.error('Error loading scoresheet image:', error);
        } finally {
            setIsLoadingPreview(false);
        }
    };
    
    // Download pattern handler
    const handleDownloadPattern = async (pattern) => {
        try {
            console.log('Downloading pattern:', pattern);
            
            // If pattern has pdf_url or download_url, download directly (as local file)
            const downloadUrl = pattern.pdf_url || pattern.download_url || pattern.image_url;
            if (downloadUrl) {
                try {
                    const response = await fetch(downloadUrl);
                    if (!response.ok) throw new Error('Failed to fetch file');
                    
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    
                    const fileName = pattern.patternName || pattern.name || 'pattern.pdf';
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    window.URL.revokeObjectURL(blobUrl);
                    
                    toast({
                        title: "Download started",
                        description: "Pattern download initiated"
                    });
                    return;
                } catch (fetchError) {
                    console.error('Error downloading pattern file:', fetchError);
                    // Continue to try database fetch
                }
            }
            
            // Extract numeric pattern ID from various formats
            // First check if we stored numericId directly
            let numericPatternId = pattern.numericId || null;
            
            // If not, try to extract from pattern.id
            if (!numericPatternId && pattern.id) {
                if (typeof pattern.id === 'number') {
                    numericPatternId = pattern.id;
                } else if (typeof pattern.id === 'string') {
                    // Handle formats like "pattern-1-ALL" or "123"
                    if (pattern.id.includes('-')) {
                        const match = pattern.id.match(/\d+/);
                        if (match) {
                            numericPatternId = parseInt(match[0]);
                        }
                    } else if (!isNaN(parseInt(pattern.id))) {
                        numericPatternId = parseInt(pattern.id);
                    }
                }
            }
            
            // Also try originalPatternId if available
            if (!numericPatternId && pattern.originalPatternId) {
                if (typeof pattern.originalPatternId === 'number') {
                    numericPatternId = pattern.originalPatternId;
                } else if (typeof pattern.originalPatternId === 'string') {
                    if (pattern.originalPatternId.includes('-')) {
                        const match = pattern.originalPatternId.match(/\d+/);
                        if (match) {
                            numericPatternId = parseInt(match[0]);
                        }
                    } else if (!isNaN(parseInt(pattern.originalPatternId))) {
                        numericPatternId = parseInt(pattern.originalPatternId);
                    }
                }
            }
            
            console.log('Extracted numeric pattern ID:', numericPatternId, 'from pattern:', pattern);
            
            // Step 2: If we have numeric ID, fetch image from tbl_pattern_media (same as Step6_Preview.jsx)
            if (numericPatternId) {
                // First, verify pattern exists in tbl_patterns (same as Step6_Preview)
                const { data: patternData, error: patternError } = await supabase
                    .from('tbl_patterns')
                    .select('id, pdf_file_name')
                    .eq('id', numericPatternId)
                    .maybeSingle();
                
                if (patternError) {
                    console.error('Error fetching pattern from tbl_patterns:', patternError);
                }
                
                if (!patternData) {
                    console.log('Pattern not found in tbl_patterns. ID:', numericPatternId);
                    toast({
                        title: "Download not available",
                        description: `Pattern with ID ${numericPatternId} not found in database`,
                        variant: "destructive"
                    });
                    return;
                }
                
                // Step 3: Fetch image from tbl_pattern_media using pattern_id (exactly like Step6_Preview.jsx)
                const { data: imageData, error: imageError } = await supabase
                    .from('tbl_pattern_media')
                    .select('image_url')
                    .eq('pattern_id', numericPatternId)
                    .maybeSingle();
                
                if (imageError) {
                    console.error('Error fetching pattern image:', imageError);
                }
                
                const imageUrl = imageData?.image_url || null;
                
                if (imageUrl) {
                    // Fetch the file and create a blob for proper local download (not opening in new tab)
                    try {
                        const response = await fetch(imageUrl);
                        if (!response.ok) throw new Error('Failed to fetch file');
                        
                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        
                        // Determine filename
                        const fileName = patternData.pdf_file_name || pattern.patternName || pattern.name || 'pattern.pdf';
                        
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Clean up blob URL
                        window.URL.revokeObjectURL(blobUrl);
                        
                        toast({
                            title: "Download started",
                            description: "Pattern download initiated"
                        });
                        return;
                    } catch (fetchError) {
                        console.error('Error downloading pattern file:', fetchError);
                        toast({
                            title: "Download failed",
                            description: "Failed to download pattern file",
                            variant: "destructive"
                        });
                        return;
                    }
                } else {
                    toast({
                        title: "Download not available",
                        description: "Pattern image not found in database",
                        variant: "destructive"
                    });
                }
            } else {
                console.log('No valid numeric pattern ID found. Pattern ID:', pattern.id);
                toast({
                    title: "Download not available",
                    description: "Pattern ID is not valid for download",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error downloading pattern:', error);
            toast({
                title: "Download failed",
                description: error.message || "Failed to download pattern",
                variant: "destructive"
            });
        }
    };
    
    // Download scoresheet handler - Same logic as Step6_Preview.jsx
    const handleDownloadScoresheet = async (scoresheet) => {
        try {
            console.log('Downloading scoresheet:', scoresheet);
            
            // Step 1: Get scoresheet image_url (same as Step6_Preview fetches scoresheet images)
            let imageUrl = scoresheet.image_url || null;
            
            // Step 2: If no image_url, try to fetch from database (same as Step6_Preview)
            if (!imageUrl) {
                // Try by ID first
                if (scoresheet.id) {
                    let numericId = null;
                    if (typeof scoresheet.id === 'number') {
                        numericId = scoresheet.id;
                    } else if (typeof scoresheet.id === 'string') {
                        // Handle string IDs like "scoresheet-0-1-Western Riding"
                        if (scoresheet.id.startsWith('scoresheet-')) {
                            // Try to extract numeric ID if present
                            const match = scoresheet.id.match(/\d+/);
                            if (match) {
                                numericId = parseInt(match[0]);
                            }
                        } else if (!isNaN(parseInt(scoresheet.id))) {
                            numericId = parseInt(scoresheet.id);
                        }
                    }
                    
                    if (numericId) {
                        const { data: scoresheetData, error: scoresheetError } = await supabase
                            .from('tbl_scoresheet')
                            .select('id, image_url, file_name, storage_path')
                            .eq('id', numericId)
                            .maybeSingle();
                        
                        if (scoresheetError) {
                            console.error('Error fetching scoresheet by ID:', scoresheetError);
                        }
                        
                        if (scoresheetData && scoresheetData.image_url) {
                            imageUrl = scoresheetData.image_url;
                        }
                    }
                }
                
                // Fallback: Try to fetch by discipline and association (same as Step6_Preview)
                if (!imageUrl && scoresheet.disciplineName && associationsData.length > 0) {
                    // Get association from discipline
                    const discipline = projectData.disciplines?.[scoresheet.disciplineIndex];
                    const associationId = discipline?.association_id || 
                        (discipline?.selectedAssociations ? 
                         Object.keys(discipline.selectedAssociations).find(key => discipline.selectedAssociations[key]) : null);
                    const association = associationsData.find(a => a.id === associationId);
                    const associationAbbrev = association?.abbreviation;
                    
                    if (associationAbbrev && scoresheet.disciplineName) {
                        try {
                            const { data: scoresheetData, error: scoresheetError } = await supabase
                                .from('tbl_scoresheet')
                                .select('id, image_url, file_name, storage_path, discipline, association_abbrev')
                                .eq('association_abbrev', associationAbbrev)
                                .eq('discipline', scoresheet.disciplineName)
                                .limit(1)
                                .maybeSingle();
                            
                            if (!scoresheetError && scoresheetData && scoresheetData.image_url) {
                                imageUrl = scoresheetData.image_url;
                            }
                        } catch (err) {
                            console.error('Error fetching scoresheet by discipline:', err);
                        }
                    }
                }
            }
            
            // Step 3: Download the file as local file (not opening in new tab)
            if (imageUrl) {
                try {
                    const response = await fetch(imageUrl);
                    if (!response.ok) throw new Error('Failed to fetch file');
                    
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    
                    // Determine filename from storage_path or file_name
                    let fileName = 'scoresheet.png';
                    if (scoresheet.storage_path) {
                        fileName = scoresheet.storage_path.split('/').pop() || fileName;
                    } else if (scoresheet.file_name) {
                        fileName = scoresheet.file_name;
                    } else if (scoresheet.displayName) {
                        fileName = scoresheet.displayName;
                    } else {
                        // Extract from URL
                        const urlParts = imageUrl.split('/');
                        fileName = urlParts[urlParts.length - 1] || fileName;
                    }
                    
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Clean up blob URL
                    window.URL.revokeObjectURL(blobUrl);
                    
                    toast({
                        title: "Download started",
                        description: "Scoresheet download initiated"
                    });
                } catch (fetchError) {
                    console.error('Error downloading scoresheet file:', fetchError);
                    toast({
                        title: "Download failed",
                        description: "Failed to download scoresheet file",
                        variant: "destructive"
                    });
                }
            } else {
                toast({
                    title: "Download not available",
                    description: "Scoresheet file not found in database",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error downloading scoresheet:', error);
            toast({
                title: "Download failed",
                description: error.message || "Failed to download scoresheet",
                variant: "destructive"
            });
        }
    };
    
    // Get unique disciplines from project_data.disciplines (the source of truth)
    // This ensures we show all disciplines that exist in the project, not just those with patterns/scoresheets
    const uniqueDisciplines = [...new Set((projectData.disciplines || []).map(d => d.name))].filter(Boolean).sort();
    
    // Get unique classes from both patterns AND scoresheets
    const allClassesFromPatterns = [...new Set(patterns.map(p => p.groupName))];
    const allClassesFromScoresheets = [...new Set(scoresheets.map(s => s.groupName))];
    const uniqueClasses = [...new Set([...allClassesFromPatterns, ...allClassesFromScoresheets])].filter(Boolean).sort();
    
    // Get unique judges from patterns, scoresheets, and project data (associationJudges)
    const allJudgesFromPatterns = patterns.flatMap(p => p.judges || []);
    const allJudgesFromScoresheets = scoresheets.flatMap(s => s.judges || []);
    const allJudgesFromProjectData = Object.values(projectData.associationJudges || {}).flatMap(assoc => 
        (assoc?.judges || []).map(j => j?.name).filter(Boolean)
    );
    const uniqueJudges = [...new Set([...allJudgesFromPatterns, ...allJudgesFromScoresheets, ...allJudgesFromProjectData])].filter(Boolean).sort();
    
    // Filter patterns based on selected filters
    const filteredPatterns = patterns.filter(pattern => {
        if (filterDiscipline !== 'all' && pattern.discipline !== filterDiscipline) return false;
        if (filterClass !== 'all' && pattern.groupName !== filterClass) return false;
        if (filterJudge !== 'all') {
            // Check both judges array and judgeNames string
            const hasJudge = (pattern.judges && pattern.judges.includes(filterJudge)) ||
                             (pattern.judgeNames && pattern.judgeNames.includes(filterJudge));
            if (!hasJudge) return false;
        }
        return true;
    }).sort((a, b) => {
        if (sortBy === 'newest') {
            return (b.numericId || b.id || 0) - (a.numericId || a.id || 0);
        } else if (sortBy === 'oldest') {
            return (a.numericId || a.id || 0) - (b.numericId || b.id || 0);
        } else if (sortBy === 'name') {
            return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
    });
    
    // Filter scoresheets based on selected filters (same filters)
    const filteredScoresheets = scoresheets.filter(scoresheet => {
        if (filterDiscipline !== 'all' && scoresheet.disciplineName !== filterDiscipline) return false;
        if (filterClass !== 'all' && scoresheet.groupName !== filterClass) return false;
        if (filterJudge !== 'all') {
            const hasJudge = (scoresheet.judges && scoresheet.judges.includes(filterJudge)) ||
                             (scoresheet.judgeNames && scoresheet.judgeNames.includes(filterJudge));
            if (!hasJudge) return false;
        }
        return true;
    });
    
    // Fetch data when dialog opens or tabs change
    useEffect(() => {
        if (activeTab === 'patternBook' && activeSubTab === 'patterns') {
            fetchPatterns();
        } else if (activeTab === 'patternBook' && activeSubTab === 'scoreSheets') {
            fetchScoresheets();
        }
    }, [activeTab, activeSubTab]);
    
    const fetchPatterns = async () => {
        setIsLoadingPatterns(true);
        try {
            const disciplines = projectData.disciplines || [];
            const patternSelections = projectData.patternSelections || {};
            const patternsList = [];
            const processedPatterns = new Set();
            
            console.log('=== FETCHING PATTERNS ===');
            console.log('Full project_data:', JSON.stringify(projectData, null, 2));
            console.log('Disciplines:', disciplines);
            console.log('Pattern selections:', patternSelections);
            
            // Collect numeric pattern IDs for database lookup
            const numericPatternIds = new Set();
            
            // First pass: collect numeric pattern IDs from all possible patternSelections structures
            // Iterate through all patternSelections keys to find patterns
            Object.keys(patternSelections).forEach(disciplineKey => {
                const disciplineSelections = patternSelections[disciplineKey];
                if (!disciplineSelections || typeof disciplineSelections !== 'object') return;
                
                // Iterate through all groups in this discipline selection
                Object.keys(disciplineSelections).forEach(groupKey => {
                    const patternSelection = disciplineSelections[groupKey];
                    if (!patternSelection) return;
                    
                    const patternId = typeof patternSelection === 'object' 
                        ? (patternSelection.patternId || patternSelection.id || patternSelection.pattern_id) 
                        : patternSelection;
                    
                    // Try to extract numeric ID
                    if (patternId) {
                        if (typeof patternId === 'string' && patternId.includes('-')) {
                            const match = patternId.match(/\d+/);
                            if (match) {
                                numericPatternIds.add(parseInt(match[0]));
                            }
                        } else if (!isNaN(parseInt(patternId))) {
                            numericPatternIds.add(parseInt(patternId));
                        }
                    }
                });
            });
            
            // Also try the old structure (by index/id/name) for backward compatibility
            for (let disciplineIndex = 0; disciplineIndex < disciplines.length; disciplineIndex++) {
                const discipline = disciplines[disciplineIndex];
                const disciplineName = discipline.name || 'Unknown Discipline';
                const associationId = discipline.association_id || 
                    (discipline.selectedAssociations ? Object.keys(discipline.selectedAssociations).find(key => discipline.selectedAssociations[key]) : null);
                
                let disciplineSelections = patternSelections[disciplineIndex] 
                    || patternSelections[`${disciplineIndex}`]
                    || patternSelections[discipline.id] 
                    || patternSelections[discipline.name];
                
                // Try to find by matching key format
                if (!disciplineSelections && disciplineName && associationId) {
                    const disciplineNameNormalized = disciplineName.replace(/\s+/g, '-');
                    const matchingKey = Object.keys(patternSelections).find(key => {
                        return key.includes(disciplineNameNormalized) && key.includes(associationId);
                    });
                    if (matchingKey) {
                        disciplineSelections = patternSelections[matchingKey];
                    }
                }
                
                if (!disciplineSelections) continue;
                
                const groups = discipline.patternGroups || [];
                for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                    const group = groups[groupIndex];
                    const groupId = group.id || `pattern-group-${groupIndex}`;
                    
                    let patternSelection = disciplineSelections[groupIndex]
                        || disciplineSelections[`${groupIndex}`]
                        || disciplineSelections[groupId]
                        || disciplineSelections[group.id];
                    
                    // Try to find by group ID pattern
                    if (!patternSelection && groupId) {
                        const matchingGroupKey = Object.keys(disciplineSelections).find(key => {
                            return key === groupId || key.includes('pattern-group') || key === `group-${groupIndex}`;
                        });
                        if (matchingGroupKey) {
                            patternSelection = disciplineSelections[matchingGroupKey];
                        }
                    }
                    
                    if (!patternSelection) continue;
                    
                    const patternId = typeof patternSelection === 'object' 
                        ? (patternSelection.patternId || patternSelection.id || patternSelection.pattern_id) 
                        : patternSelection;
                    
                    // Try to extract numeric ID
                    if (patternId) {
                        if (typeof patternId === 'string' && patternId.includes('-')) {
                            const match = patternId.match(/\d+/);
                            if (match) {
                                numericPatternIds.add(parseInt(match[0]));
                            }
                        } else if (!isNaN(parseInt(patternId))) {
                            numericPatternIds.add(parseInt(patternId));
                        }
                    }
                }
            }
            
            // Fetch pattern details from database for numeric IDs (including file URLs and images)
            let patternDetailsMap = {};
            if (numericPatternIds.size > 0) {
                // First try to get from tbl_pattern_media for images and PDF URLs
                const { data: patternMediaData } = await supabase
                    .from('tbl_pattern_media')
                    .select('pattern_id, image_url, pdf_url, file_url')
                    .in('pattern_id', Array.from(numericPatternIds));
                
                if (patternMediaData) {
                    patternMediaData.forEach(pm => {
                        patternDetailsMap[pm.pattern_id] = {
                            image_url: pm.image_url,
                            pdf_url: pm.pdf_url || pm.file_url || pm.image_url,
                            download_url: pm.pdf_url || pm.file_url || pm.image_url
                        };
                    });
                }
                
                // Then get pattern details from tbl_patterns
                const { data: patternData, error: patDetailError } = await supabase
                    .from('tbl_patterns')
                    .select('id, pdf_file_name, pattern_version, discipline, association_id, url, image_url, pdf_url')
                    .in('id', Array.from(numericPatternIds));
                
                if (!patDetailError && patternData) {
                    patternData.forEach(p => {
                        if (patternDetailsMap[p.id]) {
                            patternDetailsMap[p.id] = {
                                ...patternDetailsMap[p.id],
                                ...p,
                                // Keep image_url from media if available, otherwise use from patterns
                                image_url: patternDetailsMap[p.id].image_url || p.image_url,
                                pdf_url: patternDetailsMap[p.id].pdf_url || p.pdf_url || p.url || p.image_url,
                                download_url: patternDetailsMap[p.id].download_url || p.pdf_url || p.url || p.image_url
                            };
                        } else {
                            patternDetailsMap[p.id] = {
                                ...p,
                                image_url: p.image_url,
                                pdf_url: p.pdf_url || p.url || p.image_url,
                                download_url: p.pdf_url || p.url || p.image_url
                            };
                        }
                    });
                }
                
                // Also fetch from tbl_pattern_media if we still don't have image_url or pdf_url
                const missingData = Array.from(numericPatternIds).filter(id => 
                    !patternDetailsMap[id] || (!patternDetailsMap[id].image_url && !patternDetailsMap[id].pdf_url)
                );
                if (missingData.length > 0) {
                    const { data: additionalMedia } = await supabase
                        .from('tbl_pattern_media')
                        .select('pattern_id, pdf_url, file_url, image_url')
                        .in('pattern_id', missingData);
                    
                    if (additionalMedia) {
                        additionalMedia.forEach(pm => {
                            if (!patternDetailsMap[pm.pattern_id]) {
                                patternDetailsMap[pm.pattern_id] = {};
                            }
                            if (!patternDetailsMap[pm.pattern_id].image_url && pm.image_url) {
                                patternDetailsMap[pm.pattern_id].image_url = pm.image_url;
                            }
                            if (!patternDetailsMap[pm.pattern_id].pdf_url) {
                                patternDetailsMap[pm.pattern_id].pdf_url = pm.pdf_url || pm.file_url || pm.image_url;
                            }
                            if (!patternDetailsMap[pm.pattern_id].download_url) {
                                patternDetailsMap[pm.pattern_id].download_url = pm.pdf_url || pm.file_url || pm.image_url;
                            }
                        });
                    }
                }
                console.log('Fetched pattern details from DB:', patternDetailsMap);
            }
            
            // Build patterns list with all details from project_data
            for (let disciplineIndex = 0; disciplineIndex < disciplines.length; disciplineIndex++) {
                const discipline = disciplines[disciplineIndex];
                
                // Get discipline name
                const disciplineName = discipline.name || 'Unknown Discipline';
                
                // Get association for this discipline
                const associationId = discipline.association_id || 
                    (discipline.selectedAssociations ? Object.keys(discipline.selectedAssociations).find(key => discipline.selectedAssociations[key]) : null) ||
                    (discipline.associations ? Object.keys(discipline.associations).find(key => discipline.associations[key]) : null);
                
                // Try multiple ways to find discipline selections
                // First try by direct discipline.id (most reliable for unique discipline keys like "VRH-RHC-Ranch-Reining-AQHA-1767684438175")
                let disciplineSelections = patternSelections[discipline.id];
                
                // Then try by index or string index
                if (!disciplineSelections) {
                    disciplineSelections = patternSelections[disciplineIndex] 
                        || patternSelections[`${disciplineIndex}`]
                        || patternSelections[discipline.name];
                }
                
                // If not found, try to find by matching key format: "Discipline-Name-Association-Timestamp"
                if (!disciplineSelections && disciplineName && associationId) {
                    const disciplineNameNormalized = disciplineName.replace(/\s+/g, '-');
                    const associationAbbrev = associationId;
                    
                    // Find matching key in patternSelections - check all possible matching strategies
                    const matchingKey = Object.keys(patternSelections).find(key => {
                        // Skip numeric keys (indices)
                        if (!isNaN(parseInt(key))) return false;
                        // Match format: "Discipline-Name-Association-..." or "Discipline-Name-AssociationAbbrev-..."
                        const keyNormalized = key.toLowerCase();
                        const disciplineNormalized = disciplineNameNormalized.toLowerCase();
                        return keyNormalized.includes(disciplineNormalized) && keyNormalized.includes(associationAbbrev.toLowerCase());
                    });
                    
                    if (matchingKey) {
                        disciplineSelections = patternSelections[matchingKey];
                        console.log(`Found patternSelections for ${disciplineName} using key: ${matchingKey}`);
                    }
                }
                
                if (!disciplineSelections) {
                    console.log(`No selections for discipline index ${disciplineIndex}: ${disciplineName}`);
                    console.log('Available patternSelections keys:', Object.keys(patternSelections));
                    continue;
                }
                
                const groups = discipline.patternGroups || [];
                const groupJudges = projectData.groupJudges?.[disciplineIndex] || projectData.groupJudges?.[`${disciplineIndex}`] || {};
                
                console.log(`Processing discipline ${disciplineIndex}: ${disciplineName} with ${groups.length} groups`);
                console.log(`Discipline selections keys:`, Object.keys(disciplineSelections));
                
                for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                    const group = groups[groupIndex];
                    const groupName = group.name || `Group ${groupIndex + 1}`;
                    const groupId = group.id || `pattern-group-${groupIndex}`;
                    
                    // Try multiple ways to find pattern selection
                    let patternSelection = disciplineSelections[groupIndex]
                        || disciplineSelections[`${groupIndex}`]
                        || disciplineSelections[groupId]
                        || disciplineSelections[group.id]
                        || (Array.isArray(disciplineSelections) ? disciplineSelections[groupIndex] : null);
                    
                    // If not found, try to find by group ID pattern (e.g., "pattern-group-1767684453160")
                    if (!patternSelection && groupId) {
                        const matchingGroupKey = Object.keys(disciplineSelections).find(key => {
                            return key === groupId || key.includes('pattern-group') || key === `group-${groupIndex}`;
                        });
                        
                        if (matchingGroupKey) {
                            patternSelection = disciplineSelections[matchingGroupKey];
                            console.log(`Found pattern selection for group ${groupName} using key: ${matchingGroupKey}`);
                        }
                    }
                    
                    if (!patternSelection) {
                        console.log(`No pattern selection for group ${groupIndex} (${groupName}, id: ${groupId}) in discipline ${disciplineIndex}`);
                        console.log(`Available group keys in disciplineSelections:`, Object.keys(disciplineSelections));
                        continue;
                    }
                    
                    console.log(`Found pattern selection for group ${groupName}:`, patternSelection);
                    
                    // Get pattern ID - could be numeric or string
                    let patternId = typeof patternSelection === 'object' 
                        ? (patternSelection.patternId || patternSelection.id || patternSelection.pattern_id) 
                        : patternSelection;
                    
                    // Get version from patternSelection if available
                    const patternVersion = typeof patternSelection === 'object' 
                        ? (patternSelection.version || patternSelection.patternVersion || patternSelection.pattern_version || 'ALL')
                        : 'ALL';
                    
                    // Extract numeric ID if possible
                    let numericPatternId = null;
                    if (patternId) {
                        if (typeof patternId === 'string' && patternId.includes('-')) {
                            const match = patternId.match(/\d+/);
                            if (match) {
                                numericPatternId = parseInt(match[0]);
                            }
                        } else if (!isNaN(parseInt(patternId))) {
                            numericPatternId = parseInt(patternId);
                        }
                    }
                    
                    console.log(`Pattern ID: ${patternId}, Numeric ID: ${numericPatternId}, Version: ${patternVersion}`);
                    
                    // Get pattern detail from database if we have numeric ID
                    const patternDetail = numericPatternId ? patternDetailsMap[numericPatternId] : null;
                    
                    if (patternDetail) {
                        console.log(`Found pattern detail in DB:`, patternDetail);
                    } else if (numericPatternId) {
                        console.log(`Pattern ${numericPatternId} not found in database`);
                    }
                    
                    // Extract divisions for this group
                    const divisions = Array.isArray(group.divisions) ? group.divisions : [];
                    const extractedDivisions = divisions.map(div => {
                        if (typeof div === 'string') {
                            return { name: div, association: '' };
                        } else if (div && typeof div === 'object') {
                            return {
                                name: div.name || div.divisionName || div.division || div.title || '',
                                association: div.association || div.assocName || (div.association_id ? div.association_id : '')
                            };
                        } else {
                            return { name: String(div || ''), association: '' };
                        }
                    }).filter(div => div.name && div.name.trim() !== '');
                    
                    // Get pattern name - prioritize patternSelection.patternName, then database, then fallback
                    let patternDisplayName = '';
                    
                    // First, check if patternSelection has patternName (from project_data)
                    if (typeof patternSelection === 'object' && patternSelection.patternName) {
                        patternDisplayName = patternSelection.patternName;
                        // Clean up the name (remove .pdf extension if present)
                        if (patternDisplayName.endsWith('.pdf')) {
                            patternDisplayName = patternDisplayName.replace('.pdf', '');
                        }
                        patternDisplayName = patternDisplayName.replace(/_/g, ' ').trim();
                    }
                    // Second, check database patternDetail
                    else if (patternDetail && patternDetail.pdf_file_name) {
                        patternDisplayName = patternDetail.pdf_file_name.replace('.pdf', '').replace(/_/g, ' ').trim();
                    }
                    // Third, try to use patternId if it's meaningful
                    else if (patternId) {
                        if (typeof patternId === 'string' && patternId.length > 0 && !patternId.match(/^pattern-?\d+/i)) {
                            // Use patternId as name if it's a meaningful string identifier
                            patternDisplayName = patternId;
                        } else if (typeof patternId === 'number' || (typeof patternId === 'string' && !isNaN(parseInt(patternId)))) {
                            // If it's just a number, use it with "Pattern" prefix
                            const numId = typeof patternId === 'number' ? patternId : parseInt(patternId);
                            patternDisplayName = `Pattern ${numId}`;
                        } else {
                            patternDisplayName = `Pattern ${numericPatternId || patternsList.length + 1}`;
                        }
                    }
                    // Last resort: use numeric ID or index
                    else {
                        patternDisplayName = `Pattern ${numericPatternId || patternsList.length + 1}`;
                    }
                    
                    // Use patternDisplayName as the main name (discipline is shown separately in UI)
                    // Only add discipline suffix if patternDisplayName is generic like "Pattern 1", "Pattern 2"
                    const isGenericName = patternDisplayName.match(/^Pattern\s+\d+$/i);
                    const patternName = isGenericName 
                        ? `${patternDisplayName} - ${disciplineName}` 
                        : patternDisplayName;
                    
                    // Get judges for this group
                    const judgesForGroup = groupJudges[groupIndex] || groupJudges[`${groupIndex}`] || [];
                    const judgeNames = Array.isArray(judgesForGroup) 
                        ? judgesForGroup 
                        : (judgesForGroup ? [judgesForGroup] : []);
                    
                    // Create unique key
                    const uniqueKey = `${disciplineIndex}-${groupIndex}-${patternId || numericPatternId || patternsList.length}`;
                    
                    // Always add pattern if we have a selection (even if not in database)
                    if (!processedPatterns.has(uniqueKey)) {
                        patternsList.push({
                            id: numericPatternId || patternId || `pattern-${disciplineIndex}-${groupIndex}`,
                            numericId: numericPatternId, // Store numeric ID separately for downloads
                            originalPatternId: patternId, // Store original pattern ID
                            name: patternName, // Full name for display
                            discipline: disciplineName,
                            disciplineIndex: disciplineIndex,
                            patternName: patternDisplayName, // Clean pattern name (without discipline suffix)
                            patternVersion: patternVersion || patternDetail?.pattern_version || 'ALL',
                            version: patternVersion, // Store version from patternSelection
                            associationId: patternDetail?.association_id || discipline.association_id,
                            groupName: groupName,
                            groupId: group.id,
                            groupIndex: groupIndex,
                            divisions: extractedDivisions,
                            divisionNames: extractedDivisions.map(d => d.name).join(', '),
                            judges: judgeNames,
                            judgeNames: judgeNames.join(', '),
                            image_url: patternDetail?.image_url || null, // Pattern image for display
                            pdf_url: patternDetail?.pdf_url || patternDetail?.download_url || patternDetail?.url || patternDetail?.image_url || null // URL for download
                        });
                        processedPatterns.add(uniqueKey);
                        console.log(`✓ Added pattern: ${patternName}`);
                        console.log(`  - Discipline: ${disciplineName}`);
                        console.log(`  - Class: ${groupName}`);
                        console.log(`  - Divisions: ${extractedDivisions.map(d => d.name).join(', ') || 'None'}`);
                        console.log(`  - Judges: ${judgeNames.join(', ') || 'None'}`);
                    }
                }
            }
            
            console.log('Fetched patterns:', patternsList);
            setPatterns(patternsList);
        } catch (error) {
            console.error('Error fetching patterns:', error);
        } finally {
            setIsLoadingPatterns(false);
        }
    };
    
    const fetchScoresheets = async () => {
        setIsLoadingScoresheets(true);
        try {
            const disciplines = projectData.disciplines || [];
            const patternSelections = projectData.patternSelections || {};
            const scoresheetsList = [];
            const processedScoresheets = new Set();
            
            console.log('=== FETCHING SCORESHEETS ===');
            console.log('Disciplines:', disciplines.length);
            console.log('Pattern selections:', patternSelections);
            
            // Fetch associations data
            const { data: associationsData } = await supabase
                .from('associations')
                .select('id, abbreviation, name');
            
            const associationsMap = {};
            (associationsData || []).forEach(a => {
                associationsMap[a.id] = a;
                associationsMap[a.abbreviation] = a;
            });
            
            // Step 1: Collect all pattern IDs from patternSelections (same as Step6_Preview)
            const selectedPatternIds = [];
            const patternIdToDisciplineMap = {};
            
            for (let disciplineIndex = 0; disciplineIndex < disciplines.length; disciplineIndex++) {
                const discipline = disciplines[disciplineIndex];
                const disciplineName = discipline.name || 'Unknown Discipline';
                
                // Get association for this discipline
                const associationId = discipline.association_id || 
                    (discipline.selectedAssociations ? Object.keys(discipline.selectedAssociations).find(key => discipline.selectedAssociations[key]) : null) ||
                    (discipline.associations ? Object.keys(discipline.associations).find(key => discipline.associations[key]) : null);
                
                // Try multiple ways to find discipline selections
                // First try by direct discipline.id (most reliable for unique discipline keys)
                let disciplineSelections = patternSelections[discipline.id];
                
                // Then try by index or string index
                if (!disciplineSelections) {
                    disciplineSelections = patternSelections[disciplineIndex] 
                        || patternSelections[`${disciplineIndex}`]
                        || patternSelections[discipline.name];
                }
                
                // If not found, try to find by matching key format: "Discipline-Name-Association-Timestamp"
                if (!disciplineSelections && disciplineName && associationId) {
                    const disciplineNameNormalized = disciplineName.replace(/\s+/g, '-');
                    const matchingKey = Object.keys(patternSelections).find(key => {
                        // Skip numeric keys
                        if (!isNaN(parseInt(key))) return false;
                        const keyNormalized = key.toLowerCase();
                        const disciplineNormalized = disciplineNameNormalized.toLowerCase();
                        return keyNormalized.includes(disciplineNormalized) && keyNormalized.includes(associationId.toLowerCase());
                    });
                    if (matchingKey) {
                        disciplineSelections = patternSelections[matchingKey];
                        console.log(`Found patternSelections for ${disciplineName} using key: ${matchingKey}`);
                    }
                }
                    }
                }
                
                if (!disciplineSelections) continue;
                
                const groups = discipline.patternGroups || [];
                for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                    const group = groups[groupIndex];
                    const groupId = group.id || `pattern-group-${groupIndex}`;
                    
                    // Try multiple ways to find pattern selection
                    let patternSelection = disciplineSelections[groupIndex]
                        || disciplineSelections[`${groupIndex}`]
                        || disciplineSelections[groupId]
                        || disciplineSelections[group.id];
                    
                    // If not found, try to find by group ID pattern
                    if (!patternSelection && groupId) {
                        const matchingGroupKey = Object.keys(disciplineSelections).find(key => {
                            return key === groupId || key.includes('pattern-group');
                        });
                        if (matchingGroupKey) {
                            patternSelection = disciplineSelections[matchingGroupKey];
                        }
                    }
                    
                    if (!patternSelection) continue;
                    
                    const patternId = typeof patternSelection === 'object' 
                        ? (patternSelection.patternId || patternSelection.id || patternSelection.pattern_id) 
                        : patternSelection;
                    
                    // Extract numeric pattern ID
                    let numericPatternId = null;
                    if (patternId) {
                        if (typeof patternId === 'string' && patternId.includes('-')) {
                            const match = patternId.match(/\d+/);
                            if (match) {
                                numericPatternId = parseInt(match[0]);
                            }
                        } else if (!isNaN(parseInt(patternId))) {
                            numericPatternId = parseInt(patternId);
                        }
                    }
                    
                    if (numericPatternId) {
                        selectedPatternIds.push(numericPatternId);
                        patternIdToDisciplineMap[numericPatternId] = {
                            disciplineIndex,
                            disciplineName,
                            groupIndex,
                            groupName: groups[groupIndex]?.name || `Group ${groupIndex + 1}`,
                            association_id: discipline.association_id,
                            discipline: discipline
                        };
                    }
                }
            }
            
            const uniquePatternIds = [...new Set(selectedPatternIds)].filter(id => !isNaN(id) && isFinite(id));
            console.log('Pattern IDs for scoresheet lookup:', uniquePatternIds);
            
            // Step 2: Fetch scoresheets by pattern_id (same as Step6_Preview)
            const scoresheetMap = {};
            
            if (uniquePatternIds.length > 0) {
                try {
                    // Fetch scoresheets by pattern_id (same as Step6_Preview)
                    const { data: scoresheetData, error: scoresheetError } = await supabase
                        .from('tbl_scoresheet')
                        .select('id, pattern_id, image_url, storage_path, discipline, file_name, association_abbrev, city_state')
                        .in('pattern_id', uniquePatternIds);
                    
                    if (scoresheetError) {
                        console.error('Error fetching scoresheets by pattern_id:', scoresheetError);
                    }
                    
                    if (scoresheetData && scoresheetData.length > 0) {
                        scoresheetData.forEach(s => {
                            if (s.pattern_id) {
                                scoresheetMap[s.pattern_id] = s;
                            }
                        });
                    }
                    
                    // Fallback: If pattern_id query returned empty, try by association_abbrev and discipline
                    const missingPatternIds = uniquePatternIds.filter(id => !scoresheetMap[id]);
                    
                    if (missingPatternIds.length > 0 && associationsData.length > 0) {
                        for (const patternId of missingPatternIds) {
                            const disciplineInfo = patternIdToDisciplineMap[patternId];
                            if (disciplineInfo) {
                                const association = associationsMap[disciplineInfo.association_id];
                                const associationAbbrev = association?.abbreviation;
                                
                                if (associationAbbrev && disciplineInfo.disciplineName) {
                                    try {
                                        const { data: fallbackData, error: fallbackError } = await supabase
                                            .from('tbl_scoresheet')
                                            .select('id, pattern_id, image_url, storage_path, discipline, file_name, association_abbrev, city_state')
                                            .eq('association_abbrev', associationAbbrev)
                                            .eq('discipline', disciplineInfo.disciplineName)
                                            .limit(1)
                                            .maybeSingle();
                                        
                                        if (!fallbackError && fallbackData) {
                                            scoresheetMap[patternId] = fallbackData;
                                        }
                                    } catch (fallbackErr) {
                                        console.error(`Error fetching fallback scoresheet for pattern ${patternId}:`, fallbackErr);
                                    }
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error fetching scoresheet details by pattern_id:", err);
                }
            }
            
            // Step 3: Build scoresheets list with all discipline data
            for (let disciplineIndex = 0; disciplineIndex < disciplines.length; disciplineIndex++) {
                const discipline = disciplines[disciplineIndex];
                const disciplineName = discipline.name || 'Unknown Discipline';
                const hasScoresheet = discipline.scoresheet || discipline.pattern_type === 'scoresheet_only' || (!discipline.pattern && discipline.scoresheet);
                
                // Only process disciplines that have scoresheets
                if (!hasScoresheet) continue;
                
                const groups = discipline.patternGroups || [];
                const groupJudges = projectData.groupJudges?.[disciplineIndex] || projectData.groupJudges?.[`${disciplineIndex}`] || {};
                
                // Get association for this discipline
                const associationId = discipline.association_id || 
                    (discipline.selectedAssociations ? Object.keys(discipline.selectedAssociations).find(key => discipline.selectedAssociations[key]) : null) ||
                    (discipline.associations ? Object.keys(discipline.associations).find(key => discipline.associations[key]) : null);
                
                // Try multiple ways to find discipline selections (same as patterns)
                // First try by direct discipline.id (most reliable for unique discipline keys)
                let disciplineSelections = patternSelections[discipline.id];
                
                // Then try by index or string index
                if (!disciplineSelections) {
                    disciplineSelections = patternSelections[disciplineIndex] 
                        || patternSelections[`${disciplineIndex}`]
                        || patternSelections[discipline.name];
                }
                
                // If not found, try to find by matching key format
                if (!disciplineSelections && disciplineName && associationId) {
                    const disciplineNameNormalized = disciplineName.replace(/\s+/g, '-');
                    const matchingKey = Object.keys(patternSelections).find(key => {
                        // Skip numeric keys
                        if (!isNaN(parseInt(key))) return false;
                        const keyNormalized = key.toLowerCase();
                        const disciplineNormalized = disciplineNameNormalized.toLowerCase();
                        return keyNormalized.includes(disciplineNormalized) && keyNormalized.includes(associationId.toLowerCase());
                    });
                    if (matchingKey) {
                        disciplineSelections = patternSelections[matchingKey];
                        console.log(`Found patternSelections for scoresheet ${disciplineName} using key: ${matchingKey}`);
                    }
                }
                
                for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                    const group = groups[groupIndex];
                    const groupName = group.name || `Group ${groupIndex + 1}`;
                    const groupId = group.id || `pattern-group-${groupIndex}`;
                    
                    // Get judges for this group
                    const judgesForGroup = groupJudges[groupIndex] || groupJudges[`${groupIndex}`] || [];
                    const judgeNames = Array.isArray(judgesForGroup) 
                        ? judgesForGroup 
                        : (judgesForGroup ? [judgesForGroup] : []);
                    
                    // Get pattern selection to find pattern ID - try multiple matching strategies
                    let patternSelection = disciplineSelections?.[groupIndex]
                        || disciplineSelections?.[`${groupIndex}`]
                        || disciplineSelections?.[groupId]
                        || disciplineSelections?.[group.id];
                    
                    // If not found, try to find by group ID pattern
                    if (!patternSelection && disciplineSelections && groupId) {
                        const matchingGroupKey = Object.keys(disciplineSelections).find(key => {
                            return key === groupId || key.includes('pattern-group');
                        });
                        if (matchingGroupKey) {
                            patternSelection = disciplineSelections[matchingGroupKey];
                        }
                    }
                    
                    let scoresheetData = null;
                    let numericPatternId = null;
                    
                    // Try to get pattern ID from selection
                    if (patternSelection) {
                        const patternId = typeof patternSelection === 'object' 
                            ? (patternSelection.patternId || patternSelection.id || patternSelection.pattern_id) 
                            : patternSelection;
                        
                        if (patternId) {
                            if (typeof patternId === 'string' && patternId.includes('-')) {
                                const match = patternId.match(/\d+/);
                                if (match) {
                                    numericPatternId = parseInt(match[0]);
                                }
                            } else if (!isNaN(parseInt(patternId))) {
                                numericPatternId = parseInt(patternId);
                            }
                        }
                    }
                    
                    // Get scoresheet from map using pattern_id
                    if (numericPatternId && scoresheetMap[numericPatternId]) {
                        scoresheetData = scoresheetMap[numericPatternId];
                    }
                    
                    // Fallback: Try to get from patternSelection.scoresheetData
                    if (!scoresheetData && patternSelection && typeof patternSelection === 'object' && patternSelection.scoresheetData) {
                        scoresheetData = patternSelection.scoresheetData;
                    }
                    
                    // Fallback: Try to fetch by association and discipline
                    if (!scoresheetData) {
                        const associationId = discipline.association_id || 
                            (discipline.selectedAssociations ? 
                             Object.keys(discipline.selectedAssociations).find(key => discipline.selectedAssociations[key]) : null);
                        const association = associationsMap[associationId] || associationsMap[associationId?.abbreviation];
                        
                        if (association?.abbreviation && disciplineName) {
                            try {
                                const { data: scoresheet } = await supabase
                                    .from('tbl_scoresheet')
                                    .select('id, pattern_id, image_url, storage_path, discipline, file_name, association_abbrev, city_state')
                                    .eq('association_abbrev', association.abbreviation)
                                    .ilike('discipline', `%${disciplineName}%`)
                                    .limit(1)
                                    .maybeSingle();
                                
                                if (scoresheet) {
                                    scoresheetData = scoresheet;
                                }
                            } catch (err) {
                                console.error(`Error fetching scoresheet for ${disciplineName}:`, err);
                            }
                        }
                    }
                    
                    // Extract divisions for scoresheet
                    const divisions = Array.isArray(group.divisions) ? group.divisions : [];
                    const extractedDivisions = divisions.map(div => {
                        if (typeof div === 'string') {
                            return { name: div };
                        } else if (div && typeof div === 'object') {
                            return {
                                name: div.name || div.divisionName || div.division || div.title || ''
                            };
                        } else {
                            return { name: String(div || '') };
                        }
                    }).filter(div => div.name && div.name.trim() !== '');
                    
                    // Get scoresheet name
                    const scoresheetName = scoresheetData?.file_name 
                        || scoresheetData?.discipline 
                        || `${disciplineName} Scoresheet`;
                    
                    // Create unique key
                    const uniqueKey = scoresheetData?.id 
                        ? `scoresheet-${scoresheetData.id}-${disciplineIndex}-${groupIndex}` 
                        : `${disciplineIndex}-${groupIndex}-${disciplineName}`;
                    
                    if (!processedScoresheets.has(uniqueKey)) {
                        scoresheetsList.push({
                            ...(scoresheetData || {}),
                            id: scoresheetData?.id || `scoresheet-${disciplineIndex}-${groupIndex}`,
                            disciplineName: disciplineName,
                            disciplineIndex: disciplineIndex,
                            groupName: groupName,
                            groupIndex: groupIndex,
                            displayName: scoresheetName,
                            divisions: extractedDivisions,
                            divisionNames: extractedDivisions.map(d => d.name).join(', '),
                            judges: judgeNames,
                            judgeNames: judgeNames.join(', '),
                            image_url: scoresheetData?.image_url || null // Ensure image_url is stored
                        });
                        processedScoresheets.add(uniqueKey);
                        console.log(`✓ Added scoresheet: ${scoresheetName}`);
                        console.log(`  - Discipline: ${disciplineName}`);
                        console.log(`  - Class: ${groupName}`);
                        console.log(`  - Divisions: ${extractedDivisions.map(d => d.name).join(', ') || 'None'}`);
                        console.log(`  - Judges: ${judgeNames.join(', ') || 'None'}`);
                        console.log(`  - Image URL: ${scoresheetData?.image_url || 'Not found'}`);
                    }
                }
            }
            
            console.log('Total scoresheets fetched:', scoresheetsList.length);
            setScoresheets(scoresheetsList);
        } catch (error) {
            console.error('Error fetching scoresheets:', error);
        } finally {
            setIsLoadingScoresheets(false);
        }
    };
    
    // Get people data
    const getPeopleData = () => {
        const owner = projectData.adminOwner || profile?.full_name || user?.email || 'Not set';
        
        // Get admin - check secondAdmin or officials with admin role
        let admin = projectData.secondAdmin || 'Not set';
        if (admin === 'Not set') {
            const adminOfficial = projectData.officials?.find(o => o.role === 'admin');
            admin = adminOfficial?.name || 'Not set';
        }
        
        // Collect judges from associationJudges
        const judgesList = [];
        Object.values(projectData.associationJudges || {}).forEach(assocData => {
            const judges = assocData?.judges || (Array.isArray(assocData) ? assocData : []);
            if (Array.isArray(judges)) {
                judges.forEach(judge => {
                    if (typeof judge === 'string') {
                        judgesList.push(judge);
                    } else if (judge?.name) {
                        judgesList.push(judge.name);
                    } else if (judge?.email) {
                        judgesList.push(judge.email);
                    }
                });
            }
        });
        
        // Also collect judges from officials
        const officials = projectData.officials || [];
        const judgeOfficials = officials.filter(o => o.role === 'judge');
        judgeOfficials.forEach(judge => {
            if (judge.name && !judgesList.includes(judge.name)) {
                judgesList.push(judge.name);
            } else if (judge.email && !judgesList.includes(judge.email)) {
                judgesList.push(judge.email);
            }
        });
        
        const judgesCount = judgesList.length;
        
        // Count staff (excluding judges and admins)
        const staffCount = officials.filter(o => o.role !== 'judge' && o.role !== 'admin').length;
        
        // Format admin display - if it shows "Judges: X", that means admin is managing judges
        const adminDisplay = admin !== 'Not set' ? admin : (judgesCount > 0 ? `Judges: ${judgesCount}` : 'Not set');
        
        return { owner, admin: adminDisplay, judgesCount, staffCount, judgesList };
    };
    
    const { owner, admin, judgesCount, staffCount, judgesList } = getPeopleData();
    
    // Get selected associations
    const selectedAssociations = Object.keys(projectData.associations || {}).filter(key => projectData.associations[key]);
    const affiliations = associationsData.filter(a => 
        selectedAssociations.includes(a.id) || selectedAssociations.includes(a.abbreviation)
    );
    
    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="p-6 border-b">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold">{project.project_name || 'Untitled Project'}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <Select 
                            value={displayStatus} 
                            onValueChange={handleStatusChange}
                            disabled={isUpdatingStatus}
                        >
                            <SelectTrigger 
                                className={`w-32 text-sm font-medium py-1.5 h-auto focus:ring-2 focus:ring-primary cursor-pointer transition-colors ${
                                    displayStatus === 'Lock & Approve Mode' 
                                        ? 'bg-green-600 text-white pl-8 pr-8 border border-green-700/50 [&>svg]:hidden' 
                                        : displayStatus === 'Publication' 
                                            ? 'bg-green-500 text-white pl-3 pr-8 border border-green-600/50' 
                                            : 'bg-background border border-primary/30 text-foreground pl-3 pr-8'
                                }`}
                            >
                                <div className="flex items-center gap-1.5">
                                    {displayStatus === 'Lock & Approve Mode' && (
                                        <Lock className="h-3.5 w-3.5 text-white" />
                                    )}
                                    <SelectValue>
                                        {displayStatus === 'Lock & Approve Mode' ? 'Apprvd & Locked' : displayStatus}
                                    </SelectValue>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border">
                                <SelectItem 
                                    value="Draft"
                                    className="cursor-pointer focus:bg-primary focus:text-primary-foreground"
                                >
                                    Draft
                                </SelectItem>
                                <SelectItem 
                                    value="Lock & Approve Mode"
                                    className="cursor-pointer focus:bg-primary focus:text-primary-foreground"
                                >
                                    Apprvd & Locked
                                </SelectItem>
                                <SelectItem 
                                    value="Publication"
                                    className="cursor-pointer focus:bg-primary focus:text-primary-foreground"
                                >
                                    Publication
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>
                        Show dates: {
                            projectData.startDate 
                                ? projectData.endDate && projectData.startDate !== projectData.endDate
                                    ? `${format(new Date(projectData.startDate), "MMM d")} - ${format(new Date(projectData.endDate), "MMM d, yyyy")}`
                                    : format(new Date(projectData.startDate), "MMM d, yyyy")
                                : 'Not set'
                        }
                    </span>
                    <span>Location: {projectData.venueName || projectData.venueAddress || 'Not set'}</span>
                    <span>Last saved: {format(new Date(project.updated_at), "MMM d, yyyy")}</span>
                </div>
                
                {/* Main Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('patternBook')}
                        className={`px-4 py-2 rounded-full text-sm font-medium ${
                            activeTab === 'patternBook' 
                                ? 'bg-primary text-white' 
                                : 'bg-transparent text-muted-foreground hover:bg-primary/10'
                        }`}
                    >
                        Pattern Book
                    </button>
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`px-4 py-2 rounded-full text-sm font-medium ${
                            activeTab === 'results' 
                                ? 'bg-primary text-white' 
                                : 'bg-transparent text-muted-foreground hover:bg-primary/10'
                        }`}
                    >
                        Results
                    </button>
                    
                    {/* Association Logos */}
                    <div className="flex items-center gap-2 ml-auto">
                        {affiliations.map(assoc => {
                            const logoUrl = assoc.logo_url || (assoc.logo && typeof assoc.logo === 'string' && assoc.logo.startsWith('http') ? assoc.logo : null);
                            return logoUrl ? (
                                <img key={assoc.id} src={logoUrl} alt={assoc.name} className="h-8 w-auto max-w-[100px] object-contain" />
                            ) : null;
                        })}
                    </div>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-2">My Filing System</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => setSelectedSidebarItem('allItems')}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
                                    selectedSidebarItem === 'allItems' ? 'bg-primary text-white' : 'hover:bg-muted'
                                }`}
                            >
                                <LayoutGrid className="h-4 w-4" />
                                All Items
                            </button>
                            <button
                                onClick={() => setSelectedSidebarItem('recentlyViewed')}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
                                    selectedSidebarItem === 'recentlyViewed' ? 'bg-primary text-white' : 'hover:bg-muted'
                                }`}
                            >
                                Recently Viewed
                            </button>
                            <button
                                onClick={() => setSelectedSidebarItem('assignedToMe')}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
                                    selectedSidebarItem === 'assignedToMe' ? 'bg-primary text-white' : 'hover:bg-muted'
                                }`}
                            >
                                Assigned to My Judge
                            </button>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-2">My Folders</h3>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 px-3 py-2 rounded hover:bg-muted">
                                <Folder className="h-4 w-4" />
                                <span className="text-sm flex-1">Custom Folder 1</span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger>
                                        <MoreVertical className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem>Rename</DropdownMenuItem>
                                        <DropdownMenuItem>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="ml-6 space-y-1">
                                <div className="flex items-center gap-2 px-3 py-2 rounded hover:bg-muted">
                                    <Folder className="h-4 w-4" />
                                    <span className="text-sm">Subfolder A</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 rounded hover:bg-muted">
                                    <Folder className="h-4 w-4" />
                                    <span className="text-sm">Subfolder B</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            New Folder
                        </Button>
                    </div>
                    
                    <Button className="w-full mt-auto">
                        <Download className="h-4 w-4 mr-2" />
                        View/Download Entire Pattern Book
                    </Button>
                </div>
                
                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'patternBook' && (
                            <>
                                {/* Sub-tabs */}
                                <div className="flex gap-4 mb-6 border-b">
                                    <button 
                                        onClick={() => setActiveSubTab('patterns')}
                                        className={`px-4 py-2 border-b-2 font-medium ${
                                            activeSubTab === 'patterns' 
                                                ? 'border-primary text-primary' 
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Patterns
                                    </button>
                                    <button 
                                        onClick={() => setActiveSubTab('scoreSheets')}
                                        className={`px-4 py-2 border-b-2 font-medium ${
                                            activeSubTab === 'scoreSheets' 
                                                ? 'border-primary text-primary' 
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Score Sheets
                                    </button>
                                    <button 
                                        onClick={() => setActiveSubTab('accessory')}
                                        className={`px-4 py-2 border-b-2 font-medium ${
                                            activeSubTab === 'accessory' 
                                                ? 'border-primary text-primary' 
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Accessory Documents
                                    </button>
                                    <button 
                                        onClick={() => setActiveSubTab('complete')}
                                        className={`px-4 py-2 border-b-2 font-medium ${
                                            activeSubTab === 'complete' 
                                                ? 'border-primary text-primary' 
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Complete Pattern Books
                                    </button>
                                </div>
                                
                                {/* Filters and Actions */}
                                <div className="flex items-center gap-4 mb-4 flex-wrap">
                                    <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue>
                                                {filterDiscipline === 'all' ? 'All Disciplines' : filterDiscipline}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Disciplines</SelectItem>
                                            {uniqueDisciplines.map(discipline => (
                                                <SelectItem key={discipline} value={discipline}>
                                                    {discipline}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={filterClass} onValueChange={setFilterClass}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue>
                                                {filterClass === 'all' ? 'All Classes' : filterClass}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Classes</SelectItem>
                                            {uniqueClasses.map(className => (
                                                <SelectItem key={className} value={className}>
                                                    {className}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={filterJudge} onValueChange={setFilterJudge}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue>
                                                {filterJudge === 'all' ? 'Any Judge' : filterJudge}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Any Judge</SelectItem>
                                            {uniqueJudges.map(judge => (
                                                <SelectItem key={judge} value={judge}>
                                                    {judge}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue>
                                                {sortBy === 'newest' ? 'Sort: Newest' : 
                                                 sortBy === 'oldest' ? 'Sort: Oldest' : 
                                                 'Sort: Name'}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="newest">Sort: Newest</SelectItem>
                                            <SelectItem value="oldest">Sort: Oldest</SelectItem>
                                            <SelectItem value="name">Sort: Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={project.status || 'Draft'} onValueChange={() => {}}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue>{project.status || 'Draft'}</SelectValue>
                                        </SelectTrigger>
                                    </Select>
                                    <Button variant="ghost" size="icon">
                                        <LayoutGrid className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <FileText className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </div>
                                
                                {/* Content based on active sub-tab */}
                                {activeSubTab === 'patterns' && (
                                    <>
                                        {/* Patterns List */}
                                        {isLoadingPatterns ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                                {filteredPatterns.map((pattern, index) => (
                                                    <div key={pattern.id || index} className="flex items-center gap-4 p-3 border rounded hover:bg-muted/50">
                                                        <input type="checkbox" className="w-4 h-4" />
                                                        {/* Pattern Image or Icon - Similar to Step 3 */}
                                                        {pattern.image_url ? (
                                                            <div className="w-16 h-16 rounded-md overflow-hidden border bg-muted/20 shrink-0 flex items-center justify-center">
                                                                <img 
                                                                    src={pattern.image_url} 
                                                                    alt={pattern.patternName || pattern.name || 'Pattern'} 
                                                                    className="w-full h-full object-contain"
                                                                    loading="lazy"
                                                                    onError={(e) => {
                                                                        // Fallback to icon if image fails to load
                                                                        e.target.style.display = 'none';
                                                                        e.target.parentElement.innerHTML = '<div class="w-full h-full bg-primary/10 rounded flex items-center justify-center"><svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>';
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center shrink-0">
                                                                <Users className="h-4 w-4 text-primary" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium truncate">{pattern.patternName || pattern.name}</div>
                                                            <div className="text-sm text-muted-foreground space-y-1 mt-1">
                                                                <div>
                                                                    <span className="font-medium">Discipline:</span> {pattern.discipline}
                                                                </div>
                                                                {pattern.groupName && (
                                                                    <div>
                                                                        <span className="font-medium">Class:</span> {pattern.groupName}
                                                                    </div>
                                                                )}
                                                                {pattern.divisionNames && (
                                                                    <div>
                                                                        <span className="font-medium">Divisions:</span> <span className="text-xs">({pattern.divisionNames})</span>
                                                                    </div>
                                                                )}
                                                                {pattern.judgeNames && (
                                                                    <div>
                                                                        <span className="font-medium">Judges:</span> {pattern.judgeNames}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownloadPattern(pattern);
                                                                }}
                                                                title="Download Pattern"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewPattern(pattern);
                                                                }}
                                                                title="View Pattern Image"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Handle more options
                                                                }}
                                                                title="More options"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {filteredPatterns.length === 0 && !isLoadingPatterns && (
                                                    <div className="text-center py-12 text-muted-foreground">
                                                        {patterns.length === 0 ? 'No patterns found' : 'No patterns match the selected filters'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                                
                                {activeSubTab === 'scoreSheets' && (
                                    <>
                                        {/* Score Sheets List */}
                                        {isLoadingScoresheets ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                                {filteredScoresheets.map((scoresheet, index) => (
                                                    <div key={scoresheet.id || index} className="flex items-center gap-4 p-3 border rounded hover:bg-muted/50">
                                                        <input type="checkbox" className="w-4 h-4" />
                                                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center shrink-0">
                                                            <FileText className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium truncate">{scoresheet.displayName || scoresheet.file_name || scoresheet.disciplineName || 'Scoresheet'}</div>
                                                            <div className="text-sm text-muted-foreground space-y-1">
                                                                <div>
                                                                    <span className="font-medium">Discipline:</span> {scoresheet.disciplineName || scoresheet.discipline}
                                                                </div>
                                                                {scoresheet.groupName && (
                                                                    <div>
                                                                        <span className="font-medium">Class:</span> {scoresheet.groupName}
                                                                    </div>
                                                                )}
                                                                {scoresheet.divisionNames && (
                                                                    <div>
                                                                        <span className="font-medium">Divisions:</span> <span className="text-xs">({scoresheet.divisionNames})</span>
                                                                    </div>
                                                                )}
                                                                {scoresheet.judgeNames && (
                                                                    <div>
                                                                        <span className="font-medium">Judges:</span> {scoresheet.judgeNames}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                title="Download Scoresheet"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownloadScoresheet(scoresheet);
                                                                }}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                title="View Scoresheet Image"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewScoresheet(scoresheet);
                                                                }}
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                title="More options"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Handle more options
                                                                }}
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {filteredScoresheets.length === 0 && !isLoadingScoresheets && (
                                                    <div className="text-center py-12 text-muted-foreground">
                                                        {scoresheets.length === 0 ? 'No scoresheets found' : 'No scoresheets match the selected filters'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                                
                                {(activeSubTab === 'accessory' || activeSubTab === 'complete') && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        Coming soon
                                    </div>
                                )}
                            </>
                        )}
                        
                        {activeTab === 'results' && (
                            <div className="text-center py-12 text-muted-foreground">
                                Results content coming soon
                            </div>
                        )}
                    </div>
                    
                    {/* Right Panel */}
                    <div className="w-64 border-l bg-muted/30 p-4">
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Affiliated with:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {affiliations.length > 0 ? (
                                        affiliations.map(assoc => {
                                            const logoUrl = assoc.logo_url || (assoc.logo && typeof assoc.logo === 'string' && assoc.logo.startsWith('http') ? assoc.logo : null);
                                            return logoUrl ? (
                                                <img key={assoc.id} src={logoUrl} alt={assoc.name} className="h-6 w-auto max-w-[100px] object-contain" />
                                            ) : (
                                                <span key={assoc.id} className="text-xs px-2 py-1 bg-primary/20 rounded">
                                                    {assoc.abbreviation || assoc.name}
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span className="text-sm text-muted-foreground">No affiliations</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm"><span className="font-semibold">Owner:</span> {owner}</p>
                                </div>
                                <div>
                                    <p className="text-sm"><span className="font-semibold">Admin:</span> {admin}</p>
                                </div>
                                <div>
                                    <p className="text-sm mb-1"><span className="font-semibold">Judges:</span> {judgesCount} Assigned</p>
                                    {judgesList && judgesList.length > 0 && (
                                        <div className="ml-2 space-y-1">
                                            {judgesList.map((judge, idx) => (
                                                <p key={idx} className="text-xs text-muted-foreground">• {judge}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm"><span className="font-semibold">Staff:</span> {staffCount} Assigned</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Pattern/Scoresheet Preview Modal */}
            <Dialog open={!!previewItem} onOpenChange={() => {
                setPreviewItem(null);
                setPreviewType(null);
                setPreviewImage(null);
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {previewType === 'pattern' 
                                ? (previewItem?.patternName || previewItem?.name || 'Pattern Preview')
                                : (previewItem?.displayName || previewItem?.file_name || 'Scoresheet Preview')
                            }
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {isLoadingPreview ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="ml-2 text-sm text-muted-foreground">Loading image...</span>
                            </div>
                        ) : previewImage ? (
                            <div className="rounded-md overflow-hidden border bg-muted/20">
                                <img 
                                    src={previewImage} 
                                    alt={previewType === 'pattern' ? 'Pattern Diagram' : 'Scoresheet'} 
                                    className="w-full h-auto max-h-[70vh] object-contain"
                                    loading="lazy"
                                />
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No image available for this {previewType === 'pattern' ? 'pattern' : 'scoresheet'}.</p>
                            </div>
                        )}
                        {previewItem && (
                            <div className="text-sm text-muted-foreground space-y-1 border-t pt-4">
                                {previewType === 'pattern' ? (
                                    <>
                                        <div><span className="font-medium">Discipline:</span> {previewItem.discipline}</div>
                                        {previewItem.groupName && <div><span className="font-medium">Class:</span> {previewItem.groupName}</div>}
                                        {previewItem.divisionNames && <div><span className="font-medium">Divisions:</span> {previewItem.divisionNames}</div>}
                                    </>
                                ) : (
                                    <>
                                        <div><span className="font-medium">Discipline:</span> {previewItem.disciplineName || previewItem.discipline}</div>
                                        {previewItem.groupName && <div><span className="font-medium">Class:</span> {previewItem.groupName}</div>}
                                        {previewItem.divisionNames && <div><span className="font-medium">Divisions:</span> {previewItem.divisionNames}</div>}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// In Progress Card Component - matches the image design
const InProgressCard = ({ project, onRefresh }) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    
    const editPath = `/pattern-book-builder/${project.id}`;
    
    const handleContinueEditing = () => {
        navigate(editPath);
    };
    
    // Format status for display - show "In progress" properly
    const getDisplayStatus = () => {
        const status = (project.status || '').toString().trim();
        if (status.toLowerCase() === 'in progress') {
            return 'In progress';
        }
        return status || 'Draft';
    };
    
    const displayStatus = getDisplayStatus();
    const isInProgress = displayStatus.toLowerCase() === 'in progress';
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
        >
            <Card className="bg-white border border-primary shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <BookCopy className="h-5 w-5 text-primary shrink-0" />
                        <CardTitle className="text-lg font-bold text-foreground">
                            {project.project_name || 'Untitled Project'}
                        </CardTitle>
                    </div>
                    <div className="mb-3">
                        <Badge className="bg-primary text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                            Pattern Book
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground pb-4">
                    <p>Last saved: {format(new Date(project.updated_at), "MMM d, yyyy")}</p>
                    <p>
                        Status: {' '}
                        <span className={`font-medium ${isInProgress ? 'text-green-500' : 'text-foreground'}`}>
                            {displayStatus}
                        </span>
                    </p>
                </CardContent>
                <CardFooter className="pt-4">
                    <Button 
                        onClick={handleContinueEditing} 
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                    >
                        Continue Editing <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
};

const ProjectCard = ({ project, menuType = 'full', onRefresh, isPastPatternPortal = false, isInProgressPortal = false }) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [coverDialogOpen, setCoverDialogOpen] = useState(false);
    const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [coverColor, setCoverColor] = useState(project.project_data?.coverColor || null);
    const [dueDate, setDueDate] = useState(project.project_data?.dueDate || null);
    const [isHovered, setIsHovered] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const isPatternBook = project.project_type === 'pattern_book';
    const isPatternFolder = project.project_type === 'pattern_folder';
    const isPatternHub = project.project_type === 'pattern_hub';
    const editPath = isPatternBook
        ? `/pattern-book-builder/${project.id}`
        : isPatternFolder
        ? `/pattern-folder/${project.id}`
        : isPatternHub
        ? `/pattern-hub/${project.id}`
        : `/horse-show-manager/edit/${project.id}`;
    
    // Check if project is locked (status is "Lock & Approve Mode")
    const isLocked = project.status === 'Lock & Approve Mode';
    
    // Handle continue editing button click
    const handleContinueEditing = () => {
        if (isLocked) {
            toast({
                variant: "destructive",
                title: "Pattern Book Locked",
                description: "Your pattern is Lock & Approve Mode. You cannot edit it.",
            });
            return;
        }
        
        // For pattern_hub projects, navigate directly to PatternHub
        if (isPatternHub) {
            navigate(editPath);
            return;
        }
        
        // For other project types, open detail modal
        setDetailModalOpen(true);
    };

    const handleDownloadFolder = async () => {
        if (isDownloading) return;
        
        setIsDownloading(true);
        toast({ 
            title: "Download started", 
            description: "Preparing your folder for download. This may take a moment..." 
        });

        try {
            const projectData = project.project_data || {};
            const projectName = project.name || projectData.showName || 'Pattern_Book';
            
            await downloadPatternBookFolder(projectData, projectName, (progress) => {
                console.log(`Download progress: ${progress}%`);
            });
            
            toast({ 
                title: "Download complete", 
                description: "Your pattern book folder has been downloaded successfully." 
            });
        } catch (error) {
            console.error('Download error:', error);
            toast({ 
                title: "Download failed", 
                description: "There was an error preparing your download. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsDownloading(false);
        }
    };

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
                    .update({ mode: 'archived' })
                    .eq('id', project.id);
                toast({ title: "Project archived", description: "Project has been archived" });
                if (onRefresh) onRefresh();
                break;
            case 'preview':
                navigate(`${editPath}?preview=true`);
                break;
            case 'download':
                handleDownloadFolder();
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
            // Pattern Folder: open card, change cover, preview only (hide open card for Past Pattern Portal)
            return (
                <>
                    {!isPastPatternPortal && (
                        <DropdownMenuItem onClick={() => handleMenuAction('open')}>
                            <Pencil className="mr-2 h-4 w-4" /> Open card
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleMenuAction('cover')}>
                        <ImageIcon className="mr-2 h-4 w-4" /> Change cover
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('preview')}>
                        <Eye className="mr-2 h-4 w-4" /> Preview
                    </DropdownMenuItem>
                </>
            );
        } else {
            // Pattern Books and Horse Shows: open card, change cover, edit dates, download folder, archive (hide open card for Past Pattern Portal)
            return (
                <>
                    {!isPastPatternPortal && (
                        <DropdownMenuItem onClick={() => handleMenuAction('open')}>
                            <Pencil className="mr-2 h-4 w-4" /> Open card
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleMenuAction('cover')}>
                        <ImageIcon className="mr-2 h-4 w-4" /> Change cover
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('dates')}>
                        <CalendarIcon className="mr-2 h-4 w-4" /> Edit dates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('download')} disabled={isDownloading}>
                        {isDownloading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        {isDownloading ? 'Downloading...' : 'Download Folder'}
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
                        <p className="text-sm text-muted-foreground mt-1">Status: <span className="capitalize font-medium text-foreground">{project.status === 'Draft' ? 'Draft' : project.status === 'Lock & Approve Mode' ? 'Lock & Approve Mode' : project.status || 'Draft'}</span></p>
                        {dueDate && (
                            <p className="text-sm text-muted-foreground mt-1">
                                Due: <span className="font-medium text-foreground">{format(new Date(dueDate), 'MMM d, yyyy')}</span>
                            </p>
                        )}
                    </CardContent>
                    <CardFooter>
                        {!isPastPatternPortal && (
                            <Button 
                                onClick={handleContinueEditing} 
                                className="w-full"
                                disabled={isLocked}
                            >
                                Continue Editing <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
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
                {/* Edit Menu Button - Only visible on hover - Hide for In Progress Portal */}
                {!isInProgressPortal && (
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
                )}

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
                        <p>
                            Status: {' '}
                            <span className={`font-medium ${
                                (project.status || '').toString().toLowerCase() === 'in progress' 
                                    ? 'text-green-500' 
                                    : 'text-foreground'
                            }`}>
                                {(project.status || '').toString().toLowerCase() === 'in progress' 
                                    ? 'In progress' 
                                    : project.status === 'Draft' 
                                        ? 'Draft' 
                                        : project.status === 'Lock & Approve Mode' 
                                            ? 'Lock & Approve Mode' 
                                            : project.status || 'Draft'}
                            </span>
                        </p>
                        {dueDate && (
                            <p>Due: <span className="font-medium text-foreground">{format(new Date(dueDate), 'MMM d, yyyy')}</span></p>
                        )}
                    </div>
                    
                    {/* Action Button - Hide for Past Pattern Portal */}
                    {!isPastPatternPortal && (
                        <Button 
                            onClick={handleContinueEditing} 
                            className="w-full" 
                            size="sm"
                            disabled={isLocked}
                        >
                            Continue Editing <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
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
    
    // Filter pattern books by status (case-insensitive comparison)
    // Active Pattern Books Portal: Show all projects EXCEPT status === 'In progress' AND mode !== 'archived'
    const activePatternBooks = patternBookProjects.filter(p => {
        const status = (p.status || 'Draft').toString().trim();
        const mode = (p.mode || '').toString().trim();
        return status.toLowerCase() !== 'in progress' && mode.toLowerCase() !== 'archived';
    });
    
    // In Progress Pattern Books Portal: Show only projects with Status === 'In progress' AND mode !== 'archived'
    const inProgressPatternBooks = patternBookProjects.filter(p => {
        const status = (p.status || 'Draft').toString().trim();
        const mode = (p.mode || '').toString().trim();
        return status.toLowerCase() === 'in progress' && mode.toLowerCase() !== 'archived';
    });
    
    // Pattern Portal: Show only projects with project_type = 'pattern_hub' AND Status !== 'Draft' AND Status !== 'Publication' AND Status !== 'Lock & Approve Mode' AND Status !== 'In progress' AND mode !== 'archived'
    const patternPortalBooks = projects.filter(p => {
        const projectType = (p.project_type || '').toString().trim();
        const status = (p.status || 'Draft').toString().trim();
        const statusLower = status.toLowerCase();
        const mode = (p.mode || '').toString().trim();
        return projectType.toLowerCase() === 'pattern_hub' &&
               statusLower !== 'draft' && 
               statusLower !== 'publication' && 
               statusLower !== 'lock & approve mode' && 
               statusLower !== 'in progress' &&
               !statusLower.includes('lock') && 
               !statusLower.includes('approve') &&
               mode.toLowerCase() !== 'archived';
    });
    
    // Choose a Pattern Portal: Show only projects with project_type = 'pattern_hub' AND status = 'In progress' AND mode !== 'archived'
    const choosePatternBooks = projects.filter(p => {
        const projectType = (p.project_type || '').toString().trim();
        const status = (p.status || 'Draft').toString().trim();
        const statusLower = status.toLowerCase();
        const mode = (p.mode || '').toString().trim();
        return projectType.toLowerCase() === 'pattern_hub' &&
               statusLower === 'in progress' &&
               mode.toLowerCase() !== 'archived';
    });
    
    // Past Patterns & Pattern Books Portal: Show only archived projects (mode === 'archived')
    const pastPatternBooks = patternBookProjects.filter(p => {
        const mode = (p.mode || '').toString().trim();
        return mode.toLowerCase() === 'archived';
    });
    
    const [expandedSections, setExpandedSections] = useState({
        activePatternBooks: true,
        inProgressPatternBooks: true,
        patternPortal: true,
        choosePatternPortal: true,
        pastPatternPortal: true,
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
                    sectionKey === 'activePatternBooks' ? (
                        // Active Pattern Books Portal - custom card layout matching the image
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projectList.map(project => (
                                <ActivePatternBookCard 
                                    key={project.id} 
                                    project={project} 
                                    onRefresh={fetchProjects}
                                    profile={profile}
                                    user={user}
                                />
                            ))}
                        </div>
                    ) : menuType === 'folder' ? (
                        // Folder-style layout for Pattern Portal - 3 folders per row
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projectList.map(project => (
                                <PatternFolderItem 
                                    key={project.id} 
                                    project={project} 
                                    currentUserName={profile?.full_name || user?.email || 'User'} 
                                    isPastPatternPortal={sectionKey === 'pastPatternPortal'}
                                />
                            ))}
                        </div>
                    ) : (
                        // Grid layout for Pattern Books and Horse Shows
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {projectList.map(project => (
                                <ProjectCard 
                                    key={project.id} 
                                    project={project} 
                                    menuType={menuType} 
                                    onRefresh={fetchProjects} 
                                    isPastPatternPortal={sectionKey === 'pastPatternPortal'}
                                    isInProgressPortal={sectionKey === 'inProgressPatternBooks' || sectionKey === 'choosePatternPortal'}
                                />
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
                                activePatternBooks,
                                "Active Pattern Books Portal",
                                "Build and manage your horse show pattern books.",
                                "/pattern-book-builder",
                                "New Pattern Book",
                                "activePatternBooks",
                                "default"
                            )}
                            {renderProjectList(
                                inProgressPatternBooks,
                                "In Progress Pattern Books Portal",
                                "Pattern books that are in progress.",
                                "",
                                "",
                                "inProgressPatternBooks",
                                "default",
                                true
                            )}
                            {renderProjectList(
                                patternPortalBooks,
                                "Pattern Portal",
                                "Organize and store your pattern collections.",
                                "",
                                "",
                                "patternPortal",
                                "folder",
                                true
                            )}
                            {renderProjectList(
                                choosePatternBooks,
                                "Choose a Pattern Portal",
                                "Browse and select from all available pattern books.",
                                "",
                                "",
                                "choosePatternPortal",
                                "default",
                                true
                            )}
                            {renderProjectList(
                                pastPatternBooks,
                                "Past Patterns & Pattern Books Portal",
                                "View your published pattern books.",
                                "",
                                "",
                                "pastPatternPortal",
                                "default",
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
