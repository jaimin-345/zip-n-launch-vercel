import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo, Redo, Save, FileText } from 'lucide-react';

const ShowBillToolbar = ({ showName, startDate, endDate, undoStack, redoStack, onUndo, onRedo, onSave, onGeneratePdf }) => {
  return (
    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm -mx-6 px-6 py-3 border-b mb-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{showName || 'Untitled Show'}</h2>
          {startDate && (
            <p className="text-sm text-muted-foreground">
              {new Date(startDate + 'T00:00:00').toLocaleDateString()} - {endDate && new Date(endDate + 'T00:00:00').toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onUndo} disabled={undoStack.length === 0}>
            <Undo className="h-4 w-4 mr-2" />Undo
          </Button>
          <Button variant="outline" size="sm" onClick={onRedo} disabled={redoStack.length === 0}>
            <Redo className="h-4 w-4 mr-2" />Redo
          </Button>
          <Button variant="outline" size="sm" onClick={onGeneratePdf}>
            <FileText className="h-4 w-4 mr-2" />Generate PDF
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />Save Schedule
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShowBillToolbar;
