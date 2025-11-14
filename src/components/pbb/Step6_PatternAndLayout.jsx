import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Calendar, Users, UserCheck } from 'lucide-react';
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

  const handleDeletePattern = (classIndex, groupIndex) => {
    setFormData(prev => {
      const newSelections = { ...prev.patternSelections };
      if (newSelections[classIndex]) {
        delete newSelections[classIndex][groupIndex];
      }
      return { ...prev, patternSelections: newSelections };
    });
  };

  const handleLayoutSelection = (layoutId) => {
    setFormData(prev => ({ ...prev, layoutSelection: layoutId }));
  };

  // Format date range
  const dateRange = formData.startDate && formData.endDate 
    ? `${format(new Date(formData.startDate), 'MMM d')} - ${format(new Date(formData.endDate), 'MMM d, yyyy')}`
    : 'Dates not set';

  // Get judges info
  const judges = formData.staff?.filter(s => s.role?.toLowerCase().includes('judge')) || [];
  
  // Get other show staff
  const showStaff = formData.officials || [];

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Show Dates</p>
                <p className="text-muted-foreground">{dateRange}</p>
              </div>
            </div>
            
            {judges.length > 0 && (
              <div className="flex items-start gap-2">
                <UserCheck className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Judges</p>
                  {judges.map((judge, idx) => (
                    <p key={idx} className="text-muted-foreground">{judge.name || 'Not assigned'}</p>
                  ))}
                </div>
              </div>
            )}
            
            {showStaff.length > 0 && (
              <div className="flex items-start gap-2 md:col-span-2">
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
          </div>
        </Card>

        <div>
          <h3 className="text-lg font-semibold mb-4">Pattern Selection</h3>
          <div className="space-y-6">
            {formData.classes?.map((pbbClass, classIndex) => (
              <div key={classIndex} className="p-4 border rounded-lg bg-background/50">
                <h4 className="font-bold text-md mb-3">{pbbClass.name}</h4>
                <div className="space-y-4">
                  {pbbClass.patternGroups?.map((group, groupIndex) => (
                    <div key={group.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-4">
                      <div className="md:col-span-3">
                        <Label className="font-semibold">{group.name}</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {group.divisions?.map(div => (
                            <Badge key={`${div.assocId}-${div.division}`} variant="secondary" className="text-xs">{div.division}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-8">
                        <Select 
                          value={formData.patternSelections?.[classIndex]?.[groupIndex] || ''} 
                          onValueChange={(value) => handlePatternSelection(classIndex, groupIndex, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pattern..." />
                          </SelectTrigger>
                          <SelectContent>
                            {samplePatterns.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} <Badge variant="outline" className="ml-2">{p.difficulty}</Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeletePattern(classIndex, groupIndex)}
                          disabled={!formData.patternSelections?.[classIndex]?.[groupIndex]}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
                  <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-md flex flex-col items-center justify-center text-xs p-4 border border-border">
                    <div className="text-center space-y-1">
                      <p className="font-bold text-lg">{formData.showName || 'Show Name'}</p>
                      <p className="text-muted-foreground">Pattern Book</p>
                      <p className="text-xs text-muted-foreground mt-2">{dateRange}</p>
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
                  <div className="w-full h-32 bg-secondary rounded-md flex flex-col items-start justify-start text-xs p-4 border border-border overflow-hidden">
                    <p className="font-bold text-sm mb-2">TABLE OF CONTENTS</p>
                    <div className="space-y-1 w-full text-[10px] text-muted-foreground">
                      <div className="flex justify-between"><span>Showmanship</span><span>4-8</span></div>
                      <div className="flex justify-between"><span>Horsemanship</span><span>9-12</span></div>
                      <div className="flex justify-between"><span>Trail</span><span>13-18</span></div>
                      <div className="flex justify-between"><span>Western Riding</span><span>19-21</span></div>
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