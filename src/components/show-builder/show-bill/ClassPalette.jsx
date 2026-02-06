import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Search, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const DraggablePaletteClass = ({ classItem, associationsData }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${classItem.id}`,
    data: { origin: 'palette', classItem },
  });

  const assoc = associationsData?.find(a => a.id === classItem.assocId);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 p-2 border rounded-lg bg-background touch-none cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-grow min-w-0">
        <p className="text-sm font-semibold truncate">{classItem.name}</p>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {assoc && (
            <Badge variant={assoc.color || 'secondary'} className="text-xs px-1 py-0">
              {assoc.abbreviation || assoc.name}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

const ClassPalette = ({ allClassItems, unplacedClasses, associationsData }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClasses = useMemo(() => {
    if (!searchTerm) return unplacedClasses;
    return unplacedClasses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [unplacedClasses, searchTerm]);

  const groupedClasses = useMemo(() => {
    const groups = {};
    filteredClasses.forEach(cls => {
      const key = cls.disciplineName || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(cls);
    });
    return groups;
  }, [filteredClasses]);

  const placedCount = allClassItems.length - unplacedClasses.length;

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-1">Class Palette</h3>
      <p className="text-xs text-muted-foreground mb-3">
        {placedCount} of {allClassItems.length} placed
      </p>

      <div className="relative mb-3">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search classes..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Label className="text-sm font-medium text-muted-foreground mb-2">
        Unplaced Classes ({unplacedClasses.length})
      </Label>

      <ScrollArea className="flex-grow border rounded-lg p-2 bg-muted/30">
        {Object.keys(groupedClasses).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {unplacedClasses.length === 0 ? 'All classes placed!' : 'No matches found'}
          </p>
        )}
        <div className="space-y-3">
          {Object.entries(groupedClasses).map(([discipline, classes]) => (
            <div key={discipline}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">{discipline}</p>
              <div className="space-y-1.5">
                {classes.map(cls => (
                  <DraggablePaletteClass key={cls.id} classItem={cls} associationsData={associationsData} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ClassPalette;
