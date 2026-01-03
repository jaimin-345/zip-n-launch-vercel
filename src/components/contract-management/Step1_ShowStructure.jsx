import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

// Default associations list
const defaultAssociations = [
  { id: 'nsba', name: 'NSBA - National Snaffle Bit Association' },
  { id: 'aqha', name: 'AQHA - American Quarter Horse Association' },
  { id: 'apha', name: 'APHA - American Paint Horse Association' },
  { id: 'aphc', name: 'ApHC - Appaloosa Horse Club' },
  { id: 'ptha', name: 'PtHA - Pinto Horse Association of America' },
  { id: 'abra', name: 'ABRA - American Buckskin Registry Association' },
  { id: 'phba', name: 'PHBA - Palomino Horse Breeders of America' },
  { id: 'ibha', name: 'IBHA - International Buckskin Horse Association' },
  { id: 'poac', name: 'POAC - Pony of the Americas Club' },
  { id: 'aha', name: 'AHA - Arabian Horse Association' },
  { id: '4h', name: '4-H' },
  { id: 'open_shows', name: 'Open Shows' },
  { id: 'vrh', name: 'VRH Ranch Horse' },
  { id: 'shot', name: 'Shot - Stock Horses Texas' },
  { id: 'nrha', name: 'NRHA - National Reining Horse Association' },
  { id: 'nrcha', name: 'NRCHA - National Reined Cow Horse Association' },
];

export const Step1_ShowStructure = ({ formData, setFormData, shows, isLoading }) => {
  const [associations, setAssociations] = useState(defaultAssociations);

  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        const { data, error } = await supabase
          .from('associations')
          .select('id, name, abbreviation')
          .order('sort_order', { ascending: true });
        
        if (!error && data && data.length > 0) {
          setAssociations(data.map(a => ({
            id: a.id,
            name: a.abbreviation ? `${a.abbreviation} - ${a.name}` : a.name
          })));
        }
      } catch (err) {
        console.error('Error fetching associations:', err);
      }
    };
    fetchAssociations();
  }, []);

  const handleShowSelect = (showId) => {
    const selectedShow = shows.find(s => s.id === showId);
    if (selectedShow) {
      const projectData = selectedShow.project_data || {};
      
      // Get associations data
      const assocData = projectData.associations || {};
      const selectedAssociations = Object.keys(assocData).filter(key => assocData[key]?.selected || assocData[key] === true);
      
      // Get officials from showDetails (nested: { assocId: { roleId: [members] } })
      const showDetailsData = projectData.showDetails || {};
      const officialsData = showDetailsData.officials || projectData.officials || {};
      
      setFormData(prev => ({
        ...prev,
        selectedShow: selectedShow,
        showName: selectedShow.project_name || projectData.showName || '',
        selectedAssociations: selectedAssociations,
        showDetails: {
          name: selectedShow.project_name || projectData.showName || 'Untitled Show',
          startDate: projectData.startDate,
          endDate: projectData.endDate,
          venue: projectData.venueName || '',
          venueAddress: projectData.venueAddress || '',
          associations: assocData,
          showType: projectData.showType || 'multi-day',
          city: projectData.city || '',
          state: projectData.state || '',
          officials: officialsData,
        },
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

  // Split associations into two columns
  const midPoint = Math.ceil(associations.length / 2);
  const leftColumn = associations.slice(0, midPoint);
  const rightColumn = associations.slice(midPoint);

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Select Association / Affiliation
        </CardTitle>
        <CardDescription>
          Select all associations that are part of this show. This will help populate the class list.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        {/* Show Selector - Optional, to load existing show data */}
        <div className="space-y-2">
          <Label>Load from existing show (optional)</Label>
          <Select
            value={formData.selectedShow?.id || ''}
            onValueChange={handleShowSelect}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "Loading shows..." : "Select a show to load data..."} />
            </SelectTrigger>
            <SelectContent>
              {shows.map(show => (
                <SelectItem key={show.id} value={show.id}>
                  {show.project_name || show.project_data?.showName || 'Untitled Show'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Horse Show Name */}
        <div className="space-y-2">
          <Label htmlFor="horse-show-name">Horse Show Name</Label>
          <Input
            id="horse-show-name"
            value={showName}
            onChange={(e) => handleShowNameChange(e.target.value)}
            placeholder="E.g., Summer Sizzler"
            className="bg-background"
          />
        </div>

        {/* Associations Grid */}
        <div className="space-y-2">
          <Label>Select all hosted associations:</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-2">
              {leftColumn.map(assoc => (
                <div
                  key={assoc.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-md border cursor-pointer transition-all",
                    selectedAssociations.includes(assoc.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
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
              ))}
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              {rightColumn.map(assoc => (
                <div
                  key={assoc.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-md border cursor-pointer transition-all",
                    selectedAssociations.includes(assoc.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
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
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </motion.div>
  );
};
