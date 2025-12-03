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

  // Get associations for current group based on divisions only
  const getGroupAssociations = (group) => {
    if (!group?.divisions?.length) return [];
    
    // Extract unique association IDs from the group's divisions ONLY
    const groupAssociationIds = [...new Set(
      group.divisions
        .map(div => div.association_id)
        .filter(Boolean)
    )];
    
    // Only return associations that are actually in this group's divisions
    // Do NOT fall back to discipline-level associations
    return groupAssociationIds
      .map(id => associationsData?.find(a => a.id === id)?.name || id)
      .filter(Boolean);
  };

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
          {/* Header - Association Name(s) for this group */}
          <div className="border-b-4 border-red-500 pb-3 mb-6 text-center">
            {getGroupAssociations(currentGroup).map((assocName, idx) => (
              <h1 key={idx} className="text-2xl font-bold text-red-600 dark:text-red-500">
                {assocName}
              </h1>
            ))}
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

          {/* Pattern Steps as Text */}
          <div className="mt-6 space-y-1 text-sm text-gray-800 dark:text-gray-200">
            <p>1. Lope left lead over poles</p>
            <p>2. Jog trot; poles</p>
            <p>3. Jog serpentine over poles</p>
            <p>4. Lope right lead over poles</p>
            <p>5. Extended trot over 3 poles</p>
            <p>6. Stop; back through "L" back to gate</p>
            <p>7. Walk gate with right hand, close gate</p>
            <p>8. Lope left lead over poles</p>
            <p>9. Walk over bridge</p>
            <p>10. Extended jog to walk over</p>
            <p>11. Walk over poles</p>
            <p>12. Lope right lead over poles</p>
            <p className="font-semibold mt-2">Pattern Complete</p>
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
