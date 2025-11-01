import React from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Tag, FileUp, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import SortablePatternSlot from '@/components/pattern-upload/SortablePatternSlot';
import PatternPreview from '@/components/pattern-upload/PatternPreview';
import PdfStagingArea from '@/components/pattern-upload/PdfStagingArea';

const PatternUploader = ({
  hierarchyOrder,
  setHierarchyOrder,
  patterns,
  handleFileDrop,
  handleRemovePattern,
  onHover,
  onLeave,
  onPreview,
  hoveredPattern,
  stagedPdfs,
  handlePdfSplit,
  assignStagedPdf,
  removeStagedPdf,
  pinnedPattern,
  handlePinPattern,
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id.toString().startsWith('staged-') && over.id.toString().startsWith('slot-')) {
      const stagedPdfId = active.id.replace('staged-', '');
      const slotId = over.id.replace('slot-', '');
      assignStagedPdf(stagedPdfId, slotId);
      return;
    }

    if (active.id.toString().startsWith('slot-') && over.id.toString().startsWith('slot-')) {
      const activeId = active.id.replace('slot-', '');
      const overId = over.id.replace('slot-', '');
      if (activeId !== overId) {
        setHierarchyOrder((items) => {
          const oldIndex = items.findIndex((item) => item.id === activeId);
          const newIndex = items.findIndex((item) => item.id === overId);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    }
  };

  const currentPreviewItem = pinnedPattern || hoveredPattern;

  const hierarchyInfoText = "Group divisions/classes that will share the same pattern. The hierarchy order sets the pattern order in your book, and the division order within a group sets the title block display. This also helps generate correct score sheets.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
            <Tag className="mr-2 h-6 w-6 text-primary" /> 
            Upload Patterns & Tag Divisions/Levels
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="text-sm w-80">{hierarchyInfoText}</PopoverContent>
            </Popover>
        </CardTitle>
        <CardDescription>Drag and drop your PDF patterns, then assign suitable divisions and levels for each one. Hover to preview.</CardDescription>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3 relative">
              <SortableContext items={hierarchyOrder.map(h => `slot-${h.id}`)} strategy={verticalListSortingStrategy}>
                {hierarchyOrder.map(level => (
                  <SortablePatternSlot
                    key={level.id}
                    id={level.id}
                    level={level}
                    pattern={patterns[level.id]}
                    onFileDrop={handleFileDrop}
                    onRemove={handleRemovePattern}
                    onHover={onHover}
                    onLeave={onLeave}
                    onPreview={onPreview}
                  />
                ))}
              </SortableContext>
              <PatternPreview 
                previewItem={currentPreviewItem} 
                hierarchyOrder={hierarchyOrder}
                onAssign={assignStagedPdf}
                isStaged={!!currentPreviewItem && !!stagedPdfs.find(p => p.id === currentPreviewItem.id)}
                onPin={handlePinPattern}
                isPinned={!!pinnedPattern && pinnedPattern.id === currentPreviewItem?.id}
              />
            </div>
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="flex items-center text-lg"><FileUp className="mr-2 h-5 w-5" /> PDF Staging</CardTitle>
                  <CardDescription className="text-xs">Upload a multi-page PDF to split it into individual patterns.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <PdfStagingArea 
                    stagedPdfs={stagedPdfs} 
                    onPdfSplit={handlePdfSplit} 
                    onRemove={removeStagedPdf}
                    onPreview={onPreview}
                    onHover={onHover}
                    onLeave={onLeave}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </DndContext>
      </CardContent>
    </Card>
  );
};

export default PatternUploader;