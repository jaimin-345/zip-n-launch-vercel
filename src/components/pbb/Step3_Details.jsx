import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn, parseLocalDate } from '@/lib/utils';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JudgesAndStaff } from '@/components/pbb/JudgesAndStaff';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

export const Step3_Details = ({ formData, setFormData, isClinicMode = false, isEducationMode = false }) => {
  const handleUpdate = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const selectedAssociationIds = Object.keys(formData.associations);
  const mode = isClinicMode ? 'clinic' : isEducationMode ? 'education' : 'show';

  const titles = {
    show: 'Show Details',
    clinic: 'Clinic Details',
    education: 'Lesson Details'
  };

  const descriptions = {
    show: "Enter the essential information for your event. This will be used to populate your pattern book.",
    clinic: "Enter the essential information for your clinic. This will be used to populate your materials.",
    education: "Enter details for your lesson plan or educational materials. This information is optional."
  };

  const infoTriggers = {
    show: 'Event Information',
    clinic: 'Clinic Information',
    education: 'Lesson Information'
  };

  const staffTriggers = {
    show: 'Judges & Staff',
    clinic: 'Clinicians & Staff',
    education: 'Instructor(s) & Staff'
  };
  
  const nameLabels = {
    show: 'Show Name',
    clinic: 'Clinic Name',
    education: 'Lesson/Topic Name'
  };
  
  const namePlaceholders = {
    show: "E.g., Summer Sizzler",
    clinic: "E.g., Summer Horsemanship Clinic",
    education: "E.g., Introduction to Showmanship"
  };

  return (
    <motion.div key="step4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Step 4: {titles[mode]}</CardTitle>
        <CardDescription className="text-sm">{descriptions[mode]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger className="text-base font-semibold">{infoTriggers[mode]}</AccordionTrigger>
                <AccordionContent className="pt-3 space-y-3">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                            <Label htmlFor="showName">{nameLabels[mode]}</Label>
                            <Input id="showName" value={formData.showName} onChange={(e) => handleUpdate('showName', e.target.value)} placeholder={namePlaceholders[mode]} />
                        </div>
                        <div>
                            <Label htmlFor="startDate">Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !formData.startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.startDate ? format(parseLocalDate(formData.startDate), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={formData.startDate ? parseLocalDate(formData.startDate) : null}
                                        onSelect={(date) => handleUpdate('startDate', date ? format(date, 'yyyy-MM-dd') : null)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="endDate">End Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !formData.endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.endDate ? format(parseLocalDate(formData.endDate), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={formData.endDate ? parseLocalDate(formData.endDate) : null}
                                        onSelect={(date) => handleUpdate('endDate', date ? format(date, 'yyyy-MM-dd') : null)}
                                        disabled={{ before: formData.startDate ? parseLocalDate(formData.startDate) : null }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="venueName">Venue Name</Label>
                            <Input id="venueName" value={formData.venueName} onChange={(e) => handleUpdate('venueName', e.target.value)} placeholder="E.g., Grand Oak Arena" />
                        </div>
                        <div>
                            <Label htmlFor="venueAddress">Venue Address</Label>
                            <Input id="venueAddress" value={formData.venueAddress} onChange={(e) => handleUpdate('venueAddress', e.target.value)} placeholder="E.g., 123 Stable Rd, City, State" />
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
                 <AccordionTrigger className="text-base font-semibold">{staffTriggers[mode]}</AccordionTrigger>
                 <AccordionContent className="pt-3">
                    <JudgesAndStaff
                        formData={formData}
                        setFormData={setFormData}
                        selectedAssociationIds={selectedAssociationIds}
                        isClinicMode={isClinicMode}
                        isEducationMode={isEducationMode}
                    />
                 </AccordionContent>
            </AccordionItem>
        </Accordion>
      </CardContent>
    </motion.div>
  );
};