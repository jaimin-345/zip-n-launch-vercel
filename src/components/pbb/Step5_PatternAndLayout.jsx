import React from 'react';
    import { motion } from 'framer-motion';
    import { format } from 'date-fns';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar, Users, UserCheck, Trash2 } from 'lucide-react';
import { cn, parseLocalDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

    const samplePatterns = [
      { id: 'pat_1', name: 'Classic Horsemanship #101', difficulty: 'Intermediate' },
      { id: 'pat_2', name: 'Advanced Trail Challenge #203', difficulty: 'Advanced' },
      { id: 'pat_3', name: 'Beginner Reining Loop', difficulty: 'Beginner' },
      { id: 'pat_4', name: 'Smooth Equitation Flow', difficulty: 'Intermediate' },
    ];

    export const Step5_PatternAndLayout = ({ formData, setFormData }) => {
  const { toast } = useToast();
  const [calendarOpen, setCalendarOpen] = React.useState({});

  const handlePatternSelection = (disciplineIndex, groupIndex, patternId) => {
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
      newSelections[disciplineIndex][groupIndex] = patternId;
      return { ...prev, patternSelections: newSelections };
    });
  };

  const handleDueDateChange = (disciplineIndex, groupIndex, date) => {
    setFormData(prev => {
      const newDueDates = { ...(prev.groupDueDates || {}) };
      if (!newDueDates[disciplineIndex]) newDueDates[disciplineIndex] = {};
      newDueDates[disciplineIndex][groupIndex] = date;
      return { ...prev, groupDueDates: newDueDates };
    });
    // Close the specific calendar after selection
    const key = `${disciplineIndex}-${groupIndex}`;
    setCalendarOpen(prev => ({ ...prev, [key]: false }));
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

  const handleDeletePatternGroup = (disciplineIndex, groupIndex) => {
    setFormData(prev => {
      const newDisciplines = [...(prev.disciplines || [])];
      const discipline = newDisciplines[disciplineIndex];
      
      if (discipline && discipline.patternGroups) {
        const deletedGroup = discipline.patternGroups[groupIndex];
        const updatedPatternGroups = discipline.patternGroups.filter((_, idx) => idx !== groupIndex);
        newDisciplines[disciplineIndex] = {
          ...discipline,
          patternGroups: updatedPatternGroups
        };
        
        // Also clear related data for this group
        const newPatternSelections = { ...(prev.patternSelections || {}) };
        const newGroupDueDates = { ...(prev.groupDueDates || {}) };
        const newGroupStaff = { ...(prev.groupStaff || {}) };
        const newGroupJudges = { ...(prev.groupJudges || {}) };
        
        if (newPatternSelections[disciplineIndex]) {
          delete newPatternSelections[disciplineIndex][groupIndex];
        }
        if (newGroupDueDates[disciplineIndex]) {
          delete newGroupDueDates[disciplineIndex][groupIndex];
        }
        if (newGroupStaff[disciplineIndex]) {
          delete newGroupStaff[disciplineIndex][groupIndex];
        }
        if (newGroupJudges[disciplineIndex]) {
          delete newGroupJudges[disciplineIndex][groupIndex];
        }
        
        toast({
          title: "Pattern group deleted",
          description: "The pattern group has been removed from all steps."
        });
        
        return { 
          ...prev, 
          disciplines: newDisciplines,
          patternSelections: newPatternSelections,
          groupDueDates: newGroupDueDates,
          groupStaff: newGroupStaff,
          groupJudges: newGroupJudges
        };
      }
      
      return prev;
    });
  };
      
      const patternDisciplines = (formData.disciplines || []).filter(d => d.pattern);

      // Format date range
      const dateRange = formData.startDate && formData.endDate 
        ? `${format(parseLocalDate(formData.startDate), 'MMM d')} - ${format(parseLocalDate(formData.endDate), 'MMM d, yyyy')}`
        : 'Dates not set';


      // Extract judges from associationJudges structure with their associations
      const judgesWithAssociations = [];
      if (formData.associationJudges) {
        Object.keys(formData.associationJudges).forEach(assocId => {
          const assocJudges = formData.associationJudges[assocId]?.judges || [];
          assocJudges.forEach(judge => {
            if (judge.name) {
              // Find association name
              const association = (formData.associations || []).find(a => a.id === assocId);
              const assocName = association?.name || assocId;
              
              // Check if judge already exists
              const existingJudge = judgesWithAssociations.find(j => j.name === judge.name);
              if (existingJudge) {
                // Add association to existing judge
                existingJudge.associations.push(assocName);
              } else {
                // Add new judge with association
                judgesWithAssociations.push({
                  name: judge.name,
                  associations: [assocName]
                });
              }
            }
          });
        });
      }
      
      // Get show staff from officials
      const showStaff = formData.officials || [];

      return (
        <motion.div key="step6" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
          <CardHeader>
            <CardTitle>Step 6: Select Patterns & Layout</CardTitle>
            <CardDescription>Assign a pattern to each group and choose the final look for your book.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* Show Details Summary */}
            <Card className="p-4 bg-muted/50">
              <h3 className="text-lg font-semibold mb-3">Show Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Show Dates</p>
                    <p className="text-muted-foreground">{dateRange}</p>
                  </div>
                </div>

                {formData.venueName && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">Venue Name</p>
                      <p className="text-muted-foreground">{formData.venueName}</p>
                    </div>
                  </div>
                )}

                {showStaff.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="w-full">
                      <p className="font-semibold">Show Staff</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {showStaff.map((staff, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {staff.role}: {staff.name || 'Not assigned'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {judgesWithAssociations.length > 0 && (
                  <div className="flex items-start gap-2">
                    <UserCheck className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="w-full">
                      <p className="font-semibold">Judges</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {judgesWithAssociations.map((judge, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {judge.name} - {judge.associations.join(', ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {patternDisciplines.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Pattern Selection</h3>
                <div className="space-y-6">
                  {patternDisciplines.map((pbbDiscipline) => {
                    const originalDisciplineIndex = (formData.disciplines || []).findIndex(d => d.id === pbbDiscipline.id);
                    
                    // Filter judges by this discipline's association
                    const disciplineJudges = [];
                    if (pbbDiscipline.association_id && formData.associationJudges) {
                      const assocJudges = formData.associationJudges[pbbDiscipline.association_id]?.judges || [];
                      assocJudges.forEach(judge => {
                        if (judge.name) {
                          disciplineJudges.push(judge);
                        }
                      });
                    }
                    
                    return (
                    <div key={originalDisciplineIndex} className="p-4 border rounded-lg bg-background/50">
                      <h4 className="font-bold text-md mb-3">{pbbDiscipline.name}</h4>
                      <div className="space-y-6">
                        {(pbbDiscipline.patternGroups || []).map((group, groupIndex) => (
                          <div key={group.id} className="p-4 border rounded-lg bg-muted/30 space-y-4">
                            <div className="mb-3 flex items-start justify-between">
                              <div className="flex-1">
                                <Label className="font-semibold">{group.name}</Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(group.divisions || []).map(div => (
                                    <Badge key={`${div.assocId}-${div.division}`} variant="secondary" className="text-xs">{div.division}</Badge>
                                  ))}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePatternGroup(originalDisciplineIndex, groupIndex)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`due-date-${originalDisciplineIndex}-${groupIndex}`} className="text-sm">Due Date</Label>
                                <Popover 
                                  key={`popover-${originalDisciplineIndex}-${groupIndex}`}
                                  open={calendarOpen[`${originalDisciplineIndex}-${groupIndex}`] || false}
                                  onOpenChange={(open) => setCalendarOpen(prev => ({ ...prev, [`${originalDisciplineIndex}-${groupIndex}`]: open }))}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full justify-start text-left font-normal mt-1",
                                        !formData.groupDueDates?.[originalDisciplineIndex]?.[groupIndex] && "text-muted-foreground"
                                      )}
                                    >
                                      <Calendar className="mr-2 h-4 w-4" />
                                      {formData.groupDueDates?.[originalDisciplineIndex]?.[groupIndex] 
                                        ? format(new Date(formData.groupDueDates[originalDisciplineIndex][groupIndex]), "PPP") 
                                        : <span>Pick a date</span>
                                      }
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                      key={`calendar-${originalDisciplineIndex}-${groupIndex}`}
                                      mode="single"
                                      selected={formData.groupDueDates?.[originalDisciplineIndex]?.[groupIndex] ? new Date(formData.groupDueDates[originalDisciplineIndex][groupIndex]) : undefined}
                                      onSelect={(date) => handleDueDateChange(originalDisciplineIndex, groupIndex, date ? format(date, 'yyyy-MM-dd') : '')}
                                      initialFocus
                                      className="pointer-events-auto"
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              
                              <div>
                                <Label className="text-sm text-muted-foreground">Select Pattern</Label>
                                <Select 
                                  value={formData.patternSelections?.[originalDisciplineIndex]?.[groupIndex] || ''}
                                  onValueChange={(value) => handlePatternSelection(originalDisciplineIndex, groupIndex, value)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select a pattern..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {samplePatterns.map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.name} <Badge variant="outline" className="ml-2">{p.difficulty}</Badge></SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              <div>
                                <Label htmlFor={`staff-${originalDisciplineIndex}-${groupIndex}`} className="text-sm">Assign Staff</Label>
                                <Select 
                                  value={formData.groupStaff?.[originalDisciplineIndex]?.[groupIndex] || ''}
                                  onValueChange={(value) => handleStaffSelection(originalDisciplineIndex, groupIndex, value)}
                                >
                                  <SelectTrigger id={`staff-${originalDisciplineIndex}-${groupIndex}`} className="mt-1">
                                    <SelectValue placeholder="Select staff..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {showStaff.map((staff, idx) => (
                                      <SelectItem key={idx} value={staff.name || idx.toString()}>
                                        {staff.role}: {staff.name || 'Unnamed'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label htmlFor={`judge-${originalDisciplineIndex}-${groupIndex}`} className="text-sm">Assign Judge</Label>
                                <Select 
                                  value={formData.groupJudges?.[originalDisciplineIndex]?.[groupIndex] || ''}
                                  onValueChange={(value) => handleJudgeSelection(originalDisciplineIndex, groupIndex, value)}
                                >
                                  <SelectTrigger id={`judge-${originalDisciplineIndex}-${groupIndex}`} className="mt-1">
                                    <SelectValue placeholder="Select judge..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {disciplineJudges.length > 0 ? (
                                      disciplineJudges.map((judge, idx) => (
                                        <SelectItem key={idx} value={judge.name || idx.toString()}>
                                          {judge.name || 'Unnamed Judge'}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="no-judges" disabled>No judges for this association</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No disciplines require pattern selections.</p>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-4">Layout & Design</h3>
              <RadioGroup value={formData.layoutSelection} onValueChange={handleLayoutSelection} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="layout-a" id="layout-a" className="peer sr-only" />
                  <Label htmlFor="layout-a" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <div className="w-full h-24 bg-secondary rounded-md flex items-center justify-center text-muted-foreground text-sm pattern-grid">Layout A: Modern</div>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="layout-b" id="layout-b" className="peer sr-only" />
                  <Label htmlFor="layout-b" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <div className="w-full h-24 bg-secondary rounded-md flex items-center justify-center text-muted-foreground text-sm pattern-grid-alt">Layout B: Classic</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </motion.div>
      );
    };