import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Users, UserCheck, ChevronDown, MapPin, Building, CheckCircle2, AlertCircle, Trophy } from 'lucide-react';
import { cn, parseLocalDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const samplePatterns = [
  { id: 'pat_1', name: 'Classic Horsemanship #101', difficulty: 'Intermediate' },
  { id: 'pat_2', name: 'Advanced Trail Challenge #203', difficulty: 'Advanced' },
  { id: 'pat_3', name: 'Beginner Reining Loop', difficulty: 'Beginner' },
  { id: 'pat_4', name: 'Smooth Equitation Flow', difficulty: 'Intermediate' },
];

export const Step6_PatternAndLayout = ({ formData, setFormData, associationsData = [] }) => {
  const [openDisciplineId, setOpenDisciplineId] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [currentDiscipline, setCurrentDiscipline] = useState(null);
  const [disciplinePatternSelections, setDisciplinePatternSelections] = useState({});
  const [dialogDueDate, setDialogDueDate] = useState('');
  const [dialogJudge, setDialogJudge] = useState('');
  const [dialogStaff, setDialogStaff] = useState('');

  const patternDisciplines = (formData.disciplines || []).filter(d => d.pattern);
  
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
    
    // Auto-apply to all groups
    const discipline = patternDisciplines.find((d, idx) => 
      (formData.disciplines || []).findIndex(fd => fd.id === d.id) === disciplineIndex
    );
    const groups = discipline?.patternGroups || [];
    
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      
      groups.forEach((_, groupIndex) => {
        newSelections[disciplineIndex][groupIndex] = patternId;
      });
      
      return { ...prev, patternSelections: newSelections };
    });
  };

  const handleOpenAssignDialog = (discipline, disciplineIndex) => {
    // Filter judges by discipline's association
    const associationJudges = [];
    if (discipline.association_id && formData.associationJudges) {
      const assocJudges = formData.associationJudges[discipline.association_id]?.judges || [];
      assocJudges.forEach(judge => {
        if (judge.name) {
          associationJudges.push(judge);
        }
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

      // Apply to all groups in this discipline (keeps existing group behaviour)
      groups.forEach((_, groupIndex) => {
        if (selectedPattern) newSelections[disciplineIndex][groupIndex] = selectedPattern;
        if (dialogJudge) newJudges[disciplineIndex][groupIndex] = dialogJudge;
        if (dialogStaff) newStaff[disciplineIndex][groupIndex] = dialogStaff;
      });

      // Set due date at discipline level
      if (dialogDueDate) {
        newDueDates[disciplineIndex] = dialogDueDate;
      }

      // Store discipline-level selections for display on the row (only if selected)
      if (dialogJudge) {
        judgeSelections[disciplineIndex] = dialogJudge;
      }
      if (dialogStaff) {
        staffSelections[disciplineIndex] = dialogStaff;
      }
      if (dialogDueDate) {
        dueDateSelections[disciplineIndex] = dialogDueDate;
      }

      return {
        ...prev,
        patternSelections: newSelections,
        groupJudges: newJudges,
        groupStaff: newStaff,
        disciplineDueDates: newDueDates,
        judgeSelections,
        staffSelections,
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

  return (
    <motion.div
      key="step6-pattern-layout"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader>
        <CardTitle>
          Step 5: Select Patterns
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
                      className={cn(
                        "p-3 rounded-lg border-2 flex items-center justify-between transition-colors",
                        isComplete 
                          ? "bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-700" 
                          : "bg-orange-50 border-orange-300 dark:bg-orange-950/20 dark:border-orange-700"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        )}
                        <div>
                          <p className="font-semibold text-sm">{discipline.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignedCount} pattern{assignedCount !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-semibold px-2 py-1 rounded",
                        isComplete ? "text-green-700 dark:text-green-300" : "text-orange-700 dark:text-orange-300"
                      )}>
                        {isComplete ? 'Complete' : 'Incomplete'}
                      </span>
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
                  <div key={discipline.id} className="bg-card rounded-lg border">
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
                            {samplePatterns.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}{' '}
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  {p.difficulty}
                                </Badge>
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
                              const judge = judges.find((j, idx) => (j.id || `judge-${idx}`) === formData.judgeSelections[disciplineIndex]);
                              return judge?.name || formData.judgeSelections[disciplineIndex];
                            })()}
                          </Badge>
                        )}
                        {formData.staffSelections?.[disciplineIndex] && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border border-green-500/20 whitespace-nowrap">
                            Staff:{' '}
                            {(() => {
                              const staff = showStaff.find((s, idx) => (s.id || `staff-${idx}`) === formData.staffSelections[disciplineIndex]);
                              return staff ? `${staff.role} - ${staff.name || 'Unnamed'}` : formData.staffSelections[disciplineIndex];
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

                              {/* Pattern Selection and Due Date - 50/50 split */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                      {samplePatterns.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name}{' '}
                                          <Badge variant="outline" className="ml-2 text-[10px]">
                                            {p.difficulty}
                                          </Badge>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-sm text-muted-foreground mb-1 block">Due Date</Label>
                                  <Popover key={`popover-${disciplineIndex}-${groupIndex}`}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          'w-full justify-start text-left font-normal',
                                          !formData.disciplineDueDates?.[disciplineIndex] && 'text-muted-foreground'
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.disciplineDueDates?.[disciplineIndex] ? (
                                          format(parseLocalDate(formData.disciplineDueDates[disciplineIndex]), 'PPP')
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        key={`calendar-${disciplineIndex}-${groupIndex}`}
                                        mode="single"
                                        selected={
                                          formData.disciplineDueDates?.[disciplineIndex]
                                            ? parseLocalDate(formData.disciplineDueDates[disciplineIndex])
                                            : undefined
                                        }
                                        onSelect={(date) => {
                                          if (date) {
                                            const localDate = format(date, 'yyyy-MM-dd');
                                            handleDisciplineDueDateChange(disciplineIndex, localDate);
                                          }
                                        }}
                                        initialFocus
                                        className={cn('p-3 pointer-events-auto')}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>

                              {/* Judge / Staff selectors - swapped order */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">
                                    Assign Judge
                                  </Label>
                                  <Select
                                    value={
                                      formData.groupJudges?.[disciplineIndex]?.[groupIndex] || ''
                                    }
                                    onValueChange={value =>
                                      handleJudgeSelection(disciplineIndex, groupIndex, value)
                                    }
                                  >
                                    <SelectTrigger className="bg-background mt-1">
                                      <SelectValue placeholder="Select judge..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background z-50">
                                      {disciplineJudges.length > 0 ? (
                                        disciplineJudges.map((judge, idx) => (
                                          <SelectItem
                                            key={idx}
                                            value={judge.id || `judge-${idx}`}
                                          >
                                            {judge.name || 'Unnamed Judge'}
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <SelectItem value="no-judges" disabled>No judges for this association</SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">
                                    Assign Staff
                                  </Label>
                                  <Select
                                    value={
                                      formData.groupStaff?.[disciplineIndex]?.[groupIndex] || ''
                                    }
                                    onValueChange={value =>
                                      handleStaffSelection(disciplineIndex, groupIndex, value)
                                    }
                                  >
                                    <SelectTrigger className="bg-background mt-1">
                                      <SelectValue placeholder="Select staff..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background z-50">
                                      {showStaff.map((staff, idx) => (
                                        <SelectItem
                                          key={idx}
                                          value={staff.id || `staff-${idx}`}
                                        >
                                          {staff.role}: {staff.name || 'Unnamed'}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
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

        {/* Uploads Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Upload Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="showSchedule" className="text-sm font-semibold mb-2 block">
                Show Schedule
              </Label>
              <p className="text-xs text-muted-foreground mb-3">Upload the show schedule document.</p>
              <Input 
                id="showSchedule" 
                name="showSchedule" 
                type="file" 
                accept=".pdf,.doc,.docx" 
                className="cursor-pointer"
              />
            </div>

            <div>
              <Label htmlFor="showBill" className="text-sm font-semibold mb-2 block">
                Show Bill
              </Label>
              <p className="text-xs text-muted-foreground mb-3">Upload the show bill document.</p>
              <Input 
                id="showBill" 
                name="showBill" 
                type="file" 
                accept=".pdf,.doc,.docx" 
                className="cursor-pointer"
              />
            </div>
          </div>
        </section>

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

              <div>
                <Label htmlFor="dialog-staff" className="text-sm mb-2 block">Assign Staff</Label>
                <Select value={dialogStaff} onValueChange={setDialogStaff}>
                  <SelectTrigger id="dialog-staff" className="bg-background">
                    <SelectValue placeholder="Select staff..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {showStaff.map((staff, idx) => (
                      <SelectItem key={idx} value={staff.id || `staff-${idx}`}>
                        {staff.role}: {staff.name || 'Unnamed'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(dialogJudge?.trim() || dialogStaff?.trim()) && (
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
      </CardContent>
    </motion.div>
  );
};
