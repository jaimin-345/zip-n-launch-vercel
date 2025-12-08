import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, FileText, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PatternGroupPreview from './PatternGroupPreview';
import ScoresheetGroupPreview from './ScoresheetGroupPreview';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { parseLocalDate } from '@/lib/utils';

export const Step6_Preview = ({ formData, setFormData, isEducationMode, stepNumber = 7, onGoToStep }) => {
  const [availablePatterns, setAvailablePatterns] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const patternDisciplines = useMemo(() => (formData.disciplines || []).filter(d => d.pattern), [formData.disciplines]);
  const scoresheetDisciplines = useMemo(() => (formData.disciplines || []).filter(d => d.scoresheet), [formData.disciplines]);

  const dateRange = formData.startDate && formData.endDate
    ? `${format(parseLocalDate(formData.startDate), 'MMM d')} - ${format(parseLocalDate(formData.endDate), 'MMM d, yyyy')}`
    : 'Dates not set';

  useEffect(() => {
    const fetchPatterns = async () => {
        setIsLoading(true);
        const allGroupKeys = patternDisciplines.flatMap((discipline, discIndex) =>
            (discipline.patternGroups || []).map((group, groupIndex) => ({
                key: `${discIndex}-${groupIndex}`,
                disciplineName: discipline.name,
                selectedAssociations: discipline.selectedAssociations
            }))
        );

        if (allGroupKeys.length === 0) {
            setIsLoading(false);
            return;
        }

        try {
            const patternPromises = allGroupKeys.map(async groupInfo => {
                const assocKeys = Object.keys(groupInfo.selectedAssociations);
                
                let query = supabase
                    .from('patterns')
                    .select('id, name, difficulty:pattern_set_name, url:preview_image_url, pattern_associations!inner(association_id)')
                    .eq('review_status', 'approved')
                    .or(`class_name.eq.${groupInfo.disciplineName},class_name.eq.All`)
                    .in('pattern_associations.association_id', assocKeys);
                
                const { data, error } = await query;
                
                if (error) {
                    console.error('Error fetching patterns for', groupInfo.key, error);
                    return { key: groupInfo.key, patterns: [] };
                }

                return { key: groupInfo.key, patterns: data || [] };
            });

            const results = await Promise.all(patternPromises);
            const newAvailablePatterns = results.reduce((acc, result) => {
                acc[result.key] = result.patterns;
                return acc;
            }, {});

            setAvailablePatterns(newAvailablePatterns);
        } catch (error) {
            toast({
                title: 'Error Fetching Patterns',
                description: 'Could not load available patterns. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (patternDisciplines.length > 0) {
      fetchPatterns();
    } else {
      setIsLoading(false);
    }
  }, [JSON.stringify(patternDisciplines), toast]);


  const handlePatternSelectionChange = (disciplineIndex, groupIndex, newPatternId) => {
    setFormData(prev => {
      const newFormData = { ...prev };
      if (!newFormData.patternSelections) {
          newFormData.patternSelections = {};
      }
      if (!newFormData.patternSelections[disciplineIndex]) {
        newFormData.patternSelections[disciplineIndex] = {};
      }
      newFormData.patternSelections[disciplineIndex][groupIndex] = newPatternId;
      return newFormData;
    });
  };

  const handleLayoutSelection = (layoutId) => {
    setFormData(prev => ({ ...prev, layoutSelection: layoutId }));
  };
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Fetching available patterns...</p>
        </div>
    );
  }

  return (
    <motion.div key="step6-preview" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <CardHeader>
        <CardTitle>Step {stepNumber}: Preview</CardTitle>
        <CardDescription>Review your selected patterns and scoresheets. Use the carousel to see alternatives for each group.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Layout & Design Section */}
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
                      {patternDisciplines.slice(0, 3).map((disc, idx) => {
                        let cumulativePage = 2;
                        for (let i = 0; i < idx; i++) {
                          const prevDisc = patternDisciplines[i];
                          const prevGroupCount = (prevDisc.patternGroups || []).length;
                          cumulativePage += prevGroupCount;
                        }
                        return (
                          <div key={disc.id} className="text-xs flex justify-between">
                            <span>{disc.name}</span>
                            <span className="text-muted-foreground">Page {cumulativePage}</span>
                          </div>
                        );
                      })}
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
                      {patternDisciplines.slice(0, 4).map((disc, idx) => {
                        let cumulativePage = 2;
                        for (let i = 0; i < idx; i++) {
                          const prevDisc = patternDisciplines[i];
                          const prevGroupCount = (prevDisc.patternGroups || []).length;
                          cumulativePage += prevGroupCount;
                        }
                        return (
                          <div
                            key={disc.id}
                            className="flex justify-between px-2 border-b border-dotted"
                          >
                            <span>{disc.name}</span>
                            <span>{cumulativePage}</span>
                          </div>
                        );
                      })}
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

        {/* Patterns Section */}
        {patternDisciplines.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">Pattern Preview</h3>
              {onGoToStep && (
                <Button variant="outline" size="sm" onClick={() => onGoToStep(5)}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Re-assign
                </Button>
              )}
            </div>
            <div className="space-y-6">
              {patternDisciplines.map((pbbDiscipline) => {
                const originalDisciplineIndex = formData.disciplines.findIndex(d => d.id === pbbDiscipline.id);
                return (
                  <div key={originalDisciplineIndex} className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-bold text-lg mb-4 text-primary">{pbbDiscipline.name}</h4>
                    <div className="space-y-6">
                      {(pbbDiscipline.patternGroups || []).map((group, groupIndex) => {
                         const groupKey = `${originalDisciplineIndex}-${groupIndex}`;
                         const groupPatterns = availablePatterns[groupKey] || [];
                         const selectedPatternId = formData.patternSelections?.[originalDisciplineIndex]?.[groupIndex];

                         return(
                          <div key={group.id}>
                            <PatternGroupPreview
                              group={group}
                              patterns={groupPatterns}
                              selectedPatternId={selectedPatternId}
                              onPatternSelect={(newPatternId) => handlePatternSelectionChange(originalDisciplineIndex, groupIndex, newPatternId)}
                              primaryAffiliates={new Set(formData.primaryAffiliates || [])}
                            />
                            {isEducationMode && formData.lessonPlans && formData.lessonPlans.length > 0 && (
                              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                  <h5 className="font-semibold text-sm mb-2 text-blue-800 dark:text-blue-300">Associated Lesson Plans</h5>
                                  <div className="flex flex-wrap gap-2">
                                      {(formData.lessonPlans || []).map((plan, index) => (
                                          <Badge key={index} variant="outline" className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-600">
                                              <FileText className="h-3 w-3" />
                                              {plan.customName || plan.fileName}
                                          </Badge>
                                      ))}
                                  </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scoresheets Section */}
        {scoresheetDisciplines.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Scoresheet Preview</h3>
            <div className="space-y-6">
              {scoresheetDisciplines.map((pbbDiscipline) => {
                const originalDisciplineIndex = formData.disciplines.findIndex(d => d.id === pbbDiscipline.id);
                return (
                  <div key={originalDisciplineIndex} className="p-4 border rounded-lg bg-background/50">
                    <h4 className="font-bold text-lg mb-4 text-primary">{pbbDiscipline.name}</h4>
                    <div className="space-y-6">
                      {(pbbDiscipline.patternGroups || []).map((group, groupIndex) => (
                        <ScoresheetGroupPreview
                          key={group.id}
                          group={group}
                          scoresheets={group.scoresheets || []}
                          discipline={pbbDiscipline}
                          formData={formData}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {patternDisciplines.length === 0 && scoresheetDisciplines.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No disciplines require pattern or scoresheet selections.</p>
          </div>
        )}
      </CardContent>
    </motion.div>
  );
};