import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Users, UserCheck, ChevronDown, MapPin, Building, CheckCircle2, AlertCircle, Trophy, Eye, Check, ChevronsUpDown, X } from 'lucide-react';
import { cn, parseLocalDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import PatternPagePreview from './PatternPagePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

// Level category badge colors (kept for reference)
const levelCategoryColors = {
  'ALL': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'L1': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'L2': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'L3': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'GR/NOV': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  'Beginner': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export const Step6_PatternAndLayout = ({ formData, setFormData, associationsData = [], stepNumber = 5 }) => {
  const { toast } = useToast();
  const [openDisciplineId, setOpenDisciplineId] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [currentDiscipline, setCurrentDiscipline] = useState(null);
  const [dialogDueDate, setDialogDueDate] = useState('');
  const [dialogJudge, setDialogJudge] = useState('');
  const [dialogStaff, setDialogStaff] = useState('');
  const disciplineRefs = useRef({});
  const [previewDiscipline, setPreviewDiscipline] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Database-driven pattern state
  const [dbPatterns, setDbPatterns] = useState({});
  const [loadingPatterns, setLoadingPatterns] = useState({});
  const [maneuversRangeMap, setManeuversRangeMap] = useState({});

  // Sync maneuversRangeMap from formData.patternSelections on mount
  useEffect(() => {
    if (formData.patternSelections) {
      const newMap = {};
      Object.keys(formData.patternSelections).forEach(disciplineId => {
        const disciplineSelections = formData.patternSelections[disciplineId];
        if (disciplineSelections && typeof disciplineSelections === 'object') {
          // Collect unique maneuversRange from ALL groups to ensure we don't miss any if they differ
          const allRanges = new Set();
          Object.values(disciplineSelections).forEach(selection => {
            const val = selection?.maneuversRange;
            if (Array.isArray(val)) {
              val.forEach(v => allRanges.add(v));
            } else if (val && typeof val === 'string') {
              allRanges.add(val);
            }
          });
          
          if (allRanges.size > 0) {
            newMap[disciplineId] = Array.from(allRanges);
          }
        }
      });
      setManeuversRangeMap(prev => ({ ...prev, ...newMap }));
    }
  }, [formData.patternSelections]);

  // Get disciplines with patterns and merge duplicates by name
  const rawPatternDisciplines = (formData.disciplines || []).filter(d => d.pattern);
  
  // Merge disciplines with the same name and filter out empty groups
  const patternDisciplines = rawPatternDisciplines.reduce((acc, discipline) => {
    const existingIndex = acc.findIndex(d => d.name === discipline.name);
    
    // Filter out groups that don't have actual divisions/content
    const validGroups = (discipline.patternGroups || []).filter(group => 
      group.divisions && group.divisions.length > 0
    );
    
    if (existingIndex === -1) {
      // First occurrence - add to array with filtered groups
      acc.push({ ...discipline, patternGroups: validGroups });
    } else {
      // Merge patternGroups from duplicate into existing
      const existing = acc[existingIndex];
      const existingGroups = existing.patternGroups || [];
      existing.patternGroups = [...existingGroups, ...validGroups];
      // Also merge association IDs if needed
      if (!existing.mergedAssociations) {
        existing.mergedAssociations = [existing.association_id];
      }
      existing.mergedAssociations.push(discipline.association_id);
    }
    return acc;
  }, []);
  
  // Get selected associations from formData
  const selectedAssociations = associationsData.filter(
    assoc => formData.associations?.[assoc.id]
  );

  // Fetch patterns from database for a discipline
  const fetchPatternsForDiscipline = async (discipline) => {
    if (!discipline?.name) return;
    const disciplineId = discipline.id;
    
    if (loadingPatterns[disciplineId] || dbPatterns[disciplineId]) return;
    
    setLoadingPatterns(prev => ({ ...prev, [disciplineId]: true }));
    
    try {
      // Get association name
      let associationName = null;
      if (discipline.association_id) {
        const assoc = associationsData?.find(a => a.id === discipline.association_id);
        if (assoc) associationName = assoc.name || assoc.abbreviation;
      }
      
      let query = supabase
        .from('tbl_patterns')
        .select('id, pdf_file_name, maneuvers_range, pattern_version, discipline, association_name')
        .ilike('discipline', `%${discipline.name}%`);
      
      if (associationName) {
        query = query.ilike('association_name', `%${associationName}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      setDbPatterns(prev => ({ ...prev, [disciplineId]: data || [] }));
    } catch (err) {
      console.error('Error fetching patterns:', err);
      setDbPatterns(prev => ({ ...prev, [disciplineId]: [] }));
    } finally {
      setLoadingPatterns(prev => ({ ...prev, [disciplineId]: false }));
    }
  };

  // Fetch patterns for all disciplines on mount
  useEffect(() => {
    patternDisciplines.forEach(discipline => {
      fetchPatternsForDiscipline(discipline);
    });
  }, [patternDisciplines.length]);

  const handlePatternSelection = (disciplineIndex, groupIndex, patternId) => {
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      newSelections[disciplineIndex][groupIndex] = patternId;
      return { ...prev, patternSelections: newSelections };
    });
  };

  // Handle maneuvers range change at discipline level (Multi-select)
  const handleManeuversRangeChange = (disciplineId, rangeValue) => {
    setManeuversRangeMap(prev => {
      const currentRanges = prev[disciplineId] || [];
      let newRanges;
      if (currentRanges.includes(rangeValue)) {
        newRanges = currentRanges.filter(r => r !== rangeValue);
      } else {
        newRanges = [...currentRanges, rangeValue];
      }
      
      // Update all groups with this new array of ranges
      if (setFormData) {
        setFormData(prevFormData => {
            const newSelections = { ...(prevFormData.patternSelections || {}) };
            if (!newSelections[disciplineId]) newSelections[disciplineId] = {};
            
            // Find the discipline to get groups
            const discipline = patternDisciplines.find(d => d.id === disciplineId);
            const groups = discipline?.patternGroups || [];
            
            groups.forEach(group => {
            newSelections[disciplineId][group.id] = {
                ...(newSelections[disciplineId]?.[group.id] || {}),
                maneuversRange: newRanges, // Store array
                patternId: null, // Reset pattern selection when range changes? Maybe keep if valid? simpler to reset for now or keep if still valid.
                patternName: null
            };
            });
            return { ...prevFormData, patternSelections: newSelections };
        });
      }

      return { ...prev, [disciplineId]: newRanges };
    });
  };

  // Handle pattern selection for a specific group
  const handleGroupPatternSelect = (disciplineId, groupId, patternId, maneuversRangeValue) => {
    const patterns = dbPatterns[disciplineId] || [];
    const selectedPattern = patterns.find(p => p.id.toString() === patternId);
    // Use provided maneuversRangeValue (string) or get from selected pattern's maneuvers_range
    const maneuversRange = maneuversRangeValue || selectedPattern?.maneuvers_range || '';
    
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineId]) newSelections[disciplineId] = {};
      newSelections[disciplineId][groupId] = {
        maneuversRange, // Store as string to match Step 3 format
        patternId: parseInt(patternId),
        patternName: selectedPattern?.pdf_file_name?.trim() || `Pattern ${patternId}`,
        version: selectedPattern?.pattern_version || 'ALL'
      };
      return { ...prev, patternSelections: newSelections };
    });
  };

  // Get available maneuvers ranges for a discipline
  const getManeuversRanges = (disciplineId) => {
    const patterns = dbPatterns[disciplineId] || [];
    return [...new Set(patterns.filter(p => p.maneuvers_range).map(p => p.maneuvers_range))];
  };

  // Get filtered patterns for a discipline based on selected maneuvers range
  const getFilteredPatterns = (disciplineId) => {
    const patterns = dbPatterns[disciplineId] || [];
    const ranges = maneuversRangeMap[disciplineId]; // This is now an array
    if (!ranges || ranges.length === 0) return [];
    // Show pattern if its range is in the selected ranges
    return patterns.filter(p => ranges.includes(p.maneuvers_range));
  };

  // Get pattern selection from formData
  const getPatternSelection = (disciplineId, groupId) => {
    return formData.patternSelections?.[disciplineId]?.[groupId];
  };

  // Check if discipline is complete
  const isDisciplineComplete = (discipline) => {
    const groups = discipline.patternGroups || [];
    if (groups.length === 0) return false;
    
    return groups.every(group => {
      const selection = getPatternSelection(discipline.id, group.id);
      return selection?.patternId;
    });
  };

  const handleOpenAssignDialog = (discipline, disciplineIndex) => {
    // Get all judges from all associations
    const associationJudges = [];
    if (formData.associationJudges) {
      Object.values(formData.associationJudges).forEach(assocData => {
        const judges = assocData?.judges || [];
        judges.forEach(judge => {
          if (judge.name && !associationJudges.find(j => j.name === judge.name)) {
            associationJudges.push(judge);
          }
        });
      });
    }
    
    setCurrentDiscipline({ ...discipline, disciplineIndex, associationJudges });

    // Prefill from any existing discipline-level selections first
    const existingJudge = formData.judgeSelections?.[disciplineIndex]
      || formData.groupJudges?.[disciplineIndex]?.[0]
      || '';
    const existingStaff = formData.staffSelections?.[disciplineIndex]
      || formData.groupStaff?.[disciplineIndex]?.[0]
      || '';
    const existingDueDate = formData.dueDateSelections?.[disciplineIndex]
      || formData.disciplineDueDates?.[disciplineIndex]
      || '';

    setDialogJudge(existingJudge);
    setDialogStaff(existingStaff);
    setDialogDueDate(existingDueDate);
    setAssignDialogOpen(true);
  };

  const handleAssignPattern = () => {
    if (!currentDiscipline) return;
    
    const { disciplineIndex } = currentDiscipline;
    const groups = currentDiscipline.patternGroups || [];
    const selectedPattern = disciplinePatternSelections[disciplineIndex];

    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      const newJudges = { ...(prev.groupJudges || {}) };
      const newStaff = { ...(prev.groupStaff || {}) };
      const newDueDates = { ...(prev.disciplineDueDates || {}) };

      // Discipline-level summary values used for row display
      const judgeSelections = [...(prev.judgeSelections || [])];
      const staffSelections = [...(prev.staffSelections || [])];
      const dueDateSelections = [...(prev.dueDateSelections || [])];

      // Initialize discipline entries
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      if (!newJudges[disciplineIndex]) newJudges[disciplineIndex] = {};
      if (!newStaff[disciplineIndex]) newStaff[disciplineIndex] = {};

      // Apply judge and staff to all groups (don't overwrite existing pattern selections)
      groups.forEach((group, groupIndex) => {
        // Only set pattern if no existing selection for this group
        if (selectedPattern && !newSelections[disciplineIndex][groupIndex]) {
          const difficultyOptions = getGroupDifficultyOptions(selectedPattern, currentDiscipline.name || '', group);
          const difficultyOption = difficultyOptions[0]; // First available option for this group type
          newSelections[disciplineIndex][groupIndex] = difficultyOption?.id || selectedPattern;
        }
        if (dialogJudge) newJudges[disciplineIndex][groupIndex] = dialogJudge;
      });

      // Set due date at discipline level
      if (dialogDueDate) {
        newDueDates[disciplineIndex] = dialogDueDate;
      }

      // Store discipline-level selections for display on the row (only if selected)
      if (dialogJudge) {
        judgeSelections[disciplineIndex] = dialogJudge;
      }
      if (dialogDueDate) {
        dueDateSelections[disciplineIndex] = dialogDueDate;
      }

      return {
        ...prev,
        patternSelections: newSelections,
        groupJudges: newJudges,
        disciplineDueDates: newDueDates,
        judgeSelections,
        dueDateSelections,
      };
    });

    setAssignDialogOpen(false);
  };

  const dateRange = formData.startDate && formData.endDate
    ? `${format(parseLocalDate(formData.startDate), 'MMM d')} - ${format(parseLocalDate(formData.endDate), 'MMM d, yyyy')}`
    : 'Dates not set';

  // Judges with associated associations
  const judgesWithAssociations = [];
  if (formData.associationJudges) {
    Object.keys(formData.associationJudges).forEach(assocId => {
      const assocJudges = formData.associationJudges[assocId]?.judges || [];
      assocJudges.forEach(judge => {
        if (judge?.name) {
          // Find association display name (prefer abbreviation)
          const association = (associationsData || []).find(a => a.id === assocId) || selectedAssociations.find(a => a.id === assocId);
          const assocName = association?.abbreviation || association?.name || assocId;

          const existing = judgesWithAssociations.find(j => j.name === judge.name);
          if (existing) {
            if (!existing.associations.includes(assocName)) {
              existing.associations.push(assocName);
            }
          } else {
            judgesWithAssociations.push({
              name: judge.name,
              associations: [assocName],
            });
          }
        }
      });
    });
  }

  const showStaff = formData.officials || [];

  // Scroll to discipline and expand it
  const scrollToDiscipline = (disciplineId) => {
    const ref = disciplineRefs.current[disciplineId];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Expand the discipline
      setOpenDisciplineId(disciplineId);
    }
  };

  return (
    <motion.div
      key="step6-pattern-layout"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader>
        <CardTitle>
          Step {stepNumber}: Pattern Selection
        </CardTitle>
        <CardDescription>
          Assign patterns to each group for your book.
        </CardDescription>
        {formData.showName && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-xl font-semibold">
              Horse Show {formData.showName}
            </h3>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Show summary - 3 column layout */}
        <Card className="p-4 bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Show Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Show Information</h3>
              <div className="space-y-3 text-sm">
                {formData.showName && (
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 mt-0.5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground">Show Name</p>
                      <p className="font-medium">{formData.showName}</p>
                    </div>
                  </div>
                )}
                {formData.venueName && (
                  <div className="flex items-start gap-2">
                    <Building className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground">Venue Name</p>
                      <p className="text-muted-foreground">{formData.venueName}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <CalendarIcon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground">Show Dates</p>
                    <p className="text-muted-foreground">{dateRange}</p>
                  </div>
                </div>
                {formData.venueAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground">Location</p>
                      <p className="text-muted-foreground">{formData.venueAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column - Staff */}
            <div className="space-y-4">
              {/* Show Staff Section */}
              <div className="border rounded-lg p-3">
                <h3 className="text-lg font-semibold mb-3">Show Staff</h3>
                <div className="space-y-2">
                  {showStaff.length > 0 ? (
                    showStaff.map((staff, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-blue-600 font-medium">{staff.role}:</span>
                        <span className="font-semibold uppercase">{staff.name || 'Not assigned'}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No staff assigned</span>
                  )}
                </div>
              </div>

              {/* Judges Section */}
              <div className="border rounded-lg p-3">
                <h3 className="text-lg font-semibold mb-3">Show Judges</h3>
                <div className="space-y-2">
                  {judgesWithAssociations.length > 0 ? (
                    judgesWithAssociations.map((judge, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="font-medium uppercase text-sm">{judge.name}</span>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">
                          - {judge.associations.join(', ')}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No judges assigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Discipline Folder */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Discipline Folders</h3>
              <div className="text-xs text-muted-foreground mb-2">
                {(() => {
                  const completeDisciplines = patternDisciplines.filter((discipline) => {
                    return isDisciplineComplete(discipline);
                  }).length;
                  const allComplete = completeDisciplines === patternDisciplines.length && patternDisciplines.length > 0;
                  return `${completeDisciplines} of ${patternDisciplines.length} disciplines ${allComplete ? 'complete' : 'incomplete'}`;
                })()}
              </div>
              <div className="space-y-2">
                {patternDisciplines.map((discipline) => {
                  const groups = discipline.patternGroups || [];
                  const isComplete = isDisciplineComplete(discipline);
                  const assignedCount = groups.filter(group => {
                    const selection = getPatternSelection(discipline.id, group.id);
                    return selection?.patternId;
                  }).length;
                  
                  return (
                    <div
                      key={discipline.id}
                      onClick={() => scrollToDiscipline(discipline.id)}
                      className={cn(
                        "p-3 rounded-lg border-2 flex items-center justify-between cursor-pointer transition-all",
                        isComplete 
                          ? "bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-950/30" 
                          : "bg-orange-50 border-orange-300 dark:bg-orange-950/20 dark:border-orange-700 hover:bg-destructive/10 hover:border-destructive dark:hover:border-destructive"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className={cn(
                            "w-4 h-4",
                            isComplete ? "text-orange-600 dark:text-orange-400" : "text-destructive"
                          )} />
                        )}
                        <div>
                          <p className="font-semibold text-sm">{discipline.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignedCount} pattern{assignedCount !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-semibold px-2 py-1 rounded",
                          isComplete ? "text-green-700 dark:text-green-300" : "text-orange-700 dark:text-orange-300"
                        )}>
                          {isComplete ? 'Complete' : 'Incomplete'}
                        </span>
                        {isComplete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewDiscipline(discipline);
                              setIsPreviewOpen(true);
                            }}
                            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Pattern selection accordion-style list */}
        {patternDisciplines.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Pattern Selection</h3>
            <div className="space-y-2">
              {patternDisciplines.map((discipline, logicalIndex) => {
                const disciplineIndex = (formData.disciplines || []).findIndex(d => d.id === discipline.id);
                const isOpen = openDisciplineId === discipline.id;
                const groups = discipline.patternGroups || [];
                
                // Filter judges by this discipline's association
                const disciplineJudges = [];
                if (discipline.association_id && formData.associationJudges) {
                  const assocJudges = formData.associationJudges[discipline.association_id]?.judges || [];
                  assocJudges.forEach(judge => {
                    if (judge.name) {
                      disciplineJudges.push(judge);
                    }
                  });
                }

                return (
                  <div 
                    key={discipline.id} 
                    className="bg-card rounded-lg border"
                    ref={(el) => disciplineRefs.current[discipline.id] = el}
                  >
                    {/* Toggle row with inline pattern selection */}
                    <div className="w-full flex items-center gap-3 px-4 py-3 border-b">
                      <button
                        type="button"
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                        onClick={() =>
                          setOpenDisciplineId(prev => (prev === discipline.id ? null : discipline.id))
                        }
                      >
                        <span className="font-semibold text-base">{discipline.name}</span>
                        {groups.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
                          </Badge>
                        )}
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform text-muted-foreground',
                            isOpen ? 'rotate-180' : 'rotate-0'
                          )}
                        />
                      </button>
                      
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        {/* Pattern Set (Maneuvers) dropdown - database driven */}
                        {/* Pattern Set (Maneuvers) dropdown - Multi-select */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-[250px] justify-between bg-background"
                            >
                              <span className="truncate">
                                {maneuversRangeMap[discipline.id]?.length > 0
                                  ? `${maneuversRangeMap[discipline.id].length} selected`
                                  : "Select Pattern Range..."}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[250px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search ranges..." />
                              <CommandList>
                                <CommandEmpty>No pattern ranges found.</CommandEmpty>
                                <CommandGroup>
                                  {loadingPatterns[discipline.id] ? (
                                     <CommandItem disabled>Loading...</CommandItem>
                                  ) : getManeuversRanges(discipline.id).map((range) => {
                                    const isSelected = (maneuversRangeMap[discipline.id] || []).includes(range);
                                    return (
                                      <CommandItem
                                        key={range}
                                        value={range}
                                        onSelect={() => handleManeuversRangeChange(discipline.id, range)}
                                      >
                                        <div
                                          className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            isSelected
                                              ? "bg-primary text-primary-foreground"
                                              : "opacity-50 [&_svg]:invisible"
                                          )}
                                        >
                                          <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>Pattern {range}</span>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                                {maneuversRangeMap[discipline.id]?.length > 0 && (
                                     <CommandGroup className="pt-0">
                                         <CommandItem
                                            onSelect={() => {
                                                // Clear all
                                                setManeuversRangeMap(prev => ({ ...prev, [discipline.id]: [] }));
                                                 // Also clear in form data if needed, similar to handleManeuversRangeChange logic but clearing
                                                 // For brevity, relying on user unchecking all or we can add a clear handler logic if strictly needed.
                                                 // Re-using handler for simplicity by clearing manually:
                                                 setFormData(prev => { /* similar clean up logic */ 
                                                    const newSelections = { ...(prev.patternSelections || {}) };
                                                    if (!newSelections[discipline.id]) newSelections[discipline.id] = {};
                                                    discipline.patternGroups?.forEach(g => {
                                                        if(newSelections[discipline.id][g.id]) {
                                                            newSelections[discipline.id][g.id].maneuversRange = [];
                                                            newSelections[discipline.id][g.id].patternId = null;
                                                            newSelections[discipline.id][g.id].patternName = null;
                                                        }
                                                    });
                                                    return { ...prev, patternSelections: newSelections };
                                                 });
                                                 setManeuversRangeMap(prev => ({ ...prev, [discipline.id]: [] })); 
                                            }}
                                            className="justify-center text-center font-medium text-destructive mt-1"
                                         >
                                            Clear Selection
                                         </CommandItem>
                                     </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        
                        <Button 
                          onClick={() => handleOpenAssignDialog(discipline, disciplineIndex)}
                          className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                        >
                          Assign Pattern Selection
                        </Button>

                        {/* Display pattern badges from Step 3 selections */}
                        {(() => {
                          const groupSelections = groups.map((group) => {
                            const selection = getPatternSelection(discipline.id, group.id);
                            if (!selection?.patternId && !selection?.patternName) return null;
                            
                            const patternName = selection.patternName || '';
                            const match = patternName.match(/PATTERN\s*\d+/i);
                            const shortName = match ? match[0].toUpperCase() : patternName;
                            const version = selection.version || '';
                            
                            return {
                              groupName: group.name,
                              displayText: version ? `${shortName} (${version})` : shortName
                            };
                          }).filter(Boolean);
                          
                          return groupSelections.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {groupSelections.map((sel, idx) => (
                                <Badge key={idx} className="bg-green-100 text-green-800 border-green-200 text-xs whitespace-nowrap">
                                  {sel.displayText}
                                </Badge>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Display assigned labels with values */}
                        {formData.judgeSelections?.[disciplineIndex] && (
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
                            Judge:{' '}
                            {(() => {
                              const judge = disciplineJudges.find((j, idx) => (j.id || `judge-${idx}`) === formData.judgeSelections[disciplineIndex]);
                              return judge?.name || formData.judgeSelections[disciplineIndex];
                            })()}
                          </Badge>
                        )}
                        {formData.dueDateSelections?.[disciplineIndex] && (
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap">
                            Due Date: {format(new Date(formData.dueDateSelections[disciplineIndex]), 'MM/dd/yy')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 space-y-4">
                        {/* Group Level Details */}
                        <div className="space-y-3">
                          {groups.map((group, groupIndex) => {
                            const currentSelection = getPatternSelection(discipline.id, group.id);
                            const filteredPatterns = getFilteredPatterns(discipline.id);
                            
                            return (
                              <div
                                key={group.id}
                                className="p-4 border rounded-lg bg-background/50 space-y-4"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Label className="font-semibold text-base">{group.name}</Label>
                                    {/* Show pattern badge if selected */}
                                    {currentSelection?.patternName && (
                                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                        {currentSelection.patternName} {currentSelection.version && `(${currentSelection.version})`}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {(group.divisions || []).map(div => (
                                      <Badge
                                        key={`${div.assocId}-${div.division}`}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {div.division}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                {/* Pattern Selection - database driven */}
                                <div>
                                  <Label className="text-sm text-muted-foreground mb-1 block">
                                    Select Pattern
                                  </Label>
                                  <Select
                                    value={currentSelection?.patternId?.toString() || ''}
                                    onValueChange={(value) => {
                                      // Find the selected pattern to get its maneuvers_range
                                      const selectedPattern = filteredPatterns.find(p => p.id.toString() === value);
                                      const patternManeuversRange = selectedPattern?.maneuvers_range || '';
                                      handleGroupPatternSelect(discipline.id, group.id, value, patternManeuversRange);
                                    }}
                                    disabled={!maneuversRangeMap[discipline.id] || maneuversRangeMap[discipline.id].length === 0}
                                  >
                                    <SelectTrigger className="bg-background">
                                      <SelectValue placeholder={(maneuversRangeMap[discipline.id]?.length > 0) ? "Select a pattern..." : "Select Pattern Set first..."} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background z-50 max-h-[300px]">
                                      {filteredPatterns.length > 0 ? (
                                        // Group patterns by range if we have ranges
                                        (maneuversRangeMap[discipline.id] || []).length > 0 ? (
                                           (maneuversRangeMap[discipline.id] || []).map((range, idx) => {
                                             // Get patterns for this specific range that are also in filteredPatterns
                                             const rangePatterns = filteredPatterns.filter(p => p.maneuvers_range === range);
                                             if (rangePatterns.length === 0) return null;

                                             return (
                                               <React.Fragment key={range}>
                                                 {idx > 0 && <SelectSeparator />}
                                                 <SelectGroup>
                                                   <SelectLabel className="sticky top-0 bg-background z-10 px-2 py-1.5 font-semibold text-xs text-muted-foreground bg-muted/30">
                                                     Pattern {range}
                                                   </SelectLabel>
                                                   {rangePatterns.map(p => (
                                                     <SelectItem key={p.id} value={p.id.toString()}>
                                                       <span className="flex items-center gap-2">
                                                         {p.pdf_file_name || `Pattern ${p.id}`}
                                                         {p.pattern_version && (
                                                           <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800">
                                                             {p.pattern_version}
                                                           </Badge>
                                                         )}
                                                       </span>
                                                     </SelectItem>
                                                   ))}
                                                 </SelectGroup>
                                               </React.Fragment>
                                             );
                                           })
                                        ) : (
                                          // Fallback if somehow no ranges but we have patterns (shouldn't happen with current logic but safe)
                                          filteredPatterns.map(p => (
                                            <SelectItem key={p.id} value={p.id.toString()}>
                                              <span className="flex items-center gap-2">
                                                {p.pdf_file_name || `Pattern ${p.id}`}
                                                {p.pattern_version && (
                                                  <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800">
                                                    {p.pattern_version}
                                                  </Badge>
                                                )}
                                              </span>
                                            </SelectItem>
                                          ))
                                        )
                                      ) : (
                                        <SelectItem value="no-pattern" disabled>
                                          {(maneuversRangeMap[discipline.id]?.length > 0) ? 'No patterns for selected ranges' : 'Select Pattern Set first'}
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Assign Pattern Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Pattern</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dialog-judge" className="text-sm mb-2 block">Assign Judge</Label>
                <Select value={dialogJudge} onValueChange={setDialogJudge}>
                  <SelectTrigger id="dialog-judge" className="bg-background">
                    <SelectValue placeholder="Select a judge..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {(currentDiscipline?.associationJudges || []).length > 0 ? (
                      (currentDiscipline?.associationJudges || []).map((judge, idx) => (
                        <SelectItem key={idx} value={judge.id || `judge-${idx}`}>
                          {judge.name || 'Unnamed Judge'}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-judges" disabled>No judges for this association</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>


              {dialogJudge?.trim() && (
                <div>
                  <Label htmlFor="dialog-due-date" className="text-sm mb-2 block">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dialogDueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dialogDueDate ? format(new Date(dialogDueDate), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dialogDueDate ? new Date(dialogDueDate) : undefined}
                        onSelect={(date) => setDialogDueDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignPattern}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pattern Preview Modal */}
        <PatternPagePreview
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          discipline={previewDiscipline ? {
              ...previewDiscipline,
              patternGroups: (previewDiscipline.patternGroups || []).map(group => {
                  const selection = getPatternSelection(previewDiscipline.id, group.id);
                  return {
                      ...group,
                      selectedPatternId: selection?.patternId,
                      selectedPatternName: selection?.patternName
                  };
              })
          } : null}
          associationsData={associationsData}
        />
      </CardContent>
    </motion.div>
  );
};
