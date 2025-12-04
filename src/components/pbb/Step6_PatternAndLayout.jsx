import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Users, UserCheck, ChevronDown, MapPin, Building, CheckCircle2, AlertCircle, Trophy, Eye } from 'lucide-react';
import { cn, parseLocalDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import PatternPagePreview from './PatternPagePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

// Generate dynamic pattern options based on discipline name
const getPatternOptions = (disciplineName) => [
  { id: 'pat_101', name: `Pattern Set #101 - ${disciplineName}`, patternNumber: '101' },
  { id: 'pat_203', name: `Pattern Set #203 - ${disciplineName}`, patternNumber: '203' },
];

// Difficulty levels for group dropdowns - ordered: Championship > Skilled > Intermediate > Beginner > Walk-Trot
const difficultyLevels = ['Championship', 'Skilled', 'Intermediate', 'Beginner', 'Walk-Trot'];

// Pattern ID to number mapping
const patternMap = { 'pat_101': '101', 'pat_203': '203' };

// Difficulty badge colors
const difficultyColors = {
  'Championship': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Skilled': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Intermediate': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Beginner': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Walk-Trot': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

// Check if a group contains Walk-Trot divisions
const isWalkTrotGroup = (group) => {
  if (!group?.divisions) return false;
  
  // Check group name first
  const groupName = (group.name || group.groupName || '').toLowerCase();
  if (groupName.includes('walk-trot') || groupName.includes('walk/trot') || groupName.includes('w/t')) {
    return true;
  }
  
  // Check each division's name
  return group.divisions.some(div => {
    // Check multiple possible property names for division name
    const divName = (div.name || div.divisionName || div.division || div.levelName || div.label || '').toLowerCase();
    const divisionField = (div.division_group || div.divisionGroup || '').toLowerCase();
    const levelField = (div.division_level || div.divisionLevel || '').toLowerCase();
    
    const fullName = `${divName} ${divisionField} ${levelField}`.toLowerCase();
    return fullName.includes('walk-trot') || fullName.includes('walk/trot') || fullName.includes('walktrot') || fullName.includes('w/t');
  });
};

// Get group difficulty options based on selected main pattern, discipline name, and group
const getGroupDifficultyOptions = (patternId, disciplineName, group) => {
  const patternNumber = patternMap[patternId] || '101';
  const isWalkTrot = isWalkTrotGroup(group);
  
  // Filter difficulty levels - Walk-Trot option only shows for Walk-Trot groups, all other options available for all
  const filteredLevels = difficultyLevels.filter(difficulty => {
    if (difficulty === 'Walk-Trot') return isWalkTrot; // Walk-Trot option only for Walk-Trot groups
    return true; // All other options (Championship, Skilled, Intermediate, Beginner) available for all groups
  });
  
  return filteredLevels.map((difficulty) => ({
    id: `${patternId}_${difficulty.toLowerCase().replace('-', '')}`,
    name: `Pattern Set #${patternNumber} - ${disciplineName}`,
    difficulty
  }));
};

export const Step6_PatternAndLayout = ({ formData, setFormData, associationsData = [] }) => {
  const { toast } = useToast();
  const [openDisciplineId, setOpenDisciplineId] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [currentDiscipline, setCurrentDiscipline] = useState(null);
  // Initialize from saved formData.disciplinePatterns if available
  const [disciplinePatternSelections, setDisciplinePatternSelections] = useState(
    () => formData.disciplinePatterns || {}
  );
  const [dialogDueDate, setDialogDueDate] = useState('');
  const [dialogJudge, setDialogJudge] = useState('');
  const [dialogStaff, setDialogStaff] = useState('');
  const disciplineRefs = useRef({});
  const [previewDiscipline, setPreviewDiscipline] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Sync local state with formData when project loads
  useEffect(() => {
    if (formData.disciplinePatterns && Object.keys(formData.disciplinePatterns).length > 0) {
      setDisciplinePatternSelections(formData.disciplinePatterns);
    }
  }, [formData.disciplinePatterns]);

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

  const handlePatternSelection = (disciplineIndex, groupIndex, patternId) => {
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      newSelections[disciplineIndex][groupIndex] = patternId;
      return { ...prev, patternSelections: newSelections };
    });
  };

  const handleDisciplineDueDateChange = (disciplineIndex, value) => {
    setFormData(prev => {
      const next = { ...(prev.disciplineDueDates || {}) };
      next[disciplineIndex] = value;
      return { ...prev, disciplineDueDates: next };
    });
  };

  const handleStaffSelection = (disciplineIndex, groupIndex, staffId) => {
    setFormData(prev => {
      const newStaff = { ...(prev.groupStaff || {}) };
      if (!newStaff[disciplineIndex]) newStaff[disciplineIndex] = {};
      newStaff[disciplineIndex][groupIndex] = staffId;
      return { ...prev, groupStaff: newStaff };
    });
  };

  const handleJudgeSelection = (disciplineIndex, groupIndex, judgeId) => {
    setFormData(prev => {
      const newJudges = { ...(prev.groupJudges || {}) };
      if (!newJudges[disciplineIndex]) newJudges[disciplineIndex] = {};
      newJudges[disciplineIndex][groupIndex] = judgeId;
      return { ...prev, groupJudges: newJudges };
    });
  };

  const handleDisciplinePatternChange = (disciplineIndex, patternId) => {
    setDisciplinePatternSelections(prev => ({ ...prev, [disciplineIndex]: patternId }));
    
    // Auto-apply difficulty levels to groups based on pattern selection
    const discipline = patternDisciplines.find((d, idx) => 
      (formData.disciplines || []).findIndex(fd => fd.id === d.id) === disciplineIndex
    );
    const groups = discipline?.patternGroups || [];
    
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      
      // Non-Walk-Trot difficulty order for auto-assignment
      const regularDifficultyOrder = ['Championship', 'Skilled', 'Intermediate', 'Beginner'];
      let regularIndex = 0;
      
      // Auto-assign different difficulty levels per group
      groups.forEach((group, groupIndex) => {
        const isWalkTrot = isWalkTrotGroup(group);
        
        if (isWalkTrot) {
          // Walk-Trot groups get Walk-Trot difficulty - use same ID format as getGroupDifficultyOptions
          newSelections[disciplineIndex][groupIndex] = `${patternId}_walktrot`;
        } else {
          // Non-Walk-Trot groups get different difficulties in order (cycling if more groups than levels)
          const difficulty = regularDifficultyOrder[regularIndex % regularDifficultyOrder.length];
          // Use same ID format as getGroupDifficultyOptions: lowercase, no hyphen
          newSelections[disciplineIndex][groupIndex] = `${patternId}_${difficulty.toLowerCase()}`;
          regularIndex++;
        }
      });
      
      // Save discipline-level pattern selections to formData for persistence
      const newDisciplinePatterns = { ...(prev.disciplinePatterns || {}), [disciplineIndex]: patternId };
      
      return { ...prev, patternSelections: newSelections, disciplinePatterns: newDisciplinePatterns };
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
          Step 5: Pattern Selection
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
                    const groups = discipline.patternGroups || [];
                    const disciplineIndex = (formData.disciplines || []).findIndex(d => d.id === discipline.id);
                    const assignedCount = groups.filter(
                      (_, idx) => formData.patternSelections?.[disciplineIndex]?.[idx]
                    ).length;
                    return assignedCount === groups.length && groups.length > 0;
                  }).length;
                  const allComplete = completeDisciplines === patternDisciplines.length && patternDisciplines.length > 0;
                  return `${completeDisciplines} of ${patternDisciplines.length} disciplines ${allComplete ? 'complete' : 'incomplete'}`;
                })()}
              </div>
              <div className="space-y-2">
                {patternDisciplines.map((discipline) => {
                  const groups = discipline.patternGroups || [];
                  const disciplineIndex = (formData.disciplines || []).findIndex(d => d.id === discipline.id);
                  const assignedCount = groups.filter(
                    (_, idx) => formData.patternSelections?.[disciplineIndex]?.[idx]
                  ).length;
                  const isComplete = assignedCount === groups.length && groups.length > 0;
                  
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
                        <Select
                          value={disciplinePatternSelections[disciplineIndex] || ''}
                          onValueChange={(value) => handleDisciplinePatternChange(disciplineIndex, value)}
                        >
                          <SelectTrigger className="w-[280px] bg-background">
                            <SelectValue placeholder="Select Pattern..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {getPatternOptions(discipline.name).map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Button 
                          onClick={() => handleOpenAssignDialog(discipline, disciplineIndex)}
                          className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                        >
                          Assign Pattern Selection
                        </Button>

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
                          {groups.map((group, groupIndex) => (
                            <div
                              key={group.id}
                              className="p-4 border rounded-lg bg-background/50 space-y-4"
                            >
                              <div>
                                <Label className="font-semibold text-base">{group.name}</Label>
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

                              {/* Pattern Selection */}
                              <div>
                                <Label className="text-sm text-muted-foreground mb-1 block">
                                  Select Pattern
                                </Label>
                                <Select
                                  value={
                                    formData.patternSelections?.[disciplineIndex]?.[groupIndex] || ''
                                  }
                                  onValueChange={value =>
                                    handlePatternSelection(disciplineIndex, groupIndex, value)
                                  }
                                >
                                  <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Select a pattern..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background z-50">
                                    {disciplinePatternSelections[disciplineIndex] ? (
                                      getGroupDifficultyOptions(disciplinePatternSelections[disciplineIndex], discipline.name, group).map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                          <span className="flex items-center gap-2">
                                            {p.name}
                                            <Badge className={cn("text-[10px] px-1.5 py-0", difficultyColors[p.difficulty])}>
                                              {p.difficulty}
                                            </Badge>
                                          </span>
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="no-pattern" disabled>Select main pattern first</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                             </div>
                           ))}
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
          discipline={previewDiscipline}
          associationsData={associationsData}
        />
      </CardContent>
    </motion.div>
  );
};
