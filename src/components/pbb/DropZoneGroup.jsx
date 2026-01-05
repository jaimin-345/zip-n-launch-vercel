import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Edit, Calendar as CalendarIcon, X, Save, Sparkles, AlertCircle, Eye, Check, ChevronsUpDown, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

// Pattern Sets constant removed (unused)

// Pattern version categories
// Pattern version categories
const PATTERN_VERSIONS = [
  { id: 'ALL', label: 'All', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-500' },
  { id: 'L1', label: 'L1', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-500' },
  { id: 'GR/NOV', label: 'Green / Novice', color: 'bg-teal-100 text-teal-800', dotColor: 'bg-teal-500' },
  { id: 'Championship', label: 'Championship', color: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-500' },
  { id: 'Skilled', label: 'Skilled', color: 'bg-indigo-100 text-indigo-800', dotColor: 'bg-indigo-500' },
  { id: 'Intermediate', label: 'Intermediate', color: 'bg-orange-100 text-orange-800', dotColor: 'bg-orange-500' },
  { id: 'Beginner', label: 'Beginner', color: 'bg-purple-100 text-purple-800', dotColor: 'bg-purple-500' },
  { id: 'Walk-Trot', label: 'Walk-Trot', color: 'bg-pink-100 text-pink-800', dotColor: 'bg-pink-500' },
];


const SortableDivisionItem = ({ division, pbbDiscipline, setFormData, formData, associationsData, groupId }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: division.id,
        data: {
            division: division,
            type: 'division',
            sortable: {
                containerId: groupId
            }
        }
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(division.customTitle || '');
    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleTitleSave = () => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newPrintTitles = { ...(disc.divisionPrintTitles || {}), [division.id]: editedTitle };
                    return { ...disc, divisionPrintTitles: newPrintTitles };
                }
                return disc;
            })
        }));
        setIsEditing(false);
    };

    const handleDateSelect = (date) => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newDates = { ...(disc.divisionDates || {}), [division.id]: format(date, 'yyyy-MM-dd') };
                    return { ...disc, divisionDates: newDates };
                }
                return disc;
            })
        }));
        setPopoverOpen(false);
    };

    const handleRemoveDate = (e) => {
        e.stopPropagation();
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newDates = { ...(disc.divisionDates || {}) };
                    delete newDates[division.id];
                    return { ...disc, divisionDates: newDates };
                }
                return disc;
            })
        }));
    };

    // Parse division name to extract tag and clean name
    const divisionName = division.division || '';
    const originalDivisionName = divisionName.startsWith('custom') ? divisionName.substring(7) : divisionName;
    const dashIndex = originalDivisionName.indexOf(' - ');
    const divisionTag = dashIndex > -1 ? originalDivisionName.substring(0, dashIndex).trim() : '';
    const cleanedName = dashIndex > -1 ? originalDivisionName.substring(dashIndex + 3).trim() : originalDivisionName;
    const displayName = division.customTitle || cleanedName || 'Unknown Division';

    const getAssociationBadges = () => {
        if (!pbbDiscipline || !formData) return [];

        const badges = [];
        const nsbaDualApprovedWith = formData.nsbaDualApprovedWith || [];

        if (pbbDiscipline.name) {
            badges.push(<Badge key="discipline-badge" variant="discipline" className="text-xs">{pbbDiscipline.name}</Badge>);
        }

        const assoc = associationsData.find(a => a.id === division.assocId);
        if (assoc) {
            badges.push(<Badge key={division.assocId} variant={assoc?.color || 'secondary'} className="text-xs">{assoc.abbreviation || assoc.name}</Badge>);

            if (pbbDiscipline.isDualApproved && nsbaDualApprovedWith.includes(division.assocId)) {
                badges.push(<Badge key={`${division.assocId}-da`} variant="dualApproved" className="text-xs">NSBA Dual-Approved</Badge>);
            }
        }

        if (pbbDiscipline.isNsbaStandalone && division.assocId === 'NSBA') {
            badges.push(<Badge key="nsba-standalone" variant="standalone" className="text-xs">NSBA Standalone</Badge>);
        }

        return badges;
    };


    return (
        <div ref={setNodeRef} style={style} className="relative p-1.5 pr-2 border rounded-md bg-background/70 text-xs flex items-center touch-none w-full group">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 mr-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            {isEditing ? (
                <div className="flex-grow flex items-center gap-1">
                    <Input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="h-6 text-xs"
                        autoFocus
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleTitleSave}><Save className="h-3 w-3" /></Button>
                </div>
            ) : (
                <span className="truncate flex-grow">{displayName}</span>
            )}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(true)}><Edit className="h-3 w-3" /></Button>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6"><CalendarIcon className="h-3 w-3" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={division.date ? parseLocalDate(division.date) : null}
                            onSelect={handleDateSelect}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex items-center gap-1 ml-2">
                {divisionTag && (
                    <Badge variant="outline" className="text-xs">
                        {divisionTag}
                    </Badge>
                )}

                {division.date && (
                    <Badge variant="outline" className="flex items-center gap-1 border-info bg-info/10 text-info-foreground text-xs p-1 h-auto font-normal">
                        <CalendarIcon className="h-3 w-3" />
                        {format(parseLocalDate(division.date), 'EEE, MMM d')}
                        <button onClick={handleRemoveDate} className="ml-1 rounded-full hover:bg-muted-foreground/20"><X className="h-3 w-3" /></button>
                    </Badge>
                )}
                {getAssociationBadges()}
            </div>
        </div>
    );
};


