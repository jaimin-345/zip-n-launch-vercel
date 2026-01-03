import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Calendar, MapPin, Users, Award, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export const Step1_ShowStructure = ({ formData, setFormData, shows, isLoading }) => {
  const handleShowSelect = (showId) => {
    const selectedShow = shows.find(s => s.id === showId);
    if (selectedShow) {
      const projectData = selectedShow.project_data || {};
      
      // Get associations data
      const associations = projectData.associations || {};
      const selectedAssociations = Object.keys(associations).filter(key => associations[key]?.selected);
      
      setFormData(prev => ({
        ...prev,
        selectedShow: selectedShow,
        showDetails: {
          name: selectedShow.project_name || projectData.showName || 'Untitled Show',
          startDate: projectData.startDate,
          endDate: projectData.endDate,
          venue: projectData.venueName || '',
          venueAddress: projectData.venueAddress || '',
          associations: associations,
          selectedAssociations: selectedAssociations,
          showType: projectData.showType || 'multi-day',
          city: projectData.city || '',
          state: projectData.state || '',
        },
        officials: projectData.officials || [],
        staff: projectData.staff || [],
        associationJudges: projectData.associationJudges || {},
      }));
    }
  };

  const showDetails = formData.showDetails;

  // Get selected associations for display
  const getSelectedAssociationNames = () => {
    if (!showDetails?.associations) return [];
    return Object.entries(showDetails.associations)
      .filter(([_, data]) => data?.selected)
      .map(([id, data]) => data.name || id);
  };

  // Count officials and judges
  const getPersonnelCount = () => {
    const judgesCount = Object.values(formData.associationJudges || {})
      .reduce((acc, data) => acc + (data.judges?.length || 0), 0);
    const officialsCount = (formData.officials || []).length;
    return { judgesCount, officialsCount, total: judgesCount + officialsCount };
  };

  const personnelCount = getPersonnelCount();
  const selectedAssociations = getSelectedAssociationNames();

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
          Step 1: Show Structure
        </CardTitle>
        <CardDescription>
          Select a show to generate contracts for its officials and staff.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        <div className="space-y-2">
          <Label>Select Show</Label>
          <Select
            value={formData.selectedShow?.id || ''}
            onValueChange={handleShowSelect}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "Loading shows..." : "Select a show..."} />
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

        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Show Overview Banner */}
            <div className="p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold text-lg">{showDetails.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {showDetails.startDate && showDetails.endDate
                      ? `${format(new Date(showDetails.startDate), 'MMM d')} - ${format(new Date(showDetails.endDate), 'MMM d, yyyy')}`
                      : 'Dates not set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Show Details Card */}
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Show Details
                </h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {showDetails.name}</p>
                  <p><span className="text-muted-foreground">Type:</span> <Badge variant="secondary" className="capitalize">{showDetails.showType}</Badge></p>
                </div>
              </div>

              {/* Dates Card */}
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Dates
                </h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Start:</span>{' '}
                    {showDetails.startDate ? format(new Date(showDetails.startDate), 'PPP') : 'Not set'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">End:</span>{' '}
                    {showDetails.endDate ? format(new Date(showDetails.endDate), 'PPP') : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Venue Card */}
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Venue
                </h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {showDetails.venue || 'Not specified'}</p>
                  <p><span className="text-muted-foreground">Address:</span> {showDetails.venueAddress || 'Not specified'}</p>
                  {(showDetails.city || showDetails.state) && (
                    <p><span className="text-muted-foreground">Location:</span> {[showDetails.city, showDetails.state].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              </div>

              {/* Associations Card */}
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  Associations
                </h4>
                <div className="space-y-2 text-sm">
                  {selectedAssociations.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedAssociations.map((assoc, idx) => (
                        <Badge key={idx} variant="outline">{assoc}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No associations selected</p>
                  )}
                </div>
              </div>

              {/* Personnel Summary Card */}
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3 md:col-span-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Personnel Summary
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-2 bg-background rounded-md">
                    <p className="text-2xl font-bold text-primary">{personnelCount.judgesCount}</p>
                    <p className="text-muted-foreground">Judges</p>
                  </div>
                  <div className="text-center p-2 bg-background rounded-md">
                    <p className="text-2xl font-bold text-blue-500">{personnelCount.officialsCount}</p>
                    <p className="text-muted-foreground">Staff</p>
                  </div>
                  <div className="text-center p-2 bg-background rounded-md">
                    <p className="text-2xl font-bold text-green-500">{personnelCount.total}</p>
                    <p className="text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </motion.div>
  );
};
