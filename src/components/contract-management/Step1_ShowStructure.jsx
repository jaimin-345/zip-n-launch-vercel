import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Calendar, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';

export const Step1_ShowStructure = ({ formData, setFormData, shows, isLoading }) => {
  const handleShowSelect = (showId) => {
    const selectedShow = shows.find(s => s.id === showId);
    if (selectedShow) {
      const projectData = selectedShow.project_data || {};
      setFormData(prev => ({
        ...prev,
        selectedShow: selectedShow,
        showDetails: {
          name: selectedShow.project_name || projectData.showName || 'Untitled Show',
          startDate: projectData.startDate,
          endDate: projectData.endDate,
          venue: projectData.venueName || '',
          venueAddress: projectData.venueAddress || '',
          associations: projectData.associations || {},
          showType: projectData.showType || 'multi-day',
        },
        officials: projectData.officials || [],
        staff: projectData.staff || [],
        associationJudges: projectData.associationJudges || {},
      }));
    }
  };

  const showDetails = formData.showDetails;

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
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Show Details
              </h4>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {showDetails.name}</p>
                <p><span className="text-muted-foreground">Type:</span> {showDetails.showType}</p>
              </div>
            </div>

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

            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Venue
              </h4>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {showDetails.venue || 'Not specified'}</p>
                <p><span className="text-muted-foreground">Address:</span> {showDetails.venueAddress || 'Not specified'}</p>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Associations
              </h4>
              <div className="space-y-2 text-sm">
                {Object.keys(showDetails.associations || {}).length > 0 ? (
                  Object.keys(showDetails.associations).map(assocId => (
                    <p key={assocId}>{assocId}</p>
                  ))
                ) : (
                  <p className="text-muted-foreground">No associations selected</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </motion.div>
  );
};
