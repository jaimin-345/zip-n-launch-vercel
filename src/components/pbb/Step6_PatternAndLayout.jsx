import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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

  const handleLayoutSelection = (layoutId) => {
    setFormData(prev => ({ ...prev, layoutSelection: layoutId }));
  };

  return (
    <motion.div key="step6-pattern" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <CardHeader>
        <CardTitle>Step 6: Select Patterns & Layout</CardTitle>
        <CardDescription>Assign a pattern to each group and choose the final look for your book.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Pattern Selection</h3>
          <div className="space-y-6">
            {formData.classes.map((pbbClass, classIndex) => (
              <div key={classIndex} className="p-4 border rounded-lg bg-background/50">
                <h4 className="font-bold text-md mb-3">{pbbClass.name}</h4>
                <div className="space-y-4">
                  {pbbClass.patternGroups.map((group, groupIndex) => (
                    <div key={group.id} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                      <div className="md:col-span-1">
                        <Label className="font-semibold">{group.name}</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {group.divisions.map(div => (
                            <Badge key={`${div.assocId}-${div.division}`} variant="secondary" className="text-xs">{div.division}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Select onValueChange={(value) => handlePatternSelection(classIndex, groupIndex, value)}>
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
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Layout & Design</h3>
          <RadioGroup defaultValue="layout-a" onValueChange={handleLayoutSelection} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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