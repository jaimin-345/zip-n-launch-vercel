import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

  const handleLayoutSelection = (layoutId) => {
    setFormData(prev => ({ ...prev, layoutSelection: layoutId }));
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
    setCurrentDiscipline({ ...discipline, disciplineIndex });
    setDialogDueDate(formData.disciplineDueDates?.[disciplineIndex] || '');
    
    // Get current judge/staff from first group if exists
    const firstGroupJudge = formData.groupJudges?.[disciplineIndex]?.[0] || '';
    const firstGroupStaff = formData.groupStaff?.[disciplineIndex]?.[0] || '';
    
    setDialogJudge(firstGroupJudge);
    setDialogStaff(firstGroupStaff);
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

      // Initialize discipline entries
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      if (!newJudges[disciplineIndex]) newJudges[disciplineIndex] = {};
      if (!newStaff[disciplineIndex]) newStaff[disciplineIndex] = {};

      // Apply to all groups in this discipline
      groups.forEach((_, groupIndex) => {
        if (selectedPattern) newSelections[disciplineIndex][groupIndex] = selectedPattern;
        if (dialogJudge) newJudges[disciplineIndex][groupIndex] = dialogJudge;
        if (dialogStaff) newStaff[disciplineIndex][groupIndex] = dialogStaff;
      });

      // Set due date at discipline level
      if (dialogDueDate) {
        newDueDates[disciplineIndex] = dialogDueDate;
      }

      return {
        ...prev,
        patternSelections: newSelections,
        groupJudges: newJudges,
        groupStaff: newStaff,
        disciplineDueDates: newDueDates,
      };
    });

    setAssignDialogOpen(false);
  };

  const dateRange = formData.startDate && formData.endDate
    ? `${format(parseLocalDate(formData.startDate), 'MMM d')} - ${format(parseLocalDate(formData.endDate), 'MMM d, yyyy')}`
    : 'Dates not set';

  // Judges & staff sources (see project memory)
  const judges = [];
  if (formData.associationJudges) {
    Object.keys(formData.associationJudges).forEach(assocId => {
      const assocJudges = formData.associationJudges[assocId]?.judges || [];
      assocJudges.forEach(judge => {
        if (judge?.name) judges.push(judge);
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
          Step 5: Select Patterns & Layout
        </CardTitle>
        <CardDescription>
          Assign patterns to classes and choose your book layout.
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

              {/* Associations with Judges Section */}
              <div className="border rounded-lg p-3">
                <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Associations with Judges</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium">Associations</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedAssociations.length > 0 ? (
                        selectedAssociations.map((assoc) => (
                          <Badge key={assoc.id} className="bg-green-100 text-green-700 hover:bg-green-200">
                            {assoc.abbreviation || assoc.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">None selected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Judges</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {judges.length > 0 ? (
                        judges.map((judge, idx) => (
                          <Badge key={idx} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                            {judge.name || 'Not assigned'}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No judges assigned</span>
                      )}
                    </div>
                  </div>
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
                      
                      <div className="flex-1 flex items-center gap-3">
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
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Assign Pattern Selection
                        </Button>
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
                                  <Popover>
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
                                      {judges.map((judge, idx) => (
                                        <SelectItem
                                          key={idx}
                                          value={judge.id || `judge-${idx}`}
                                        >
                                          {judge.name || 'Unnamed Judge'}
                                        </SelectItem>
                                      ))}
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
                    {judges.map((judge, idx) => (
                      <SelectItem key={idx} value={judge.id || `judge-${idx}`}>
                        {judge.name || 'Unnamed Judge'}
                      </SelectItem>
                    ))}
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

              {(dialogJudge || dialogStaff) && (
                <div>
                  <Label htmlFor="dialog-due-date" className="text-sm mb-2 block">Due Date</Label>
                  <Input
                    id="dialog-due-date"
                    type="date"
                    value={dialogDueDate}
                    onChange={(e) => setDialogDueDate(e.target.value)}
                    className="w-full"
                  />
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

        {/* Layout & design (keep existing options) */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Layout & Design</h3>
          <RadioGroup
            value={formData.layoutSelection || 'layout-a'}
            onValueChange={handleLayoutSelection}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="layout-a" id="layout-a" className="peer sr-only" />
              <Label
                htmlFor="layout-a"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <div className="w-full space-y-2">
                  <p className="font-semibold text-center mb-2">Layout A: Modern</p>
                  <div className="w-full min-h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-md flex flex-col items-center justify-center text-xs p-6 border border-border space-y-4">
                    <div className="text-center space-y-2 border-b pb-4 w-full">
                      <p className="font-bold text-2xl">{formData.showName || 'Show Name'}</p>
                      <p className="text-muted-foreground font-semibold">Pattern Book</p>
                      <p className="text-xs text-muted-foreground">{dateRange}</p>
                      {formData.coverPageFile && (
                        <Badge variant="outline" className="text-xs mt-2">
                          Custom Cover Uploaded
                        </Badge>
                      )}
                    </div>
                    <div className="w-full space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Patterns:</p>
                      {patternDisciplines.slice(0, 3).map((disc, idx) => (
                        <div key={disc.id} className="text-xs flex justify-between">
                          <span>{disc.name}</span>
                          <span className="text-muted-foreground">Page {idx + 2}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Includes cover page with show details
                  </p>
                </div>
              </Label>
            </div>

            <div>
              <RadioGroupItem value="layout-b" id="layout-b" className="peer sr-only" />
              <Label
                htmlFor="layout-b"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <div className="w-full space-y-2">
                  <p className="font-semibold text-center mb-2">Layout B: Classic</p>
                  <div className="w-full min-h-48 border-4 border-double border-border rounded-md flex flex-col p-6 bg-background space-y-4">
                    <div className="text-center border-b-2 border-double pb-3">
                      <p className="font-bold text-xl font-serif tracking-wide">
                        {formData.showName || 'Show Name'}
                      </p>
                      <p className="text-muted-foreground italic text-sm mt-1">Pattern Book</p>
                      <p className="text-xs text-muted-foreground mt-1">{dateRange}</p>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <p className="font-bold text-sm font-serif text-center mb-2 border-b pb-1">
                        Table of Contents
                      </p>
                      <div className="flex justify-between px-2">
                        <span className="font-semibold">Show Information</span>
                        <span>1</span>
                      </div>
                      {patternDisciplines.slice(0, 4).map((disc, idx) => (
                        <div
                          key={disc.id}
                          className="flex justify-between px-2 border-b border-dotted"
                        >
                          <span>{disc.name}</span>
                          <span>{idx + 2}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Includes table of contents
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </section>
      </CardContent>
    </motion.div>
  );
};
