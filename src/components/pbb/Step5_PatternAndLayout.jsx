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
import { Calendar, Users, UserCheck, Trash2, Trophy, MapPin, Eye, AlertCircle } from 'lucide-react';
import { cn, parseLocalDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Pattern Sets with version categories (ALL = universal, GR/NOV = Green/Novice simplified)
const PATTERN_SETS = [
  { setNumber: 1, name: 'Pattern 1-9', maneuvers: { ALL: 11, 'GR/NOV': 9 } },
  { setNumber: 2, name: 'Pattern 1-15', maneuvers: { ALL: 11, 'GR/NOV': 9 } },
  { setNumber: 3, name: 'Pattern 1-20', maneuvers: { ALL: 12, 'GR/NOV': 10 } },
];

// Pattern version categories
const PATTERN_VERSIONS = [
  { id: 'ALL', label: 'ALL (Universal)', description: 'Valid for every class', color: 'bg-blue-100 text-blue-800' },
  { id: 'GR/NOV', label: 'GR/NOV (Green/Novice)', description: 'Simplified for Green/Novice', color: 'bg-teal-100 text-teal-800' },
  { id: 'L1', label: 'L1 (Level 1)', description: 'Simplified for Level 1', color: 'bg-green-100 text-green-800' },
  { id: 'Beginner', label: 'Beginner', description: 'For beginner classes', color: 'bg-purple-100 text-purple-800' },
];

// Helper to detect group type based on division names
// Returns specific type only if ALL divisions match that type, otherwise returns 'ALL' (mixed)
const detectGroupType = (divisions) => {
  if (!divisions || divisions.length === 0) return 'ALL';
  
  const divisionNames = divisions.map(d => (d.name || d.division)?.toLowerCase() || '');
  
  // Check if each division belongs to a specific category
  const categoryCheck = divisionNames.map(name => {
    const isGreen = name.includes('green');
    const isNovice = name.includes('novice') || name.includes('rookie');
    const isL1 = name.includes('level 1') || name.includes('l1');
    const isBeginner = name.includes('beginner');
    const isWalkTrot = name.includes('walk-trot') || name.includes('walk trot');
    
    if (isGreen || isNovice) return 'GR/NOV';
    if (isL1) return 'L1';
    if (isBeginner || isWalkTrot) return 'Beginner';
    return 'standard'; // Open, Amateur, Youth without level qualifiers
  });
  
  // Get unique categories
  const uniqueCategories = [...new Set(categoryCheck)];
  
  // If all divisions are the same specific category, return that category
  if (uniqueCategories.length === 1 && uniqueCategories[0] !== 'standard') {
    return uniqueCategories[0];
  }
  
  // Mixed divisions or all standard = use ALL (universal pattern)
  return 'ALL';
};

    export const Step5_PatternAndLayout = ({ formData, setFormData }) => {
  const { toast } = useToast();
  const [calendarOpen, setCalendarOpen] = React.useState({});
  const [openAccordions, setOpenAccordions] = React.useState([]);
  const disciplineRefs = React.useRef({});

  // Helper to get pattern selection - checks both ID-based (Step 3) and index-based keys
  const getPatternSelection = (disciplineId, groupId, disciplineIndex, groupIndex) => {
    const selections = formData.patternSelections || {};
    // First check ID-based key (from Step 3)
    if (selections[disciplineId]?.[groupId]) {
      return selections[disciplineId][groupId];
    }
    // Fallback to index-based key (legacy)
    return selections[disciplineIndex]?.[groupIndex] || null;
  };

  // Helper to set pattern selection using ID-based keys
  const setPatternSelection = (disciplineId, groupId, selection) => {
    setFormData(prev => {
      const newSelections = { ...(prev.patternSelections || {}) };
      if (!newSelections[disciplineId]) newSelections[disciplineId] = {};
      newSelections[disciplineId][groupId] = selection;
      return { ...prev, patternSelections: newSelections };
    });
  };

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

      // Check if a discipline is complete (all groups have patterns assigned with setNumber and version)
      const isDisciplineComplete = (pbbDiscipline, disciplineIndex) => {
        const groups = pbbDiscipline.patternGroups || [];
        if (groups.length === 0) return false;
        
        return groups.every((group, groupIndex) => {
          const selection = getPatternSelection(pbbDiscipline.id, group.id, disciplineIndex, groupIndex);
          // Check if selection has both setNumber and version
          return selection?.setNumber && selection?.version;
        });
      };

      // Scroll to discipline and expand it
      const scrollToDiscipline = (disciplineIndex) => {
        const ref = disciplineRefs.current[disciplineIndex];
        if (ref) {
          ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Expand the accordion for this discipline
          const accordionValue = `discipline-${disciplineIndex}`;
          setOpenAccordions(prev => {
            if (prev.includes(accordionValue)) {
              return prev;
            }
            return [...prev, accordionValue];
          });
        }
      };


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
            <CardTitle>Step 5: Select Patterns</CardTitle>
            <CardDescription>Assign a pattern to each group for your book.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* 3-Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left Column - Show Information */}
              <Card className="p-4 bg-muted/50">
                <h3 className="text-lg font-semibold mb-4">Show Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">Show Name</p>
                      <p className="text-muted-foreground">{formData.showName || 'Not set'}</p>
                    </div>
                  </div>

                  {formData.venueName && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">Venue Name</p>
                        <p className="text-muted-foreground">{formData.venueName}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">Show Dates</p>
                      <p className="text-muted-foreground">{dateRange}</p>
                    </div>
                  </div>

                  {formData.venueAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">Location</p>
                        <p className="text-muted-foreground">{formData.venueAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Middle Column - Show Staff & Judges */}
              <Card className="p-4 bg-muted/50">
                <div className="space-y-4">
                  {/* Show Staff Section */}
                  {showStaff.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Show Staff</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {showStaff.map((staff, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {staff.role}: {staff.name || 'Not assigned'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Judges Section */}
                  {judgesWithAssociations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Judges</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {judgesWithAssociations.map((judge, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {judge.name} - {judge.associations.join(', ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Right Column - Discipline Folders */}
              <Card className="p-4 bg-muted/50">
                <h3 className="text-lg font-semibold mb-4">Discipline Folders</h3>
                <div className="text-sm text-muted-foreground mb-4">
                  <p>
                    {patternDisciplines.filter((d, idx) => {
                      const originalDisciplineIndex = (formData.disciplines || []).findIndex(fd => fd.id === d.id);
                      return !isDisciplineComplete(d, originalDisciplineIndex);
                    }).length} of {patternDisciplines.length} disciplines incomplete
                  </p>
                </div>
                <div className="space-y-2">
                  {patternDisciplines.map((pbbDiscipline) => {
                    const originalDisciplineIndex = (formData.disciplines || []).findIndex(fd => fd.id === pbbDiscipline.id);
                    const isComplete = isDisciplineComplete(pbbDiscipline, originalDisciplineIndex);
                    const patternCount = (pbbDiscipline.patternGroups || []).filter((_, gIdx) => 
                      formData.patternSelections?.[originalDisciplineIndex]?.[gIdx]
                    ).length;
                    
                    return (
                      <div
                        key={originalDisciplineIndex}
                        onClick={() => scrollToDiscipline(originalDisciplineIndex)}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{pbbDiscipline.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {patternCount} patterns assigned
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={isComplete ? "default" : "destructive"}
                            className="flex-shrink-0 text-xs"
                          >
                            {isComplete ? "Complete" : "Incomplete"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {patternDisciplines.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Pattern Selection</h3>
                <Accordion 
                  type="multiple" 
                  value={openAccordions}
                  onValueChange={setOpenAccordions}
                  className="space-y-4"
                >
                  {patternDisciplines.map((pbbDiscipline) => {
                    const originalDisciplineIndex = (formData.disciplines || []).findIndex(d => d.id === pbbDiscipline.id);
                    const isComplete = isDisciplineComplete(pbbDiscipline, originalDisciplineIndex);
                    
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
                    <AccordionItem 
                      key={originalDisciplineIndex} 
                      value={`discipline-${originalDisciplineIndex}`}
                      className="border rounded-lg"
                      ref={(el) => disciplineRefs.current[originalDisciplineIndex] = el}
                    >
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-2">
                          <h4 className="font-bold text-md">{pbbDiscipline.name}</h4>
                          <div className="flex items-center gap-2">
                            {isComplete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-2 text-green-600 hover:text-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast({
                                    title: "Preview Pattern",
                                    description: "Pattern preview will be available soon."
                                  });
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Badge variant={isComplete ? "default" : "destructive"} className="ml-2">
                              {isComplete ? "Complete" : "Incomplete"}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
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
                              
                              {/* Two-step Pattern Selection: Set → Version */}
                              <div className="col-span-1 md:col-span-2 space-y-3">
                                <Label className="text-sm font-medium">Pattern Selection</Label>
                                
                                {/* Suggested version based on group divisions */}
                                {(() => {
                                  const suggestedVersion = detectGroupType(group.divisions);
                                  const currentSelection = getPatternSelection(pbbDiscipline.id, group.id, originalDisciplineIndex, groupIndex);
                                  return suggestedVersion !== 'ALL' && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      <AlertCircle className="h-3 w-3" />
                                      Suggested: <Badge variant="outline" className="text-xs">{suggestedVersion}</Badge> based on divisions
                                    </div>
                                  );
                                })()}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Step 1: Select Pattern Set */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground">1. Pattern Set</Label>
                                    <Select 
                                      value={getPatternSelection(pbbDiscipline.id, group.id, originalDisciplineIndex, groupIndex)?.setNumber?.toString() || ''}
                                      onValueChange={(value) => {
                                        const setNum = parseInt(value);
                                        const suggestedVersion = detectGroupType(group.divisions);
                                        setPatternSelection(pbbDiscipline.id, group.id, {
                                          setNumber: setNum,
                                          version: suggestedVersion,
                                          patternId: `pattern-${setNum}-${suggestedVersion}`
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select pattern set..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {PATTERN_SETS.map(set => (
                                          <SelectItem key={set.setNumber} value={set.setNumber.toString()}>
                                            {pbbDiscipline.name} {set.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Step 2: Select Pattern Version */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground">2. Pattern Version</Label>
                                    {(() => {
                                      const currentSelection = getPatternSelection(pbbDiscipline.id, group.id, originalDisciplineIndex, groupIndex);
                                      return (
                                        <Select 
                                          value={currentSelection?.version || ''}
                                          onValueChange={(value) => {
                                            setPatternSelection(pbbDiscipline.id, group.id, {
                                              ...currentSelection,
                                              version: value,
                                              patternId: `pattern-${currentSelection?.setNumber || 1}-${value}`
                                            });
                                          }}
                                          disabled={!currentSelection?.setNumber}
                                        >
                                          <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select version..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {PATTERN_VERSIONS.map(version => (
                                              <SelectItem key={version.id} value={version.id}>
                                                <div className="flex items-center gap-2">
                                                  <span>{version.label}</span>
                                                  <Badge variant="outline" className={`text-xs ${version.color}`}>
                                                    {version.description}
                                                  </Badge>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      );
                                    })()}
                                  </div>
                                </div>
                                
                                {/* Show selected pattern summary */}
                                {(() => {
                                  const currentSelection = getPatternSelection(pbbDiscipline.id, group.id, originalDisciplineIndex, groupIndex);
                                  return currentSelection?.setNumber && (
                                    <div className="text-sm bg-muted/50 p-2 rounded flex items-center justify-between">
                                      <span>
                                        <strong>{pbbDiscipline.name} Pattern {currentSelection.setNumber}</strong>
                                        {' '}
                                        <Badge className={PATTERN_VERSIONS.find(v => v.id === currentSelection.version)?.color || ''}>
                                          {currentSelection.version || 'ALL'}
                                        </Badge>
                                      </span>
                                    </div>
                                  );
                                })()}
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
                      </AccordionContent>
                    </AccordionItem>
                  )})}
                </Accordion>
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No disciplines require pattern selections.</p>
              </div>
            )}

          </CardContent>
        </motion.div>
      );
    };