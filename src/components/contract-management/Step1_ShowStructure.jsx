import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

// Default associations list matching the image layout
const defaultAssociations = [
  // Left column
  { id: 'NSBA', name: 'NSBA - National Snaffle Bit Association', column: 'left' },
  { id: 'AQHA', name: 'AQHA - American Quarter Horse Association', column: 'left' },
  { id: 'APHA', name: 'APHA - American Paint Horse Association', column: 'left' },
  { id: 'ApHC', name: 'ApHC - Appaloosa Horse Club', column: 'left' },
  { id: 'PtHA', name: 'PtHA - Pinto Horse Association of America', column: 'left' },
  { id: 'ABRA', name: 'ABRA - American Buckskin Registry Association', column: 'left' },
  { id: 'PHBA', name: 'PHBA - Palomino Horse Breeders of America', column: 'left' },
  { id: 'IBHA', name: 'IBHA - International Buckskin Horse Association', column: 'left' },
  { id: 'POAC', name: 'POAC - Pony of the Americas Club', column: 'left' },
  // Right column
  { id: 'AHA', name: 'AHA - Arabian Horse Association', column: 'right' },
  { id: '4-H', name: '4-H', column: 'right' },
  { id: 'Open', name: 'Open Shows', column: 'right' },
  { id: 'VRH', name: 'VRH Ranch Horse', column: 'right' },
  { id: 'SHOT', name: 'Shot - Stock Horses Texas', column: 'right' },
  { id: 'NRHA', name: 'NRHA - National Reining Horse Association', column: 'right' },
  { id: 'NRCHA', name: 'NRCHA - National Reined Cow Horse Association', column: 'right' },
];

export const Step1_ShowStructure = ({ formData, setFormData, existingProjects = [] }) => {
  const [associations, setAssociations] = useState(defaultAssociations);

  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        const { data, error } = await supabase
          .from('associations')
          .select('id, name, abbreviation')
          .order('sort_order', { ascending: true });
        
        if (!error && data && data.length > 0) {
          const dbAssociations = data.map((a, idx) => ({
            id: a.id,
            name: a.name,
            column: idx < Math.ceil(data.length / 2) ? 'left' : 'right'
          }));
          setAssociations(dbAssociations);
        }
      } catch (err) {
        console.error('Error fetching associations:', err);
      }
    };
    fetchAssociations();
  }, []);

  const handleShowNumberChange = (value) => {
    setFormData(prev => ({ ...prev, showNumber: value }));

    if (!value.trim() || existingProjects.length === 0) return;

    const match = existingProjects.find(p =>
      p.project_data?.showNumber && p.project_data.showNumber.toString() === value.trim()
    );

    if (match?.project_data) {
      const pd = match.project_data;
      let assocIds = [];
      if (pd.associations && typeof pd.associations === 'object') {
        assocIds = Object.keys(pd.associations).filter(key => pd.associations[key]);
      }
      setFormData(prev => ({
        ...prev,
        showNumber: value,
        showName: pd.showName || match.project_name || prev.showName,
        selectedAssociations: assocIds.length > 0 ? assocIds : prev.selectedAssociations,
        linkedProjectId: match.id,
      }));
    }
  };

  const handleShowNameChange = (value) => {
    setFormData(prev => ({
      ...prev,
      showName: value
    }));
  };

  const handleAssociationToggle = (assocId, checked) => {
    setFormData(prev => {
      const currentSelected = prev.selectedAssociations || [];
      const newSelected = checked
        ? [...currentSelected, assocId]
        : currentSelected.filter(id => id !== assocId);
      
      return {
        ...prev,
        selectedAssociations: newSelected
      };
    });
  };

  const selectedAssociations = formData.selectedAssociations || [];
  const showName = formData.showName || '';
  const showNumber = formData.showNumber || '';

  // Split associations into columns
  const leftColumn = associations.filter(a => a.column === 'left');
  const rightColumn = associations.filter(a => a.column === 'right');

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader className="px-0 pt-0">
        <CardTitle>Select Association / Affiliation</CardTitle>
        <CardDescription>
          Select all associations that are part of this show. This will help populate the class list.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        {/* Horse Show Name + Show Number side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="horse-show-name" className="font-semibold">Show Name</Label>
            <Input
              id="horse-show-name"
              value={showName}
              onChange={(e) => handleShowNameChange(e.target.value)}
              placeholder="e.g., Summer Sizzle"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="show-number" className="font-semibold">Show Number</Label>
            <Input
              id="show-number"
              value={showNumber}
              onChange={(e) => handleShowNumberChange(e.target.value)}
              placeholder="E.g., 1009"
              className="bg-background"
            />
            {formData.linkedProjectId && (
              <p className="text-xs text-green-600">Linked to existing project</p>
            )}
          </div>
        </div>

        {/* Associations Grid */}
        <div className="space-y-2">
          <Label className="font-semibold">Select all hosted associations:</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left Column */}
            <div className="space-y-1.5 border-l-4 border-red-500 pl-3">
              {leftColumn.map(assoc => (
                <div
                  key={assoc.id}
                  className={cn(
                    "rounded-md border bg-card transition-all duration-200",
                    selectedAssociations.includes(assoc.id)
                      ? "border-primary ring-1 ring-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div
                    className="flex items-center space-x-3 p-3 cursor-pointer"
                    onClick={() => handleAssociationToggle(assoc.id, !selectedAssociations.includes(assoc.id))}
                  >
                    <Checkbox
                      id={`assoc-${assoc.id}`}
                      checked={selectedAssociations.includes(assoc.id)}
                      onCheckedChange={(checked) => handleAssociationToggle(assoc.id, checked)}
                    />
                    <Label
                      htmlFor={`assoc-${assoc.id}`}
                      className="font-normal cursor-pointer flex-grow"
                    >
                      {assoc.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column */}
            <div className="space-y-1.5 border-l-4 border-blue-500 pl-3">
              {rightColumn.map(assoc => (
                <div
                  key={assoc.id}
                  className={cn(
                    "rounded-md border bg-card transition-all duration-200",
                    selectedAssociations.includes(assoc.id)
                      ? "border-primary ring-1 ring-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div
                    className="flex items-center space-x-3 p-3 cursor-pointer"
                    onClick={() => handleAssociationToggle(assoc.id, !selectedAssociations.includes(assoc.id))}
                  >
                    <Checkbox
                      id={`assoc-${assoc.id}`}
                      checked={selectedAssociations.includes(assoc.id)}
                      onCheckedChange={(checked) => handleAssociationToggle(assoc.id, checked)}
                    />
                    <Label
                      htmlFor={`assoc-${assoc.id}`}
                      className="font-normal cursor-pointer flex-grow"
                    >
                      {assoc.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </motion.div>
  );
};
