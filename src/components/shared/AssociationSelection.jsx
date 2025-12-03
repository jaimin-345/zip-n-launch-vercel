import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AssociationCheckbox = ({ association, isSelected, onSelect, formData, setFormData, allAssociations }) => {

  const handleSubAssociationChange = (assocId, key, value) => {
    setFormData(prev => ({
      ...prev,
      subAssociationSelections: {
        ...prev.subAssociationSelections,
        [assocId]: {
          ...prev.subAssociationSelections?.[assocId],
          [key]: value
        }
      }
    }));
  };
  
  const NsbaDualApprovedWithSelector = () => {
    const selectedOtherAssociations = Object.keys(formData.associations || {})
        .filter(key => key.toLowerCase() !== 'nsba' && formData.associations[key] && !formData.primaryAffiliates.includes(key))
        .map(key => allAssociations.find(a => a.id === key))
        .filter(Boolean);

    const selectedValues = formData.subAssociationSelections?.nsba?.dualApprovedWith || [];
    
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={selectedOtherAssociations.length === 0}
                >
                    {selectedValues.length > 0 
                        ? selectedValues.map(val => allAssociations.find(a => a.id === val)?.abbreviation || val).join(', ')
                        : selectedOtherAssociations.length === 0 ? "No other associations selected" : "Select associations..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search associations..." />
                    <CommandEmpty>No associations found.</CommandEmpty>
                    <CommandGroup>
                        {selectedOtherAssociations.map((assoc) => (
                            <CommandItem
                                key={assoc.id}
                                value={assoc.id}
                                onSelect={(currentValue) => {
                                    const currentSelection = formData.subAssociationSelections?.nsba?.dualApprovedWith || [];
                                    const newSelection = currentSelection.includes(currentValue)
                                        ? currentSelection.filter((item) => item !== currentValue)
                                        : [...currentSelection, currentValue];
                                    handleSubAssociationChange('nsba', 'dualApprovedWith', newSelection);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        (formData.subAssociationSelections?.nsba?.dualApprovedWith || []).includes(assoc.id) ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {assoc.name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
  };

  const handleSetPrimary = (e, assocId) => {
    e.stopPropagation();
    setFormData(prev => {
        const currentPrimaries = prev.primaryAffiliates || [];
        const isPrimary = currentPrimaries.includes(assocId);
        const newPrimaries = isPrimary 
            ? currentPrimaries.filter(id => id !== assocId)
            : [...currentPrimaries, assocId];
        
        const nsbaId = allAssociations.find(a => a.id.toLowerCase() === 'nsba')?.id;
        if (nsbaId && prev.associations?.[nsbaId] && !newPrimaries.includes(nsbaId)) {
            newPrimaries.push(nsbaId);
        }

        return { ...prev, primaryAffiliates: newPrimaries };
    });
  };

  const renderSubOptions = () => {
    if (!isSelected) return null;
    const subSelections = formData.subAssociationSelections || {};
    
    if (association.sub_association_info) {
      const info = association.sub_association_info;
      const selectedTypes = subSelections[association.id]?.types || [];
      
      const handleSubTypeToggle = (typeId, checked) => {
        const currentTypes = selectedTypes;
        const newTypes = checked 
          ? [...currentTypes, typeId]
          : currentTypes.filter(t => t !== typeId);
        handleSubAssociationChange(association.id, 'types', newTypes);
      };
      
      return (
        <div className="mt-2 space-y-2 px-3 pb-2">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">{info.label}</Label>
            <div className="space-y-1.5">
              {info.types.map(type => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`sub-type-${association.id}-${type.id}`}
                    checked={selectedTypes.includes(type.id)}
                    onCheckedChange={(checked) => handleSubTypeToggle(type.id, checked)}
                  />
                  <Label 
                    htmlFor={`sub-type-${association.id}-${type.id}`}
                    className="font-normal cursor-pointer"
                  >
                    {type.name}
                    {type.info && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="inline-block ml-1 h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{type.info}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    if (association.id.toLowerCase() === 'nsba') {
      const approvalType = subSelections.nsba?.approvalType;
      return (
        <div className="mt-2 space-y-2 px-3 pb-2">
          <div>
            <Label className="text-xs text-muted-foreground">NSBA Show Category</Label>
            <Select value={subSelections.nsba?.showCategory || ''} onValueChange={(value) => handleSubAssociationChange('nsba', 'showCategory', value)}>
              <SelectTrigger><SelectValue placeholder="Select show category..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cat1">Category I ($10k+ Added)</SelectItem>
                <SelectItem value="cat2">Category II (&lt;$10k Added)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">NSBA Approval Type</Label>
            <Select value={approvalType || ''} onValueChange={(value) => handleSubAssociationChange('nsba', 'approvalType', value)}>
              <SelectTrigger><SelectValue placeholder="Select approval type..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dual">Dual-Approved</SelectItem>
                <SelectItem value="standalone">Standalone (Special Event)</SelectItem>
                <SelectItem value="both">Both Dual-Approved & Standalone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(approvalType === 'dual' || approvalType === 'both') && (
            <div>
              <Label className="text-xs text-muted-foreground">Dual-Approved With</Label>
              <NsbaDualApprovedWithSelector />
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const isPrimary = (formData.primaryAffiliates || []).includes(association.id);
  const isNsba = association.id.toLowerCase() === 'nsba';

  return (
    <div 
      className={cn(
        "rounded-md border bg-card transition-all duration-200",
        isSelected ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/50'
      )}
    >
      <div className="flex items-center space-x-3 p-3 cursor-pointer" onClick={() => onSelect(association.id, !isSelected)}>
        <Checkbox id={`assoc-${association.id}`} checked={isSelected} onCheckedChange={(checked) => onSelect(association.id, checked)} />
        <Label htmlFor={`assoc-${association.id}`} className="font-normal cursor-pointer flex-grow">
          {association.name}
        </Label>
        {isSelected && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button 
                variant={isPrimary ? "default" : "outline"} 
                size="sm" 
                onClick={(e) => handleSetPrimary(e, association.id)}
                disabled={isNsba}
            >
              {isPrimary ? "Primary" : "Set Primary"}
            </Button>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        {isNsba ? (
                            <p>NSBA is the default primary and cannot be changed.</p>
                        ) : (
                            <p>Marking an association as 'Primary' indicates that its official score sheets<br />should be used for all applicable classes. You can select multiple primary associations.</p>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {renderSubOptions()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AssociationSelection = ({ formData, setFormData, associationsData, onShowTypeChange, context = 'default' }) => {
    
  const handleAssociationSelection = (assocId, isChecked) => {
    setFormData(prev => {
        let newAssociations = { ...prev.associations };
        let newPrimaryAffiliates = [...(prev.primaryAffiliates || [])];
        const nsbaId = allAssociations.find(a => a.id.toLowerCase() === 'nsba')?.id;

        if (isChecked) {
            newAssociations[assocId] = true;
            if (nsbaId && assocId === nsbaId && !newPrimaryAffiliates.includes(nsbaId)) {
                newPrimaryAffiliates.push(nsbaId);
            }
        } else {
            delete newAssociations[assocId];
            newPrimaryAffiliates = newPrimaryAffiliates.filter(id => id !== assocId);
        }
        
        // Only reset disciplines if REMOVING an association (to clean up related data)
        // When ADDING a new association, preserve existing disciplines
        let newFormData = {
            ...prev,
            associations: newAssociations,
            primaryAffiliates: newPrimaryAffiliates,
        };
        
        // If unchecking an association, filter out disciplines that were ONLY for that association
        if (!isChecked) {
            const remainingAssocIds = Object.keys(newAssociations);
            newFormData.disciplines = (prev.disciplines || []).filter(disc => {
                // Keep disciplines that have at least one remaining association selected
                const discAssocIds = Object.keys(disc.selectedAssociations || {}).filter(
                    id => disc.selectedAssociations[id]
                );
                return discAssocIds.some(id => remainingAssocIds.includes(id));
            });
        }

        if (!isChecked) {
            if (newFormData.subAssociationSelections) {
                delete newFormData.subAssociationSelections[assocId];
                if (assocId.toLowerCase() === 'nsba' && newFormData.subAssociationSelections.nsba) {
                    delete newFormData.subAssociationSelections.nsba;
                }
            }
        }
      
        const openShowId = allAssociations.find(a => a.id.toLowerCase() === 'open-show')?.id;
        if (openShowId && newAssociations[openShowId] && Object.keys(newAssociations).length > 1) {
            newFormData.showType = 'multi-breed';
        } else if (openShowId && newAssociations[openShowId]) {
            newFormData.showType = 'open-unaffiliated';
        } else if (Object.keys(newAssociations).length > 0) {
            newFormData.showType = 'multi-breed';
        } else {
            newFormData.showType = '';
        }

        if (onShowTypeChange) {
            onShowTypeChange();
        }

        return newFormData;
    });
  };

  const getShowNameLabel = () => {
    if (context === 'hub') {
        if (formData.usageType === 'clinic') return "Clinic Name";
        if (formData.usageType === 'educational') return "Topic / Lesson Name";
        return "Purchase Name";
    }
    if (context === 'pbb') return "Horse Show Name";
    return "Horse Show Name";
  };

  const getShowNamePlaceholder = () => {
     if (context === 'hub') {
        if (formData.usageType === 'clinic') return "E.g., Spring Tune-Up Clinic";
        if (formData.usageType === 'educational') return "E.g., Horsemanship Fundamentals";
        return "E.g., Individual Pattern Purchase";
    }
    if (context === 'pbb') return "E.g., Summer Sizzler Pattern Book";
    return "E.g., Summer Sizzler";
  };

  const getTitle = () => {
    if (context === 'pbb') return "Step 1: Book & Association Details";
    if (context === 'showInfo') return "Select Association / Affiliation";
    if (context === 'hub') return "Step 1: Select Association";
    return "Step 1: Show Structure";
  };

  const getDescription = () => {
    if (context === 'hub') return "Choose which governing body's patterns you're looking for.";
    if (context === 'pbb') return "Name your pattern book and select the affiliated associations.";
    if (context === 'showInfo') return "Select all associations that are part of this show. This will help populate the class list.";
    return "Start by giving your show a name, then choose the sanctioning bodies. This will help populate the class list.";
  };

  const allAssociations = associationsData || [];
  const leftAssociations = allAssociations
    .filter(a => a.position === 'left')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const rightAssociations = allAssociations
    .filter(a => a.position === 'right')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{getTitle()}</CardTitle>
        <CardDescription className="text-sm">{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {context !== 'hub' && (
          <div className="space-y-1.5">
            <Label htmlFor="showName" className="font-semibold">{getShowNameLabel()}</Label>
            <Input
                id="showName"
                placeholder={getShowNamePlaceholder()}
                value={formData.showName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, showName: e.target.value }))}
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label className="font-semibold">Select all hosted associations:</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 border-l-4 border-red-500 pl-3">
              {leftAssociations.map(assoc => (
                <AssociationCheckbox
                  key={assoc.id}
                  association={assoc}
                  isSelected={!!formData.associations?.[assoc.id]}
                  onSelect={handleAssociationSelection}
                  formData={formData}
                  setFormData={setFormData}
                  allAssociations={allAssociations}
                />
              ))}
            </div>
            <div className="space-y-1.5 border-l-4 border-blue-500 pl-3">
              {rightAssociations.map(assoc => (
                <AssociationCheckbox
                  key={assoc.id}
                  association={assoc}
                  isSelected={!!formData.associations?.[assoc.id]}
                  onSelect={handleAssociationSelection}
                  formData={formData}
                  setFormData={setFormData}
                  allAssociations={allAssociations}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </motion.div>
  );
};