import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Users, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

const samplePatterns = [
  { id: 'pat_1', name: 'Classic Horsemanship #101', difficulty: 'Intermediate' },
  { id: 'pat_2', name: 'Advanced Trail Challenge #203', difficulty: 'Advanced' },
  { id: 'pat_3', name: 'Beginner Reining Loop', difficulty: 'Beginner' },
  { id: 'pat_4', name: 'Smooth Equitation Flow', difficulty: 'Intermediate' },
];

export const Step6_PatternAndLayout = ({ formData, setFormData }) => {
  const handlePatternSelection = (classIndex, groupIndex, patternId) => {
    setFormData(prev => {
      const newSelections = { ...prev.patternSelections };
      if (!newSelections[classIndex]) newSelections[classIndex] = {};
      newSelections[classIndex][groupIndex] = patternId;
      return { ...prev, patternSelections: newSelections };
    });
  };

  const handleDisciplineChange = (classIndex, disciplineId) => {
    setFormData(prev => {
      const newDisciplineSelections = { ...prev.disciplineSelections };
      newDisciplineSelections[classIndex] = disciplineId;
      return { ...prev, disciplineSelections: newDisciplineSelections };
    });
  };

  const handleDisciplineDueDateChange = (classIndex, date) => {
    setFormData(prev => {
      const newDisciplineDueDates = { ...prev.disciplineDueDates };
      newDisciplineDueDates[classIndex] = date;
      return { ...prev, disciplineDueDates: newDisciplineDueDates };
    });
  };

  const handleStaffSelection = (classIndex, groupIndex, staffId) => {
    setFormData(prev => {
      const newStaffSelections = { ...prev.groupStaff };
      if (!newStaffSelections[classIndex]) newStaffSelections[classIndex] = {};
      newStaffSelections[classIndex][groupIndex] = staffId;
      return { ...prev, groupStaff: newStaffSelections };
    });
  };

  const handleJudgeSelection = (classIndex, groupIndex, judgeId) => {
    setFormData(prev => {
      const newJudgeSelections = { ...prev.groupJudges };
      if (!newJudgeSelections[classIndex]) newJudgeSelections[classIndex] = {};
      newJudgeSelections[classIndex][groupIndex] = judgeId;
      return { ...prev, groupJudges: newJudgeSelections };
    });
  };

  // Count total patterns selected
  const getTotalPatterns = () => {
    let total = 0;
    formData.classes?.forEach((pbbClass, classIndex) => {
      pbbClass.patternGroups?.forEach((group, groupIndex) => {
        if (formData.patternSelections?.[classIndex]?.[groupIndex]) {
          total++;
        }
      });
    });
    return total;
  };

  const handleLayoutSelection = (layoutId) => {
    setFormData(prev => ({ ...prev, layoutSelection: layoutId }));
  };

  // Format date range
  const dateRange = formData.startDate && formData.endDate 
    ? `${format(new Date(formData.startDate), 'MMM d')} - ${format(new Date(formData.endDate), 'MMM d, yyyy')}`
    : 'Dates not set';

  // Get judges and staff info - separate them properly
  const allStaff = formData.staff || [];
  const judges = allStaff.filter(s => s.role?.toLowerCase().includes('judge'));
  const showStaff = allStaff.filter(s => !s.role?.toLowerCase().includes('judge'));

  return (
    <motion.div key="step6-pattern" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <CardHeader>
        <CardTitle>Step 6: Select Patterns & Layout</CardTitle>
        <CardDescription>Assign a pattern to each group and choose the final look for your book.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* Show Details Summary */}
        <Card className="p-4 bg-muted/50">
          <h3 className="text-lg font-semibold mb-3">Show Information</h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Show Dates</p>
                <p className="text-muted-foreground">{dateRange}</p>
              </div>
            </div>
            
            {showStaff.length > 0 && (
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
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
            
            {judges.length > 0 && (
              <div className="flex items-start gap-2">
                <UserCheck className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Judges</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {judges.map((judge, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {judge.name || 'Not assigned'}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div>
          <h3 className="text-lg font-semibold mb-4">Pattern Selection</h3>
          <div className="space-y-6">
            {formData.classes?.map((pbbClass, classIndex) => (
              <div key={classIndex} className="space-y-4">
                {/* Discipline Box with Due Date */}
                <div className="p-4 border rounded-lg bg-card">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold mb-2">Discipline</Label>
                      <Select
                        value={formData.disciplineSelections?.[classIndex] || pbbClass.name}
                        onValueChange={(value) => handleDisciplineChange(classIndex, value)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select discipline..." />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {formData.classes?.map((cls, idx) => (
                            <SelectItem key={idx} value={cls.name}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-2">Due Date</Label>
                      <Input 
                        type="date"
                        value={formData.disciplineDueDates?.[classIndex] || ''}
                        onChange={(e) => handleDisciplineDueDateChange(classIndex, e.target.value)}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Pattern Groups */}
                <div className="space-y-4">
                  {pbbClass.patternGroups?.map((group, groupIndex) => (
                    <div key={group.id} className="p-4 border rounded-lg bg-background/50">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Label className="font-semibold text-base">{group.name}</Label>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {group.divisions?.map(div => (
                                <Badge key={`${div.assocId}-${div.division}`} variant="secondary" className="text-xs">{div.division}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm text-muted-foreground mb-2">Select Pattern</Label>
                          <Select 
                            value={formData.patternSelections?.[classIndex]?.[groupIndex] || ''} 
                            onValueChange={(value) => handlePatternSelection(classIndex, groupIndex, value)}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select a pattern..." />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {samplePatterns.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} <Badge variant="outline" className="ml-2">{p.difficulty}</Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Staff and Judge Selectors */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2">Assigned Staff</Label>
                            <Select
                              value={formData.groupStaff?.[classIndex]?.[groupIndex] || ''}
                              onValueChange={(value) => handleStaffSelection(classIndex, groupIndex, value)}
                            >
                              <SelectTrigger className="bg-background">
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
                          
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2">Assigned Judge</Label>
                            <Select
                              value={formData.groupJudges?.[classIndex]?.[groupIndex] || ''}
                              onValueChange={(value) => handleJudgeSelection(classIndex, groupIndex, value)}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select judge..." />
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Layout & Design</h3>
          <RadioGroup 
            value={formData.layoutSelection || 'layout-a'} 
            onValueChange={handleLayoutSelection} 
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="layout-a" id="layout-a" className="peer sr-only" />
              <Label htmlFor="layout-a" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                <div className="w-full space-y-2">
                  <p className="font-semibold text-center mb-2">Layout A: Modern</p>
                  <div className="w-full min-h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-md flex flex-col items-center justify-center text-xs p-6 border border-border space-y-4">
                    {/* Cover Page Preview */}
                    <div className="text-center space-y-2 border-b pb-4 w-full">
                      <p className="font-bold text-2xl">{formData.showName || 'Show Name'}</p>
                      <p className="text-muted-foreground font-semibold">Pattern Book</p>
                      <p className="text-xs text-muted-foreground">{dateRange}</p>
                      {formData.coverPageFile && (
                        <Badge variant="outline" className="text-xs mt-2">Custom Cover Uploaded</Badge>
                      )}
                    </div>
                    
                    {/* Pattern List Preview */}
                    <div className="w-full space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Patterns:</p>
                      {formData.classes?.slice(0, 3).map((cls, idx) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span>{cls.name}</span>
                          <span className="text-muted-foreground">Page {idx + 2}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Includes cover page with show details</p>
                </div>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="layout-b" id="layout-b" className="peer sr-only" />
              <Label htmlFor="layout-b" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                <div className="w-full space-y-2">
                  <p className="font-semibold text-center mb-2">Layout B: Classic</p>
                  <div className="w-full min-h-48 border-4 border-double border-border rounded-md flex flex-col p-6 bg-background space-y-4">
                    {/* Table of Contents Style */}
                    <div className="text-center border-b-2 border-double pb-3">
                      <p className="font-bold text-xl font-serif tracking-wide">{formData.showName || 'Show Name'}</p>
                      <p className="text-muted-foreground italic text-sm mt-1">Pattern Book</p>
                      <p className="text-xs text-muted-foreground mt-1">{dateRange}</p>
                    </div>
                    
                    {/* Table of Contents */}
                    <div className="space-y-1.5 text-xs">
                      <p className="font-bold text-sm font-serif text-center mb-2 border-b pb-1">Table of Contents</p>
                      <div className="flex justify-between px-2">
                        <span className="font-semibold">Show Information</span>
                        <span>1</span>
                      </div>
                      {formData.classes?.slice(0, 4).map((cls, idx) => (
                        <div key={idx} className="flex justify-between px-2 border-b border-dotted">
                          <span>{cls.name}</span>
                          <span>{idx + 2}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Includes table of contents</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </motion.div>
  );
};