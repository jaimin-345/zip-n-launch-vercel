import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ShieldCheck, Calendar, Users, FileText, Palette, Upload, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const ReviewItem = ({ icon, title, children }) => (
  <div className="flex items-start space-x-4">
    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h4 className="font-semibold text-md">{title}</h4>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  </div>
);

export const Step8_Review = ({ pbbData, onBack, onSubmit }) => {
  const {
    showName,
    showType,
    associations,
    disciplines,
    startDate,
    endDate,
    venueName,
    venueAddress,
    officials,
    sponsors,
    coverPageOption,
    layoutSelection,
    patternSelections,
  } = pbbData;

  const getAssociationNames = () => {
    if (!associations) return 'N/A';
    return Object.keys(associations).filter(key => associations[key]).join(', ') || 'None';
  };

  const totalPatternsSelected = () => {
    if (!patternSelections) return 0;
    return Object.values(patternSelections).reduce((total, disc) => total + Object.keys(disc).length, 0);
  };

  return (
    <motion.div key="step8-review" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <CardHeader>
        <CardTitle>Step 10: Review & Finalize</CardTitle>
        <CardDescription>Please review all the details below before generating your pattern book.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReviewItem icon={<ShieldCheck className="w-5 h-5" />} title="Show Structure">
            <p><strong>Name:</strong> {showName || 'N/A'}</p>
            <p><strong>Type:</strong> {showType || 'N/A'}</p>
            <p><strong>Associations:</strong> {getAssociationNames()}</p>
          </ReviewItem>

          <ReviewItem icon={<Calendar className="w-5 h-5" />} title="Dates & Location">
            <p><strong>Dates:</strong> {startDate ? `${format(new Date(startDate), 'PPP')} to ${endDate ? format(new Date(endDate), 'PPP') : 'N/A'}` : 'N/A'}</p>
            <p><strong>Venue:</strong> {venueName || 'N/A'}</p>
            <p><strong>Address:</strong> {venueAddress || 'N/A'}</p>
          </ReviewItem>

          <ReviewItem icon={<FileText className="w-5 h-5" />} title="Disciplines & Patterns">
            <p><strong>Disciplines:</strong> {(disciplines || []).length} selected</p>
            <p><strong>Patterns Assigned:</strong> {totalPatternsSelected()} patterns</p>
          </ReviewItem>

          <ReviewItem icon={<Users className="w-5 h-5" />} title="Personnel & Sponsors">
            <p><strong>Officials:</strong> {(officials || []).length} added</p>
            <p><strong>Sponsors:</strong> {(sponsors || []).length} added</p>
          </ReviewItem>

          <ReviewItem icon={<Palette className="w-5 h-5" />} title="Design & Layout">
            <p><strong>Cover Page:</strong> {coverPageOption || 'N/A'}</p>
            <p><strong>Book Layout:</strong> {layoutSelection || 'N/A'}</p>
          </ReviewItem>
          
          <ReviewItem icon={<DollarSign className="w-5 h-5" />} title="Customizations & Fees">
            <p><strong>Custom Classes:</strong> {(disciplines || []).filter(d => d.isCustom).length}</p>
            <p><strong>Estimated Custom Fees:</strong> ${((disciplines || []).filter(d => d.isCustom).length * 50).toFixed(2)}</p>
          </ReviewItem>
        </div>
      </CardContent>
    </motion.div>
  );
};