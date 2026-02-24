import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GripVertical, FileText, Eye, Pin } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

const SortablePatternSlot = ({
  id,
  level,
  pattern,
  onFileDrop,
  onRemove,
  onHover,
  onLeave,
  onPreview,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `slot-${id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const onDrop = React.useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileDrop(id, acceptedFiles[0]);
    }
  }, [id, onFileDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative border-2 transition-all duration-200",
        isDragging ? "border-primary shadow-lg" : "border-border",
        pattern ? "bg-card" : "bg-muted/20"
      )}
      onMouseEnter={() => onHover({ id, type: 'hierarchy', file: pattern?.file, dataUrl: pattern?.dataUrl })}
      onMouseLeave={onLeave}
    >
      <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-grab"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
          <CardTitle className="text-base font-semibold">{level.title}</CardTitle>
          <span className="text-sm text-muted-foreground ml-2">{level.description}</span>
        </div>
        {pattern && (
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPreview({ id, type: 'hierarchy', file: pattern?.file, dataUrl: pattern?.dataUrl, name: pattern?.name })}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(id)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3">
        <div
          {...getRootProps()}
          className={cn(
            "flex items-center justify-center p-4 border-2 border-dashed rounded-md text-center transition-colors min-h-[80px]",
            isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
            pattern && "border-transparent hover:border-transparent"
          )}
        >
          <input {...getInputProps()} />
          {pattern ? (
            <div className="flex items-center space-x-2 text-primary-foreground bg-primary/80 px-3 py-2 rounded-md">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{pattern.file.name}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Drop pattern here" : "Drag a pattern here or click to upload"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SortablePatternSlot;