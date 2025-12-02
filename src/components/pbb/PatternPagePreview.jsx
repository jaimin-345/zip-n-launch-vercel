import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';
import patternDiagram from '@/assets/pattern-diagram-sample.png';

const PatternPagePreview = ({ isOpen, onClose, discipline, associationsData }) => {
  const [currentPage, setCurrentPage] = React.useState(0);

  // Reset to first page when dialog opens - MUST be before any conditional returns
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
    }
  }, [isOpen]);

  // Early return AFTER all hooks
  if (!discipline) return null;

  const groups = discipline.patternGroups || [];
  const totalPages = groups.length;

  // Get association full name
  const association = associationsData?.find(a => a.id === discipline.association_id);
  const associationFullName = association?.name || discipline.association_id;

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
          {/* Header - Association Name */}
          <div className="border-b-4 border-red-500 pb-3 mb-6 text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-500">
              {associationFullName}
            </h1>
          </div>

          {/* Discipline Name */}
          <div className="mb-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {discipline.name.toUpperCase()}
            </h2>
          </div>

          {/* Group Data - Show actual divisions */}
          {currentGroup && currentGroup.divisions && (
            <div className="mb-6 space-y-1">
              {currentGroup.divisions.map((div, idx) => (
                <p key={idx} className="text-base text-gray-800 dark:text-gray-200">
                  {div.division}
                </p>
              ))}
            </div>
          )}

          {/* Pattern Diagram */}
          <div className="my-8 flex items-center justify-center">
            <img 
              src={patternDiagram} 
              alt="Pattern Diagram" 
              className="max-w-full h-auto rounded-lg"
            />
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-700 text-center text-xs text-gray-600 dark:text-gray-400">
            {discipline.name} Patterns 2025 – Page {currentPage + 1}
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
