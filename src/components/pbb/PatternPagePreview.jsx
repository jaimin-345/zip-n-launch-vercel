import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';

const PatternPagePreview = ({ isOpen, onClose, discipline, associationsData }) => {
  const [currentPage, setCurrentPage] = React.useState(0);

  if (!discipline) return null;

  const groups = discipline.patternGroups || [];
  const totalPages = groups.length;

  // Get association full name
  const association = associationsData?.find(a => a.id === discipline.associationId);
  const associationFullName = association?.name || discipline.associationId;

  // Format discipline date
  const disciplineDate = discipline.date 
    ? format(parseLocalDate(discipline.date), 'MM-dd-yyyy')
    : '';

  const currentGroup = groups[currentPage];

  const handlePrevious = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  // Reset to first page when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Pattern Book Preview</span>
            <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Pattern Page */}
        <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-8 rounded-lg shadow-lg">
          {/* Header */}
          <div className="border-b-2 border-gray-300 dark:border-gray-700 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {associationFullName}
            </h2>
          </div>

          {/* Discipline Info */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {discipline.name.toUpperCase()} {disciplineDate && `- ${disciplineDate}`}
            </h3>
            
            {currentGroup && (
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {currentGroup.divisions?.map((div, idx) => (
                  <p key={idx}>
                    {div.classNumber} {div.divisionName} {div.divisionLevel}
                  </p>
                ))}
                {currentGroup.divisions && currentGroup.divisions.length > 1 && (
                  <p className="text-xs italic mt-2">
                    Classes {currentGroup.divisions.map(d => d.classNumber).join(', ')} will run concurrently
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pattern Diagram Placeholder */}
          <div className="my-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-12 border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-center">
              <div className="text-6xl mb-4">📐</div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Pattern Diagram
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Pattern visualization will appear here
              </p>
            </div>
          </div>

          {/* Pattern Steps Placeholder */}
          <div className="border-t-2 border-gray-300 dark:border-gray-700 pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <p className="mb-1">1. First maneuver description</p>
                <p className="mb-1">2. Second maneuver description</p>
                <p className="mb-1">3. Third maneuver description</p>
                <p className="mb-1">4. Fourth maneuver description</p>
                <p className="mb-1">5. Fifth maneuver description</p>
                <p className="mb-1">6. Sixth maneuver description</p>
              </div>
              <div>
                <p className="mb-1">7. Seventh maneuver description</p>
                <p className="mb-1">8. Eighth maneuver description</p>
                <p className="mb-1">9. Ninth maneuver description</p>
                <p className="mb-1">10. Tenth maneuver description</p>
                <p className="mb-1">11. Eleventh maneuver description</p>
                <p className="mb-1">12. Twelfth maneuver description</p>
              </div>
            </div>
            <p className="font-semibold mt-4 text-gray-900 dark:text-gray-100">Pattern Complete</p>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-700 text-center text-xs text-gray-600 dark:text-gray-400">
            {associationFullName} {discipline.name} Patterns 2025 – Page {currentPage + 1}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Group {currentPage + 1} of {totalPages}
          </span>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentPage === totalPages - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatternPagePreview;
