import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Users, UserCheck, ChevronDown } from 'lucide-react';
import { cn, parseLocalDate } from '@/lib/utils';

const samplePatterns = [
  { id: 'pat_1', name: 'Classic Horsemanship #101', difficulty: 'Intermediate' },
  { id: 'pat_2', name: 'Advanced Trail Challenge #203', difficulty: 'Advanced' },
  { id: 'pat_3', name: 'Beginner Reining Loop', difficulty: 'Beginner' },
  { id: 'pat_4', name: 'Smooth Equitation Flow', difficulty: 'Intermediate' },
];

export const Step6_PatternAndLayout = ({ formData, setFormData }) => {
  const [openDisciplineId, setOpenDisciplineId] = useState(null);

  const patternDisciplines = (formData.disciplines || []).filter(d => d.pattern);

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
        <CardTitle>Step 5: Select Patterns & Layout</CardTitle>
        <CardDescription>
          Assign a pattern to each group and choose the final look for your book.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Show Name Header */}
        <div className="text-center py-4 border-b">
          <h2 className="text-2xl font-bold">{formData.showName || 'Horse Show Name'}</h2>
          <p className="text-sm text-muted-foreground mt-1">{dateRange}</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN - Pattern selection accordion-style list */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Pattern Selection</h3>
            {patternDisciplines.length > 0 ? (
              <div className="space-y-2">
              {patternDisciplines.map((discipline, logicalIndex) => {
                const disciplineIndex = (formData.disciplines || []).findIndex(d => d.id === discipline.id);
                const isOpen = openDisciplineId === discipline.id;
                const groups = discipline.patternGroups || [];

                return (
                  <div key={discipline.id} className="bg-card rounded-lg border">
                    {/* Toggle row, similar to Step 3 */}
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/60 transition-colors"
                      onClick={() =>
                        setOpenDisciplineId(prev => (prev === discipline.id ? null : discipline.id))
                      }
                    >
                      <div className="flex-1 text-left">
                        <span className="font-semibold text-base">{discipline.name}</span>
                        {groups.length > 0 && (
                          <Badge variant="secondary" className="ml-3">
                            {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          Due:{' '}
                          {formData.disciplineDueDates?.[disciplineIndex]
                            ? format(parseLocalDate(formData.disciplineDueDates[disciplineIndex]), 'MMM d, yyyy')
                            : 'Not set'}
                        </span>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform text-muted-foreground',
                            isOpen ? 'rotate-180' : 'rotate-0'
                          )}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t space-y-4">
                        {/* Discipline-level due date with Popover */}
                        <div className="bg-muted/30 p-3 rounded-md">
                          <Label className="text-xs font-semibold mb-2 block">Due Date</Label>
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
                                {formData.disciplineDueDates?.[disciplineIndex]
                                  ? format(parseLocalDate(formData.disciplineDueDates[disciplineIndex]), 'PPP')
                                  : 'Pick a date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                              <Calendar
                                mode="single"
                                selected={
                                  formData.disciplineDueDates?.[disciplineIndex]
                                    ? parseLocalDate(formData.disciplineDueDates[disciplineIndex])
                                    : undefined
                                }
                                onSelect={date =>
                                  handleDisciplineDueDateChange(
                                    disciplineIndex,
                                    date ? format(date, 'yyyy-MM-dd') : ''
                                  )
                                }
                                initialFocus
                                className={cn('p-3 pointer-events-auto')}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Pattern groups */}
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
            ) : (
              <p className="text-sm text-muted-foreground">No pattern disciplines available.</p>
            )}
          </div>

          {/* RIGHT COLUMN - Layout & design */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Layout & Design</h3>
            <RadioGroup
              value={formData.layoutSelection || 'layout-a'}
              onValueChange={handleLayoutSelection}
              className="grid grid-cols-1 gap-4"
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
          </div>
        </div>
      </CardContent>
    </motion.div>
  );
};
