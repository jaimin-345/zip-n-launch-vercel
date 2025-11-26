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
import { cn } from '@/lib/utils';

const samplePatterns = [
  { id: 'pattern-1', name: 'Simple Sequence', difficulty: 'Easy' },
  { id: 'pattern-2', name: 'Complex Branching', difficulty: 'Medium' },
  { id: 'pattern-3', name: 'Nested Loops', difficulty: 'Hard' },
  { id: 'pattern-4', name: 'Advanced Recursion', difficulty: 'Expert' },
];

const judges = [
  { id: 'judge-1', name: 'Alice Johnson' },
  { id: 'judge-2', name: 'Bob Williams' },
  { id: 'judge-3', name: 'Charlie Brown' },
];

const showStaff = [
  { id: 'staff-1', role: 'Director', name: 'David Miller' },
  { id: 'staff-2', role: 'Coordinator', name: 'Eve Davis' },
  { id: 'staff-3', role: 'Technician', name: 'Frank White' },
];

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

const Step6_PatternAndLayout = ({ formData, setFormData, associationsData }) => {
  const [openDisciplineId, setOpenDisciplineId] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [currentDisciplineIndex, setCurrentDisciplineIndex] = useState(null);
  const [currentDiscipline, setCurrentDiscipline] = useState(null);

  const patternDisciplines = useMemo(() => {
    return formData.disciplines || [];
  }, [formData.disciplines]);

  const disciplinePatternSelections = useMemo(() => {
    return formData.patternSelections || [];
  }, [formData.patternSelections]);

  const handleDisciplinePatternChange = (disciplineIndex, patternId) => {
    setFormData(prev => {
      const newPatternSelections = [...(prev.patternSelections || [])];
      newPatternSelections[disciplineIndex] = patternId;
      return { ...prev, patternSelections: newPatternSelections };
    });
  };

  const handleOpenAssignDialog = (discipline, disciplineIndex) => {
    setCurrentDiscipline(discipline);
    setCurrentDisciplineIndex(disciplineIndex);
    setAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setCurrentDiscipline(null);
    setCurrentDisciplineIndex(null);
  };

  const handleDueDateChange = (date) => {
    setFormData(prev => {
      const newDueDateSelections = [...(prev.dueDateSelections || [])];
      newDueDateSelections[currentDisciplineIndex] = date;
      return { ...prev, dueDateSelections: newDueDateSelections };
    });
  };

  const handleJudgeChange = (judgeId) => {
    setFormData(prev => {
      const newJudgeSelections = [...(prev.judgeSelections || [])];
      newJudgeSelections[currentDisciplineIndex] = judgeId;
      return { ...prev, judgeSelections: newJudgeSelections };
    });
  };

  const handleStaffChange = (staffId) => {
    setFormData(prev => {
      const newStaffSelections = [...(prev.staffSelections || [])];
      newStaffSelections[currentDisciplineIndex] = staffId;
      return { ...prev, staffSelections: newStaffSelections };
    });
  };

  const OverviewLayout = () => (
    <Card>
      <CardContent className='space-y-4'>
        <h4 className='text-sm font-semibold'>Overview</h4>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <Label>Disciplines</Label>
            <p>{patternDisciplines.length}</p>
          </div>
          <div>
            <Label>Patterns Assigned</Label>
            <p>{disciplinePatternSelections.filter(Boolean).length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <p>Step 6 - Pattern and Layout</p>
        </CardContent>
      </Card>

      <OverviewLayout />

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
                      {groups.map((group, groupIndex) => (
                        <div key={group.id} className="border rounded-md p-3 space-y-2">
                          <h5 className="font-medium">Group: {group.name}</h5>
                          <Select
                            value={formData.groupPatternSelections?.[disciplineIndex]?.[groupIndex] || ''}
                            onValueChange={(value) => {
                              setFormData(prev => {
                                const newGroupPatternSelections = [...(prev.groupPatternSelections || [])];
                                if (!newGroupPatternSelections[disciplineIndex]) {
                                  newGroupPatternSelections[disciplineIndex] = [];
                                }
                                newGroupPatternSelections[disciplineIndex][groupIndex] = value;
                                return { ...prev, groupPatternSelections: newGroupPatternSelections };
                              });
                            }}
                          >
                            <SelectTrigger className="w-[280px] bg-background">
                              <SelectValue placeholder="Select Pattern for Group..." />
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
                      ))}

                      <div className="flex items-center space-x-4">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-[280px] justify-start text-left font-normal',
                                !formData.dueDateSelections?.[disciplineIndex] && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.dueDateSelections?.[disciplineIndex] ? (
                                format(new Date(formData.dueDateSelections[disciplineIndex]), 'MM/dd/yyyy')
                              ) : (
                                <span>Pick a due date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.dueDateSelections?.[disciplineIndex] ? new Date(formData.dueDateSelections[disciplineIndex]) : undefined}
                              onSelect={(date) => {
                                setFormData(prev => {
                                  const newDueDateSelections = [...(prev.dueDateSelections || [])];
                                  newDueDateSelections[disciplineIndex] = date;
                                  return { ...prev, dueDateSelections: newDueDateSelections };
                                });
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        <Select
                          value={formData.judgeSelections?.[disciplineIndex] || ''}
                          onValueChange={(value) => {
                            setFormData(prev => {
                              const newJudgeSelections = [...(prev.judgeSelections || [])];
                              newJudgeSelections[disciplineIndex] = value;
                              return { ...prev, judgeSelections: newJudgeSelections };
                            });
                          }}
                        >
                          <SelectTrigger className="w-[280px] bg-background">
                            <SelectValue placeholder="Select Judge..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {judges.map(judge => (
                              <SelectItem key={judge.id} value={judge.id}>
                                {judge.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={formData.staffSelections?.[disciplineIndex] || ''}
                          onValueChange={(value) => {
                            setFormData(prev => {
                              const newStaffSelections = [...(prev.staffSelections || [])];
                              newStaffSelections[disciplineIndex] = value;
                              return { ...prev, staffSelections: newStaffSelections };
                            });
                          }}
                        >
                          <SelectTrigger className="w-[280px] bg-background">
                            <SelectValue placeholder="Select Staff..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {showStaff.map(staff => (
                              <SelectItem key={staff.id} value={staff.id}>
                                {staff.role}: {staff.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Assign Pattern Selection Dialog */}
      {assignDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center">
          <Card className="max-w-md w-full">
            <CardContent className="space-y-4">
              <h4 className="text-lg font-semibold">Assign Pattern Selection</h4>
              <p>Discipline: {currentDiscipline?.name}</p>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-[280px] justify-start text-left font-normal',
                      !formData.dueDateSelections?.[currentDisciplineIndex] && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDateSelections?.[currentDisciplineIndex] ? (
                      format(new Date(formData.dueDateSelections[currentDisciplineIndex]), 'MM/dd/yyyy')
                    ) : (
                      <span>Pick a due date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDateSelections?.[currentDisciplineIndex] ? new Date(formData.dueDateSelections[currentDisciplineIndex]) : undefined}
                    onSelect={handleDueDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select
                value={formData.judgeSelections?.[currentDisciplineIndex] || ''}
                onValueChange={handleJudgeChange}
              >
                <SelectTrigger className="w-[280px] bg-background">
                  <SelectValue placeholder="Select Judge..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {judges.map(judge => (
                    <SelectItem key={judge.id} value={judge.id}>
                      {judge.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={formData.staffSelections?.[currentDisciplineIndex] || ''}
                onValueChange={handleStaffChange}
              >
                <SelectTrigger className="w-[280px] bg-background">
                  <SelectValue placeholder="Select Staff..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {showStaff.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.role}: {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex justify-end space-x-2">
                <Button variant="secondary" onClick={handleCloseAssignDialog}>
                  Cancel
                </Button>
                <Button onClick={handleCloseAssignDialog}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Step6_PatternAndLayout;
