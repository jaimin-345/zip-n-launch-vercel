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
    import { Calendar, Users, UserCheck } from 'lucide-react';

    const samplePatterns = [
      { id: 'pat_1', name: 'Classic Horsemanship #101', difficulty: 'Intermediate' },
      { id: 'pat_2', name: 'Advanced Trail Challenge #203', difficulty: 'Advanced' },
      { id: 'pat_3', name: 'Beginner Reining Loop', difficulty: 'Beginner' },
      { id: 'pat_4', name: 'Smooth Equitation Flow', difficulty: 'Intermediate' },
    ];

    export const Step5_PatternAndLayout = ({ formData, setFormData }) => {
      const handlePatternSelection = (disciplineIndex, groupIndex, patternId) => {
        setFormData(prev => {
          const newSelections = { ...(prev.patternSelections || {}) };
          if (!newSelections[disciplineIndex]) newSelections[disciplineIndex] = {};
          newSelections[disciplineIndex][groupIndex] = patternId;
          return { ...prev, patternSelections: newSelections };
        });
      };



      const handleLayoutSelection = (layoutId) => {
        setFormData(prev => ({ ...prev, layoutSelection: layoutId }));
      };
      
      const patternDisciplines = (formData.disciplines || []).filter(d => d.pattern);

      // Format date range
      const dateRange = formData.startDate && formData.endDate 
        ? `${format(new Date(formData.startDate), 'MMM d')} - ${format(new Date(formData.endDate), 'MMM d, yyyy')}`
        : 'Dates not set';


      // Get judges and staff from officials
      const judges = (formData.officials || []).filter(o => o.role?.toLowerCase().includes('judge'));
      const showStaff = (formData.officials || []).filter(o => !o.role?.toLowerCase().includes('judge'));

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

                
                {showStaff.length > 0 && (
                  <div className="flex items-start gap-2 md:col-span-2">
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
                
                {judges.length > 0 && (
                  <div className="flex items-start gap-2 md:col-span-2">
                    <UserCheck className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="w-full">
                      <p className="font-semibold">Judges</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {judges.map((judge, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {judge.role}: {judge.name || 'Not assigned'}
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
                    return (
                    <div key={originalDisciplineIndex} className="p-4 border rounded-lg bg-background/50">
                      <h4 className="font-bold text-md mb-3">{pbbDiscipline.name}</h4>
                      <div className="space-y-4">
                        {(pbbDiscipline.patternGroups || []).map((group, groupIndex) => (
                          <div key={group.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-4">
                            <div className="md:col-span-3">
                              <Label className="font-semibold">{group.name}</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(group.divisions || []).map(div => (
                                  <Badge key={`${div.assocId}-${div.division}`} variant="secondary" className="text-xs">{div.division}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="md:col-span-9">
                              <Select 
                                value={formData.patternSelections?.[originalDisciplineIndex]?.[groupIndex] || ''}
                                onValueChange={(value) => handlePatternSelection(originalDisciplineIndex, groupIndex, value)}
                              >
                                <SelectTrigger>
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