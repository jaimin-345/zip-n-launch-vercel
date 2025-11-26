import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { AlertCircle, CalendarIcon, ChevronDown, ChevronRight, MapPin, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const samplePatterns = [
  { id: 'pattern-1', name: 'Simple Sequence', difficulty: 'Easy' },
  { id: 'pattern-2', name: 'Complex Branching', difficulty: 'Medium' },
  { id: 'pattern-3', name: 'Nested Loops', difficulty: 'Hard' },
  { id: 'pattern-4', name: 'Advanced Recursion', difficulty: 'Expert' },
];

export const Step6_PatternAndLayout = ({ formData, setFormData, associationsData }) => {
  const [openDisciplineId, setOpenDisciplineId] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [currentDiscipline, setCurrentDiscipline] = useState(null);
  const [currentDisciplineIndex, setCurrentDisciplineIndex] = useState(null);
  const [dialogJudge, setDialogJudge] = useState('');
  const [dialogStaff, setDialogStaff] = useState('');
  const [dialogDueDate, setDialogDueDate] = useState('');

  const patternDisciplines = useMemo(() => {
    return (formData.disciplines || []).filter(d => d.pattern);
  }, [formData.disciplines]);

  const disciplinePatternSelections = useMemo(() => {
    const selections = [];
    (formData.disciplines || []).forEach((_, idx) => {
      selections[idx] = formData.patternSelections?.[idx]?.[0] || '';
    });
    return selections;
  }, [formData.disciplines, formData.patternSelections]);

  const handlePatternSelection = (disciplineIndex, groupIndex, patternId) => {
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      newSelections[disciplineIndex][groupIndex] = patternId;
      return { ...prev, patternSelections: newSelections };
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

  const handleStaffSelection = (disciplineIndex, groupIndex, staffId) => {
    setFormData(prev => {
      const newStaff = { ...(prev.groupStaff || {}) };
      if (!newStaff[disciplineIndex]) newStaff[disciplineIndex] = {};
      newStaff[disciplineIndex][groupIndex] = staffId;
      return { ...prev, groupStaff: newStaff };
    });
  };

  const handleDisciplineDueDateChange = (disciplineIndex, date) => {
    setFormData(prev => {
      const newDueDateSelections = [...(prev.dueDateSelections || [])];
      newDueDateSelections[disciplineIndex] = date;
      return { ...prev, dueDateSelections: newDueDateSelections };
    });
  };

  const handleDisciplinePatternChange = (disciplineIndex, patternId) => {
    setFormData(prev => {
      const newPatternSelections = { ...(prev.patternSelections || {}) };
      if (!newPatternSelections[disciplineIndex]) newPatternSelections[disciplineIndex] = {};
      newPatternSelections[disciplineIndex][0] = patternId;
      return { ...prev, patternSelections: newPatternSelections };
    });
  };

  const handleOpenAssignDialog = (discipline, disciplineIndex) => {
    setCurrentDiscipline(discipline);
    setCurrentDisciplineIndex(disciplineIndex);

    const existingJudge = formData.judgeSelections?.[disciplineIndex]
      || formData.groupJudges?.[disciplineIndex]?.[0]
      || '';
    const existingStaff = formData.staffSelections?.[disciplineIndex]
      || formData.groupStaff?.[disciplineIndex]?.[0]
      || '';
    const existingDueDate = formData.dueDateSelections?.[disciplineIndex] || '';

    setDialogJudge(existingJudge);
    setDialogStaff(existingStaff);
    setDialogDueDate(existingDueDate);

    setAssignDialogOpen(true);
  };

  const handleSaveAssignDialog = () => {
    if (currentDisciplineIndex === null) return;

    setFormData(prev => {
      const discipline = prev.disciplines[currentDisciplineIndex];
      const groupCount = discipline.patternGroups?.length || 0;

      const newJudges = { ...(prev.groupJudges || {}) };
      const newStaff = { ...(prev.groupStaff || {}) };
      const newDueDates = { ...(prev.groupDueDates || {}) };

      if (!newJudges[currentDisciplineIndex]) newJudges[currentDisciplineIndex] = {};
      if (!newStaff[currentDisciplineIndex]) newStaff[currentDisciplineIndex] = {};
      if (!newDueDates[currentDisciplineIndex]) newDueDates[currentDisciplineIndex] = {};

      for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
        if (dialogJudge) newJudges[currentDisciplineIndex][groupIndex] = dialogJudge;
        if (dialogStaff) newStaff[currentDisciplineIndex][groupIndex] = dialogStaff;
        if (dialogDueDate) {
          const localDate = format(new Date(dialogDueDate), 'yyyy-MM-dd');
          newDueDates[currentDisciplineIndex][groupIndex] = localDate;
        }
      }

      const judgeSelections = [...(prev.judgeSelections || [])];
      const staffSelections = [...(prev.staffSelections || [])];
      const dueDateSelections = [...(prev.dueDateSelections || [])];

      judgeSelections[currentDisciplineIndex] = dialogJudge || '';
      staffSelections[currentDisciplineIndex] = dialogStaff || '';
      dueDateSelections[currentDisciplineIndex] = dialogDueDate || '';

      return {
        ...prev,
        groupJudges: newJudges,
        groupStaff: newStaff,
        groupDueDates: newDueDates,
        judgeSelections,
        staffSelections,
        dueDateSelections
      };
    });

    setAssignDialogOpen(false);
  };

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

  const showStaff = (formData.officials || []).filter(o => !o.role?.toLowerCase().includes('judge'));

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Show Information */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Show Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">Horse Show {formData.showName || 'Unnamed'}</span>
                  </div>
                </div>
                {formData.venueAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{formData.venueAddress}</span>
                  </div>
                )}
                {formData.startDate && formData.endDate && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(formData.startDate), 'MMM d')} - {format(new Date(formData.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Staff Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Staff</h3>
              <div className="flex flex-wrap gap-2">
                {showStaff.length > 0 ? (
                  showStaff.map((staff, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {staff.role} - {staff.name || 'Not assigned'}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">No staff assigned</span>
                )}
              </div>
            </div>

            {/* Associations with Judges Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Associations with Judges</h3>
              <div className="space-y-3">
                {formData.associations?.map((assoc, idx) => (
                  <div key={idx} className="space-y-1">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20">
                      {assoc.name || 'Unknown Association'}
                    </Badge>
                    <div className="ml-2 space-y-1">
                      <span className="text-sm font-medium">Judges</span>
                      <div className="flex flex-wrap gap-1">
                        {judges.length > 0 ? (
                          judges.map((judge, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20">
                              {judge.name || 'Not assigned'}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No judges assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discipline Folder */}
            <div className="space-y-3 col-span-full">
              <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Discipline Folder</h3>
              <div className="flex flex-wrap gap-3">
                {patternDisciplines.map((discipline, logicalIndex) => {
                  const disciplineIndex = (formData.disciplines || []).findIndex(d => d.id === discipline.id);
                  const groups = discipline.patternGroups || [];
                  const assignedCount = groups.filter((group, groupIndex) => {
                    return formData.patternSelections?.[disciplineIndex]?.[groupIndex];
                  }).length;
                  const isComplete = groups.length > 0 && assignedCount === groups.length;

                  return (
                    <div key={discipline.id} className={cn(
                      "flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition-colors min-w-[200px]",
                      isComplete ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
                    )}>
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <div className="w-5 h-5 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center">
                            <ChevronRight className="w-3 h-3 text-white" />
                          </div>
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
        </CardContent>
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
                          {(() => {
                            const judge = judges.find(j => j.id === formData.judgeSelections[disciplineIndex]);
                            return judge ? (judge.name || 'Unnamed Judge') : formData.judgeSelections[disciplineIndex];
                          })()}
                        </Badge>
                      )}
                      {formData.staffSelections?.[disciplineIndex] && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border border-green-500/20 whitespace-nowrap">
                          {(() => {
                            const staff = showStaff.find(s => s.id === formData.staffSelections[disciplineIndex]);
                            return staff ? `${staff.role}: ${staff.name || 'Unnamed'}` : formData.staffSelections[disciplineIndex];
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
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        'w-full justify-start text-left font-normal bg-background',
                                        !formData.groupDueDates?.[disciplineIndex]?.[groupIndex] &&
                                          'text-muted-foreground'
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {formData.groupDueDates?.[disciplineIndex]?.[groupIndex]
                                        ? format(
                                            new Date(
                                              formData.groupDueDates[disciplineIndex][groupIndex]
                                            ),
                                            'MM/dd/yy'
                                          )
                                        : 'Pick a date'}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={
                                        formData.groupDueDates?.[disciplineIndex]?.[groupIndex]
                                          ? new Date(
                                              formData.groupDueDates[disciplineIndex][groupIndex]
                                            )
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

      {/* Assign Dialog */}
      {assignDialogOpen && (
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="bg-background">
            <DialogHeader>
              <DialogTitle>Assign Pattern Selection for {currentDiscipline?.name}</DialogTitle>
            </DialogHeader>
            <Card className="border-none shadow-none">
              <CardContent className="space-y-4 pt-4">
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

                <Label htmlFor="dialog-due-date" className="text-sm mb-2 block">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-background">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dialogDueDate ? format(new Date(dialogDueDate), 'MM/dd/yy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={dialogDueDate ? new Date(dialogDueDate) : undefined}
                      onSelect={(date) => setDialogDueDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {(dialogJudge?.trim() || dialogStaff?.trim()) && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    This will apply the selected judge and/or staff to all groups in this discipline.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAssignDialog}>Save</Button>
                </div>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