const DropZoneGroup = ({ group, index, pbbDiscipline, handleGroupFieldChange, handleRemovePatternGroup, handleAiAssistClick, setFormData, formData, associationsData }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: group.id,
        data: {
            type: 'group',
        }
    });
    const { attributes, listeners, setNodeRef: setSortableNodeRef, transform, transition } = useSortable({
        id: group.id,
        data: {
            type: 'group',
            sortable: {
                containerId: 'groups-container'
            }
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Get current pattern selection from formData for this group
    const disciplineId = pbbDiscipline?.id;
    const currentPatternSelection = disciplineId
        ? formData?.patternSelections?.[disciplineId]?.[group.id]
        : null;
    const currentPatternId = currentPatternSelection?.patternId;
    const savedManeuversRange = currentPatternSelection?.maneuversRange || '';

    // State for database patterns - initialize from saved data
    const [dbPatterns, setDbPatterns] = useState([]);
    const [loadingPatterns, setLoadingPatterns] = useState(false);
    // const [selectedManeuversRange, setSelectedManeuversRange] = useState(savedManeuversRange); // Removed
    const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
    const [patternManeuvers, setPatternManeuvers] = useState([]);
    const [patternImage, setPatternImage] = useState(null);
    const [filteredPatterns, setFilteredPatterns] = useState([]);
    const [imageZoom, setImageZoom] = useState(1);
    const [hoveredPatternId, setHoveredPatternId] = useState(null);
    const [hoveredPatternImage, setHoveredPatternImage] = useState(null);
    const [loadingHoveredImage, setLoadingHoveredImage] = useState(false);
    const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
    
    // Check if this discipline is from open-show association (need this early for filter init)
    const isOpenShowDisciplineEarly = pbbDiscipline?.selectedAssociations?.['open-show'] || 
        pbbDiscipline?.association_id === 'open-show';
    
    // Filter states for pattern selection
    // Auto-set the discipline filter to the current discipline name by default
    // Initialize filterAssociation from saved pattern selection if available
    const [filterAssociation, setFilterAssociation] = useState(() => {
        return currentPatternSelection?.filterAssociation || 'all';
    });
    const [filterDiscipline, setFilterDiscipline] = useState(() => {
        // Always default to the current discipline name if available
        if (pbbDiscipline?.name) {
            return pbbDiscipline.name;
        }
        return 'all';
    });
    
    // State for Working Cow Horse scoresheets (AQHA only)
    const [workingCowHorseScoresheets, setWorkingCowHorseScoresheets] = useState([]);
    const [loadingScoresheets, setLoadingScoresheets] = useState(false);
    
    // Check if this is Working Cow Horse for AQHA
    const isWorkingCowHorseAQHA = pbbDiscipline?.name === 'Working Cow Horse' && 
        (pbbDiscipline?.association_id === 'AQHA' || 
         (group.divisions?.length > 0 && group.divisions[0]?.assocId === 'AQHA'));

    // Fetch Working Cow Horse scoresheets for AQHA (without pattern_id)
    useEffect(() => {
        const fetchWorkingCowHorseScoresheets = async () => {
            if (!isWorkingCowHorseAQHA) {
                setWorkingCowHorseScoresheets([]);
                return;
            }
            
            setLoadingScoresheets(true);
            try {
                const { data, error } = await supabase
                    .from('tbl_scoresheet')
                    .select('id, discipline, association_abbrev, image_url, storage_path')
                    .eq('discipline', 'Working Cow Horse')
                    .eq('association_abbrev', 'AQHA')
                    .is('pattern_id', null);
                
                if (error) throw error;
                
                // Parse scoresheet names from storage_path to create display names
                const scoresheetOptions = (data || []).map(ss => {
                    let displayName = 'Scoresheet';
                    const path = ss.storage_path || '';
                    
                    if (path.includes('_LTD_')) {
                        displayName = 'Cow Work - Limited';
                    } else if (path.includes('_BDBD_')) {
                        displayName = 'Cow Work - Rookie';
                    } else if (path.includes('CowWork')) {
                        displayName = 'Cow Work - Open';
                    }
                    
                    return { ...ss, displayName };
                });
                
                setWorkingCowHorseScoresheets(scoresheetOptions);
            } catch (err) {
                console.error('Error fetching Working Cow Horse scoresheets:', err);
                setWorkingCowHorseScoresheets([]);
            } finally {
                setLoadingScoresheets(false);
            }
        };
        
        fetchWorkingCowHorseScoresheets();
    }, [isWorkingCowHorseAQHA]);

    // Inject CSS to fix pattern select truncation on iOS/iPad
    useEffect(() => {
        const styleId = 'pattern-select-fix';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .pattern-select-trigger > span {
                    display: block !important;
                    overflow: visible !important;
                    text-overflow: unset !important;
                    white-space: nowrap !important;
                    -webkit-line-clamp: unset !important;
                    line-clamp: unset !important;
                    max-height: none !important;
                    -webkit-box-orient: unset !important;
                }
            `;
            document.head.appendChild(style);
        }
        return () => {
            // Cleanup on unmount (optional, style can stay for other instances)
        };
    }, []);

    // Get association info (both name and abbreviation) from group divisions - if all divisions in group are from ONE association, use that
    const associationInfo = useMemo(() => {
        if (!group.divisions || group.divisions.length === 0) {
            // No divisions in group, fall back to discipline's association
            if (pbbDiscipline?.association_id) {
                const assoc = associationsData?.find(a => a.id === pbbDiscipline.association_id);
                if (assoc) {
                    return {
                        name: assoc.name,
                        abbreviation: assoc.abbreviation,
                        id: assoc.id
                    };
                }
            }
            return null;
        }
        
        // Get unique associations from all divisions in this group
        const uniqueAssocIds = [...new Set(group.divisions.map(d => d.assocId).filter(Boolean))];
        
        // If all divisions are from ONE association, use that association for pattern filtering
        if (uniqueAssocIds.length === 1) {
            const assoc = associationsData?.find(a => a.id === uniqueAssocIds[0]);
            if (assoc) {
                return {
                    name: assoc.name,
                    abbreviation: assoc.abbreviation,
                    id: assoc.id
                };
            }
        }
        
        // If multiple associations in group, fall back to discipline's association
        if (pbbDiscipline?.association_id) {
            const assoc = associationsData?.find(a => a.id === pbbDiscipline.association_id);
            if (assoc) {
                return {
                    name: assoc.name,
                    abbreviation: assoc.abbreviation,
                    id: assoc.id
                };
            }
        }
        
        return null;
    }, [group.divisions, pbbDiscipline?.association_id, associationsData]);
    
    // Keep associationName for backward compatibility and display
    const associationName = associationInfo?.name || associationInfo?.abbreviation || null;
    
    // Check if this discipline is from open-show association
    const isOpenShowDiscipline = pbbDiscipline?.selectedAssociations?.['open-show'] || 
                                 pbbDiscipline?.association_id === 'open-show';

    // Fetch patterns from tbl_patterns - for open-show, fetch all patterns; for others, filter by discipline/association
    useEffect(() => {
        const fetchPatterns = async () => {
            if (!pbbDiscipline?.name) return;
            setLoadingPatterns(true);
            try {
                let query = supabase
                    .from('tbl_patterns')
                    .select('id, pdf_file_name, maneuvers_range, pattern_version, discipline, association_name');
                
                // For open-show disciplines, fetch ALL patterns (will be filtered by UI filters)
                // For other disciplines, filter by discipline name and association (original behavior)
                if (isOpenShowDiscipline) {
                    // Fetch all patterns for open-show - no initial filter
                } else {
                    // Use exact match (case-insensitive) to avoid matching substrings
                    // For example, "Reining" should not match "Ranch Reining"
                    query = query.ilike('discipline', pbbDiscipline.name);
                    
                    // Check if group has 2+ associations - if so, fetch patterns from all associations in group
                    const groupAssocIds = group.divisions ? [...new Set(group.divisions.map(d => d.assocId).filter(Boolean))] : [];
                    const hasMultipleAssociations = groupAssocIds.length >= 2;
                    
                    if (hasMultipleAssociations) {
                        // Fetch patterns from all associations in the group
                        const associationNames = [];
                        groupAssocIds.forEach(assocId => {
                            const assoc = associationsData?.find(a => a.id === assocId);
                            if (assoc) {
                                if (assoc.name && assoc.name !== assoc.abbreviation) {
                                    associationNames.push(assoc.name);
                                }
                                if (assoc.abbreviation) {
                                    associationNames.push(assoc.abbreviation);
                                }
                            }
                        });
                        
                        // Build OR condition for all associations
                        if (associationNames.length > 0) {
                            const orConditions = associationNames.map(name => `association_name.ilike.%${name}%`).join(',');
                            query = query.or(orConditions);
                        }
                    } else if (associationInfo) {
                        // Single association - use existing logic
                        const name = associationInfo.name;
                        const abbreviation = associationInfo.abbreviation;
                        
                        // Build OR condition to match either full name or abbreviation
                        // Format: "field.ilike.%value1%,field.ilike.%value2%"
                        if (name && abbreviation && name !== abbreviation) {
                            // Both exist and are different - use OR to match either
                            query = query.or(`association_name.ilike.%${name}%,association_name.ilike.%${abbreviation}%`);
                        } else if (name) {
                            // Use full name (or if abbreviation is same as name, just use name)
                            query = query.ilike('association_name', `%${name}%`);
                        } else if (abbreviation) {
                            // Only abbreviation available
                            query = query.ilike('association_name', `%${abbreviation}%`);
                        }
                    } else if (associationName) {
                        // Fallback to old behavior if associationInfo is not available
                        query = query.ilike('association_name', `%${associationName}%`);
                    }
                }
                
                let { data, error } = await query;
                
                // If OR query fails or returns no results, try individual queries as fallback
                if (error || (data && data.length === 0 && associationInfo)) {
                    const name = associationInfo.name;
                    const abbreviation = associationInfo.abbreviation;
                    
                    // Try fetching with individual queries and combine results
                    if (name && abbreviation && name !== abbreviation) {
                        try {
                            let query1 = supabase
                                .from('tbl_patterns')
                                .select('id, pdf_file_name, maneuvers_range, pattern_version, discipline, association_name')
                                .ilike('discipline', pbbDiscipline.name)
                                .ilike('association_name', `%${name}%`);
                            
                            let query2 = supabase
                                .from('tbl_patterns')
                                .select('id, pdf_file_name, maneuvers_range, pattern_version, discipline, association_name')
                                .ilike('discipline', pbbDiscipline.name)
                                .ilike('association_name', `%${abbreviation}%`);
                            
                            const [result1, result2] = await Promise.all([
                                query1,
                                query2
                            ]);
                            
                            // Combine results and remove duplicates
                            const combinedData = [];
                            const seenIds = new Set();
                            
                            [result1.data, result2.data].forEach(resultSet => {
                                if (resultSet) {
                                    resultSet.forEach(pattern => {
                                        if (!seenIds.has(pattern.id)) {
                                            seenIds.add(pattern.id);
                                            combinedData.push(pattern);
                                        }
                                    });
                                }
                            });
                            
                            if (combinedData.length > 0) {
                                data = combinedData;
                                error = null;
                            }
                        } catch (fallbackError) {
                            console.error('Fallback query error:', fallbackError);
                        }
                    }
                }
                
                if (error) {
                    console.error('Error fetching patterns:', error);
                    console.error('Association info:', associationInfo);
                    throw error;
                }
                
                setDbPatterns(data || []);
            } catch (err) {
                console.error('Error fetching patterns:', err);
                setDbPatterns([]);
            } finally {
                setLoadingPatterns(false);
            }
        };
        fetchPatterns();
    }, [pbbDiscipline?.name, associationInfo, associationName, isOpenShowDiscipline, associationsData, group.divisions]);

    // Get unique associations and disciplines from patterns for filters
    const patternAssociations = useMemo(() => {
        const assocs = new Set();
        dbPatterns.forEach(p => {
            if (p.association_name) {
                assocs.add(p.association_name);
            }
        });
        return Array.from(assocs).sort();
    }, [dbPatterns]);

    const patternDisciplines = useMemo(() => {
        const discs = new Set();
        // Always include the current discipline name
        if (pbbDiscipline?.name) {
            discs.add(pbbDiscipline.name);
        }
        dbPatterns.forEach(p => {
            if (p.discipline) {
                discs.add(p.discipline);
            }
        });
        return Array.from(discs).sort();
    }, [dbPatterns, pbbDiscipline?.name]);

    // Get unique associations from group divisions to determine if filters should be shown
    const uniqueAssociationsInGroup = useMemo(() => {
        if (!group.divisions || group.divisions.length === 0) return [];
        return [...new Set(group.divisions.map(d => d.assocId).filter(Boolean))];
    }, [group.divisions]);

    // Show filters for open-show when multiple pattern associations/disciplines exist
    // OR for other associations when 2+ associations in the group
    const shouldShowFilters = useMemo(() => {
        // For open-show: show when multiple pattern associations/disciplines exist (original behavior)
        if (isOpenShowDiscipline) {
            return patternAssociations.length > 1 || patternDisciplines.length > 1;
        }
        // For other associations: show when 2+ associations in group (regardless of pattern associations)
        return uniqueAssociationsInGroup.length >= 2;
    }, [isOpenShowDiscipline, patternAssociations, patternDisciplines, uniqueAssociationsInGroup]);

    // Keep discipline filter locked to current discipline for non-open-show
    useEffect(() => {
        if (!isOpenShowDiscipline && shouldShowFilters && pbbDiscipline?.name) {
            setFilterDiscipline(pbbDiscipline.name);
        }
    }, [isOpenShowDiscipline, shouldShowFilters, pbbDiscipline?.name]);

    // Filter patterns based on difficulty, association, and discipline
    useEffect(() => {
        if (dbPatterns.length > 0) {
            let filtered = dbPatterns;
            
            // Apply association and discipline filters
            if (isOpenShowDiscipline) {
                // For open-show: apply both association and discipline filters
                if (filterAssociation && filterAssociation !== 'all') {
                    filtered = filtered.filter(p => 
                        p.association_name && 
                        (p.association_name.toLowerCase().includes(filterAssociation.toLowerCase()) ||
                         filterAssociation.toLowerCase().includes(p.association_name.toLowerCase()))
                    );
                }
                
                if (filterDiscipline && filterDiscipline !== 'all') {
                    filtered = filtered.filter(p => 
                        p.discipline && 
                        p.discipline.toLowerCase().includes(filterDiscipline.toLowerCase())
                    );
                }
                
                // For open-show disciplines, show all patterns when no filters are set (don't filter by open-show)
                // This allows users to see patterns from all associations and disciplines
            } else if (uniqueAssociationsInGroup.length >= 2) {
                // For non-open-show with 2+ associations: apply association filter only
                // Discipline is locked to current discipline (already filtered in query)
                if (filterAssociation && filterAssociation !== 'all') {
                    filtered = filtered.filter(p => 
                        p.association_name && 
                        (p.association_name.toLowerCase().includes(filterAssociation.toLowerCase()) ||
                         filterAssociation.toLowerCase().includes(p.association_name.toLowerCase()))
                    );
                }
            }
            // For non-open-show with single association, no additional filtering needed (already filtered in query)
            
            // Apply difficulty filter (for all associations)
            if (selectedDifficulty && selectedDifficulty !== 'ALL') {
                filtered = filtered.filter(p => p.pattern_version === selectedDifficulty);
            }
            
            // Sort by discipline first, then by pattern number within each discipline
            filtered.sort((a, b) => {
                const nameA = a.pdf_file_name?.trim() || '';
                const nameB = b.pdf_file_name?.trim() || '';
                const disciplineA = a.discipline?.trim() || '';
                const disciplineB = b.discipline?.trim() || '';
                
                // First sort by discipline (alphabetically)
                if (disciplineA !== disciplineB) {
                    return disciplineA.localeCompare(disciplineB);
                }
                
                // Within the same discipline, sort by pattern number
                const extractPatternNumber = (fileName) => {
                    // Try to match trailing digits before optional dot/extension
                    const match = fileName.match(/(\d+)(?:\..*)?$/);
                    if (match) {
                        return parseInt(match[1], 10);
                    }
                    // Fallback: try to find any number in the filename
                    const anyNumber = fileName.match(/\d+/);
                    return anyNumber ? parseInt(anyNumber[0], 10) : 0;
                };
                
                const numA = extractPatternNumber(nameA);
                const numB = extractPatternNumber(nameB);
                
                // Sort by numeric value within the same discipline
                if (numA !== numB) {
                    return numA - numB;
                }
                return nameA.localeCompare(nameB, undefined, { numeric: true });
            });
            setFilteredPatterns(filtered);
        } else {
            setFilteredPatterns([]);
        }
    }, [selectedDifficulty, dbPatterns, filterAssociation, filterDiscipline, isOpenShowDiscipline, uniqueAssociationsInGroup]);

  // Fetch maneuvers and image when pattern is selected
  useEffect(() => {
    const fetchPatternDetails = async () => {
      if (!currentPatternId) {
        setPatternManeuvers([]);
        setPatternImage(null);
        setImageZoom(1); // Reset zoom when no pattern selected
        return;
      }
      // Reset zoom when pattern changes
      setImageZoom(1);
            try {
                // Fetch maneuvers
                const { data: maneuversData, error: maneuversError } = await supabase
                    .from('tbl_maneuvers')
                    .select('step_no, instruction')
                    .eq('pattern_id', currentPatternId)
                    .order('step_no');
                
                if (maneuversError) throw maneuversError;
                setPatternManeuvers(maneuversData || []);

                // Fetch image
                const { data: imageData, error: imageError } = await supabase
                    .from('tbl_pattern_media')
                    .select('image_url')
                    .eq('pattern_id', currentPatternId)
                    .maybeSingle();
                
                if (imageError) console.error('Error fetching pattern image:', imageError);
                setPatternImage(imageData?.image_url || null);

            } catch (err) {
                console.error('Error fetching pattern details:', err);
                setPatternManeuvers([]);
                setPatternImage(null);
            }
        };
        fetchPatternDetails();
    }, [currentPatternId]);

    // Fetch pattern image when hovering over a pattern in dropdown
    useEffect(() => {
        const fetchHoveredPatternImage = async () => {
            if (!hoveredPatternId) {
                setHoveredPatternImage(null);
                return;
            }
            setLoadingHoveredImage(true);
            try {
                const { data: imageData, error: imageError } = await supabase
                    .from('tbl_pattern_media')
                    .select('image_url')
                    .eq('pattern_id', hoveredPatternId)
                    .maybeSingle();
                
                if (imageError) console.error('Error fetching hovered pattern image:', imageError);
                setHoveredPatternImage(imageData?.image_url || null);
            } catch (err) {
                console.error('Error fetching hovered pattern image:', err);
                setHoveredPatternImage(null);
            } finally {
                setLoadingHoveredImage(false);
            }
        };
        fetchHoveredPatternImage();
    }, [hoveredPatternId]);


    const divisionsWithDetails = group.divisions.map(div => {
        const id = div.id || `${div.assocId}-${div.division}`;
        const date = (pbbDiscipline.divisionDates && pbbDiscipline.divisionDates[id]) || null;
        const customTitle = (pbbDiscipline.divisionPrintTitles && pbbDiscipline.divisionPrintTitles[id]) || null;
        return { ...div, id, date, customTitle };
    });

    const handlePatternSelect = (patternId) => {
        if (!disciplineId || !setFormData) return;
        const selectedPattern = filteredPatterns.find(p => p.id.toString() === patternId);
        setFormData(prev => {
            const newSelections = { ...(prev.patternSelections || {}) };
            if (!newSelections[disciplineId]) newSelections[disciplineId] = {};
            newSelections[disciplineId][group.id] = {
                maneuversRange: selectedPattern?.maneuvers_range || '', // Use range from the pattern itself
                patternId: parseInt(patternId),
                patternName: selectedPattern?.pdf_file_name?.trim() || `Pattern ${patternId}`,
                version: selectedPattern?.pattern_version || 'ALL',
                filterAssociation: filterAssociation !== 'all' ? filterAssociation : null // Save the filter association value
            };
            return { ...prev, patternSelections: newSelections };
        });
    };

    const handleDeleteClick = () => {
        // If there is a pattern selected, just clear the pattern
        if (currentPatternSelection?.patternId || currentPatternSelection?.maneuversRange) {
                setFormData(prev => {
                    const newSelections = { ...(prev.patternSelections || {}) };
                    if (newSelections[disciplineId]) {
                         if (newSelections[disciplineId][group.id]) {
                            // Clear the selection for this group
                            newSelections[disciplineId][group.id] = null;
                         }
                    }
                    return { ...prev, patternSelections: newSelections };
                });
                // Also reset local states
                // setSelectedManeuversRange(''); // Removed
                setFilteredPatterns([]);
                setPatternManeuvers([]);
                setSelectedDifficulty('ALL');
            }
            handleRemovePatternGroup(pbbDiscipline.id, group.id);
    };

    const hasPattern = currentPatternSelection?.patternId;
    // displayName is used for the pattern badge display, not for the group name input
    const displayName = hasPattern 
        ? currentPatternSelection.patternName || `Pattern ${currentPatternSelection.patternId}`
        : group.name;

    return (
        <div ref={setSortableNodeRef} style={style} className="p-4 border border-border rounded-lg bg-card shadow-sm">
            <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 shrink-0">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                        <Input
                            value={group.name}
                            onChange={(e) => handleGroupFieldChange(pbbDiscipline.id, group.id, 'name', e.target.value)}
                            className="font-semibold h-9"
                            disabled={hasPattern}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleAiAssistClick()}><Sparkles className="h-4 w-4 text-primary" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleDeleteClick}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            </div>

            {/* Pattern Selection Panel - DB-driven */}
            {group.divisions.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
                    <Label className="text-sm font-medium mb-2 block">Pattern Selection</Label>

                    {/* Filter Section - Show for open-show when multiple patterns exist, or for other associations when 2+ associations in group */}
                    {shouldShowFilters && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">Filter by Association</Label>
                                <Select 
                                    value={filterAssociation}
                                    onValueChange={(value) => {
                                        setFilterAssociation(value);
                                        // Clear existing pattern selection and difficulty when filter changes
                                        if (disciplineId && setFormData) {
                                            setFormData(prev => {
                                                const newSelections = { ...(prev.patternSelections || {}) };
                                                if (newSelections[disciplineId] && newSelections[disciplineId][group.id]) {
                                                    // Clear the pattern selection
                                                    newSelections[disciplineId][group.id] = null;
                                                }
                                                return { ...prev, patternSelections: newSelections };
                                            });
                                        }
                                        // Reset local states
                                        setSelectedDifficulty('ALL');
                                        setFilteredPatterns([]);
                                        setPatternManeuvers([]);
                                        setPatternImage(null);
                                    }}
                                >
                                    <SelectTrigger className="mt-1 h-9">
                                        <SelectValue placeholder="All Associations" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Associations</SelectItem>
                                        {patternAssociations.map(assoc => (
                                            <SelectItem key={assoc} value={assoc}>{assoc}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Filter by Discipline</Label>
                                <Select 
                                    value={filterDiscipline}
                                    onValueChange={setFilterDiscipline}
                                    disabled={!isOpenShowDiscipline}
                                >
                                    <SelectTrigger className="mt-1 h-9" disabled={!isOpenShowDiscipline}>
                                        <SelectValue placeholder="All Disciplines" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Disciplines</SelectItem>
                                        {patternDisciplines.map(disc => (
                                            <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-2">
                        {/* Pattern Selection Dropdown (1st) */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Select Pattern</Label>
                            <Select 
                                value={currentPatternSelection?.patternId?.toString() || ''}
                                onValueChange={(patternId) => {
                                    // Hide preview when pattern is selected
                                    setHoveredPatternId(null);
                                    // Find the selected pattern from filtered patterns and auto-set difficulty
                                    const selectedPattern = filteredPatterns.find(p => p.id.toString() === patternId) || dbPatterns.find(p => p.id.toString() === patternId);
                                    if (selectedPattern?.pattern_version) {
                                        setSelectedDifficulty(selectedPattern.pattern_version);
                                    }
                                    handlePatternSelect(patternId);
                                }}
                            >
                                <SelectTrigger className="mt-1 h-9 pattern-select-trigger">
                                    <SelectValue placeholder={loadingPatterns ? "Loading..." : "Select pattern..."}>
                                        {currentPatternSelection?.patternId ? (() => {
                                            const selectedPattern = filteredPatterns.find(p => p.id.toString() === currentPatternSelection.patternId.toString()) || dbPatterns.find(p => p.id.toString() === currentPatternSelection.patternId.toString());
                                            if (selectedPattern) {
                                                const fileName = selectedPattern.pdf_file_name?.trim() || '';
                                                const match = fileName.match(/(\d+)(?:\..*)?$/);
                                                const patternNum = match ? parseInt(match[1], 10) : selectedPattern.id;
                                                return `Pattern ${patternNum}`;
                                            }
                                            return `Pattern ${currentPatternSelection.patternId}`;
                                        })() : null}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent 
                                    onMouseLeave={() => {
                                        setHoveredPatternId(null);
                                    }}
                                >
                                    {filteredPatterns.length > 0 ? (
                                        filteredPatterns.map((pattern) => (
                                            <SelectItem 
                                                key={pattern.id}
                                                value={pattern.id.toString()}
                                                onMouseEnter={(e) => {
                                                    setHoveredPatternId(pattern.id);
                                                    // Center the preview in the middle of the screen
                                                    const screenWidth = window.innerWidth;
                                                    const screenHeight = window.innerHeight;
                                                    setHoverPosition({ 
                                                        x: screenWidth / 2, 
                                                        y: screenHeight / 2 
                                                    });
                                                }}
                                                onMouseLeave={(e) => {
                                                    // Don't hide immediately - let the preview handle its own mouse leave
                                                    // Only hide if we're not moving to the preview
                                                    const relatedTarget = e.relatedTarget;
                                                    if (relatedTarget && relatedTarget.closest('.fixed.z-\\[9999\\]')) {
                                                        return; // Moving to preview, don't hide
                                                    }
                                                    // Small delay to allow mouse to move to preview
                                                    setTimeout(() => {
                                                        setHoveredPatternId(prev => {
                                                            // Only clear if still the same pattern (to avoid race conditions)
                                                            return prev === pattern.id ? null : prev;
                                                        });
                                                    }, 100);
                                                }}
                                            >
                                                <div className="flex items-center gap-2 w-full">
                                                    <span>{(() => {
                                                        // Extract pattern number from pdf_file_name (e.g., "WesternRiding0001" → "1", "WesternRiding0001.L1" → "1")
                                                        const fileName = pattern.pdf_file_name?.trim() || '';
                                                        // Match trailing digits before optional dot/extension
                                                        const match = fileName.match(/(\d+)(?:\..*)?$/);
                                                        const patternNum = match ? parseInt(match[1], 10) : pattern.id;
                                                        return `Pattern ${patternNum}`;
                                                    })()}</span>
                                                    {pattern.pattern_version && (
                                                        <Badge variant="outline" className="text-xs">{pattern.pattern_version}</Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>
                                            {loadingPatterns ? "Loading..." : "No patterns found"}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {/* Hover Preview - Rendered via portal at body level, centered */}
                            {hoveredPatternId && typeof document !== 'undefined' && createPortal(
                                <div
                                    className="fixed z-[9999] bg-background border rounded-lg shadow-lg p-4 w-[600px] max-w-[90vw] pointer-events-auto"
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                    onMouseEnter={() => {
                                        // Keep preview visible when hovering over it
                                        if (hoveredPatternId) {
                                            setHoveredPatternId(hoveredPatternId);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredPatternId(null);
                                    }}
                                >
                                    {loadingHoveredImage ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : hoveredPatternImage ? (
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm">Pattern Preview</h4>
                                            <div className="rounded-md overflow-hidden border bg-muted/20">
                                                <img 
                                                    src={hoveredPatternImage} 
                                                    alt="Pattern Diagram" 
                                                    className="w-full h-auto object-contain max-h-[600px]"
                                                    loading="lazy"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground py-4">
                                            No image available for this pattern.
                                        </div>
                                    )}
                                </div>,
                                document.body
                            )}
                        </div>
                        
                        {/* Difficulty Dropdown (2nd - auto-set when pattern selected) */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Select Difficulty</Label>
                            <Select 
                                value={selectedDifficulty}
                                onValueChange={setSelectedDifficulty}
                            >
                                <SelectTrigger className="mt-1 h-9">
                                    <SelectValue placeholder="Select difficulty..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {PATTERN_VERSIONS.map(version => (
                                        <SelectItem key={version.id} value={version.id}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${version.dotColor}`} />
                                                <span>{version.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Working Cow Horse Scoresheet Dropdown (AQHA only) */}
                    {isWorkingCowHorseAQHA && workingCowHorseScoresheets.length > 0 && (
                        <div className="mt-2">
                            <Label className="text-xs text-muted-foreground mb-1 block">Select Score Sheet</Label>
                            <Select 
                                value={currentPatternSelection?.scoresheetId?.toString() || 'none'} 
                                onValueChange={(value) => {
                                    if (value === 'none') {
                                        setFormData(prev => {
                                            const newSelections = { ...(prev.patternSelections || {}) };
                                            if (newSelections[disciplineId]?.[group.id]) {
                                                const updated = { ...newSelections[disciplineId][group.id] };
                                                delete updated.scoresheetId;
                                                delete updated.scoresheetData;
                                                newSelections[disciplineId][group.id] = Object.keys(updated).length > 0 ? updated : null;
                                            }
                                            return { ...prev, patternSelections: newSelections };
                                        });
                                    } else {
                                        const selectedScoresheet = workingCowHorseScoresheets.find(ss => String(ss.id) === value);
                                        if (selectedScoresheet) {
                                            setFormData(prev => {
                                                const newSelections = { ...(prev.patternSelections || {}) };
                                                if (!newSelections[disciplineId]) newSelections[disciplineId] = {};
                                                newSelections[disciplineId][group.id] = {
                                                    ...(newSelections[disciplineId][group.id] || {}),
                                                    scoresheetId: parseInt(value),
                                                    scoresheetData: {
                                                        id: selectedScoresheet.id,
                                                        image_url: selectedScoresheet.image_url,
                                                        displayName: selectedScoresheet.displayName,
                                                        storage_path: selectedScoresheet.storage_path
                                                    }
                                                };
                                                return { ...prev, patternSelections: newSelections };
                                            });
                                        }
                                    }
                                }}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder={loadingScoresheets ? "Loading..." : "Select Score Sheet"}>
                                        {currentPatternSelection?.scoresheetData?.displayName || 'Select Score Sheet'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Select Score Sheet</SelectItem>
                                    {workingCowHorseScoresheets.map(ss => (
                                        <SelectItem key={ss.id} value={String(ss.id)}>
                                            {ss.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    
                    {hasPattern && (
                        <div className="mt-2 flex items-center gap-2">
                            <Badge
                                variant="secondary"
                                className="flex items-center gap-2 pr-1 h-7 hover:text-primary-foreground hover:bg-primary transition-colors"
                            >
                                {displayName}
                                <HoverCard openDelay={100} closeDelay={100}>
                                    <HoverCardTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-background/20 ml-1">
                                            <Eye className="h-3 w-3" />
                                        </Button>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-96" align="start">
                                        <div className="space-y-3">
                                            <h4 className="font-medium leading-none border-b pb-2">Pattern Details</h4>
                                            
                                            {/* Pattern Image with Nested Hover for Larger View */}
                                            {patternImage && (
                                                <div className="space-y-2">
                                                    <HoverCard openDelay={200} closeDelay={100}>
                                                        <HoverCardTrigger asChild>
                                                            <div className="rounded-md overflow-hidden border bg-muted/20 cursor-pointer hover:border-primary transition-colors">
                                                                <img 
                                                                    src={patternImage} 
                                                                    alt="Pattern Diagram" 
                                                                    className="w-full h-auto object-contain max-h-[300px]"
                                                                    loading="lazy"
                                                                />
                                                            </div>
                                                        </HoverCardTrigger>
                                                        <HoverCardContent className="w-[700px] max-w-[95vw]" align="start" side="right" sideOffset={10}>
                                                            <div className="space-y-2">
                                                                <h4 className="font-medium text-sm mb-2">Pattern Image</h4>
                                                                <div className="rounded-md border bg-muted/20 relative">
                                                                    <div className="overflow-auto max-h-[600px] min-h-[400px]">
                                                                        <div 
                                                                            className="flex items-center justify-center p-4"
                                                                            style={{ 
                                                                                minHeight: '400px'
                                                                            }}
                                                                        >
                                                                            <img 
                                                                                src={patternImage} 
                                                                                alt="Pattern Diagram - Zoomed" 
                                                                                className="object-contain transition-transform duration-200"
                                                                                loading="lazy"
                                                                                style={{ 
                                                                                    transform: `scale(${imageZoom})`,
                                                                                    transformOrigin: 'center',
                                                                                    maxWidth: '100%',
                                                                                    height: 'auto'
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    {/* Zoom Controls */}
                                                                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/95 backdrop-blur-sm rounded-md p-1 border shadow-lg z-10">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setImageZoom(prev => Math.min(prev + 0.25, 3));
                                                                            }}
                                                                            title="Zoom In"
                                                                        >
                                                                            <ZoomIn className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setImageZoom(prev => Math.max(prev - 0.25, 0.5));
                                                                            }}
                                                                            title="Zoom Out"
                                                                        >
                                                                            <ZoomOut className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setImageZoom(1);
                                                                            }}
                                                                            title="Reset Zoom"
                                                                        >
                                                                            <RotateCcw className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                    {/* Zoom Level Indicator */}
                                                                    {imageZoom !== 1 && (
                                                                        <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium border shadow-lg z-10">
                                                                            {Math.round(imageZoom * 100)}%
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </HoverCardContent>
                                                    </HoverCard>
                                                </div>
                                            )}

                                            {/* Maneuvers List */}
                                            <div className="text-sm text-muted-foreground max-h-[200px] overflow-y-auto">
                                                {patternManeuvers.length > 0 ? (
                                                    <div className="space-y-1 pl-1">
                                                        {patternManeuvers.map((m) => (
                                                            <div key={m.step_no} className="flex gap-2">
                                                                <span className="font-semibold min-w-[20px] text-right">{m.step_no}.</span>
                                                                <span>{m.instruction}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    !patternImage && <p>No details available for this pattern.</p>
                                                )}
                                            </div>
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                            </Badge>
                        </div>
                    )}
                </div>
            )}

            <div ref={setNodeRef} className={cn('min-h-[80px] p-3 rounded-md bg-muted/30 transition-colors border-2 border-dashed border-border', { 'border-primary bg-primary/10': isOver })}>
                <SortableContext items={divisionsWithDetails.map(d => d.id)} strategy={verticalListSortingStrategy} id={group.id}>
                    <div className="space-y-2">
                        {divisionsWithDetails.map(div => (
                            <SortableDivisionItem key={div.id} division={div} pbbDiscipline={pbbDiscipline} setFormData={setFormData} formData={formData} associationsData={associationsData} groupId={group.id} />
                        ))}
                    </div>
                </SortableContext>
                {group.divisions.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-6">
                        Drop divisions here
                    </div>
                )}
            </div>
        </div>
    );
};

export default DropZoneGroup;