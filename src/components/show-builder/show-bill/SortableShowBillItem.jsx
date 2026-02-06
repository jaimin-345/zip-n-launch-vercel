import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Pencil, Trash2, Coffee, Tractor, Type, Star, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Class Box: visible container with big number ───
const ClassBoxDisplay = ({ item, allClassItems, associationsData, onRemoveClassFromBox }) => {
  const classDetails = (item.classes || []).map(classId =>
    allClassItems.find(c => c.id === classId)
  ).filter(Boolean);

  const { setNodeRef, isOver } = useDroppable({
    id: `classbox-drop-${item.id}`,
    data: { origin: 'classbox-drop', classBoxId: item.id },
  });

  return (
    <div className="w-full">
      {/* Box header with number and title */}
      <div className="flex items-center gap-3 mb-2">
        <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground text-lg font-bold shrink-0 shadow-sm">
          {item.number || '?'}
        </span>
        <div className="min-w-0 flex-grow">
          <p className="font-bold text-base">{item.title || 'Untitled Box'}</p>
        </div>
      </div>

      {/* Classes inside the box — this is the drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'ml-12 border-l-2 border-primary/30 pl-3 space-y-1 min-h-[36px] rounded-r transition-colors',
          isOver && 'bg-primary/10 border-primary'
        )}
      >
        {classDetails.length > 0 ? (
          classDetails.map(cls => {
            const assoc = associationsData?.find(a => a.id === cls.assocId);
            return (
              <div key={cls.id} className="flex items-center gap-2 py-1 px-2 rounded bg-white/60 dark:bg-background/40 text-sm group">
                <span className="truncate flex-grow">{cls.name}</span>
                {assoc && (
                  <Badge variant={assoc.color || 'secondary'} className="text-xs px-1.5 py-0 shrink-0">
                    {assoc.abbreviation}
                  </Badge>
                )}
                {onRemoveClassFromBox && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveClassFromBox(item.id, cls.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground py-2 italic">
            Drag classes here from the palette
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Non-box items ───
const BreakDisplay = ({ item }) => (
  <div className="flex-grow flex items-center gap-2 min-w-0">
    <Coffee className="h-4 w-4 text-green-600 shrink-0" />
    <span className="font-medium text-sm">{item.title}</span>
    {item.duration && <span className="text-xs text-muted-foreground">({item.duration})</span>}
  </div>
);

const DragDisplay = ({ item }) => (
  <div className="flex-grow flex items-center gap-2 min-w-0">
    <Tractor className="h-4 w-4 text-yellow-600 shrink-0" />
    <span className="font-medium text-sm">{item.title}</span>
  </div>
);

const SectionHeaderDisplay = ({ item }) => (
  <div className="flex-grow text-center min-w-0 py-1">
    <div className="border-t border-muted-foreground/30 mb-1.5" />
    <p className="font-bold text-sm uppercase tracking-wide">{item.title}</p>
    <div className="border-b border-muted-foreground/30 mt-1.5" />
  </div>
);

const CustomDisplay = ({ item }) => (
  <div className="flex-grow min-w-0">
    <div className="flex items-center gap-2">
      <Star className="h-4 w-4 text-purple-600 shrink-0" />
      <span className="font-medium text-sm">{item.title}</span>
    </div>
    {item.content && <p className="text-xs text-muted-foreground ml-6 truncate">{item.content}</p>}
  </div>
);

// ─── Styles ───
const typeStyles = {
  classBox: 'bg-blue-50/80 border-blue-300 border-2 dark:bg-blue-950/30 dark:border-blue-700',
  break: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  drag: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
  sectionHeader: 'bg-gray-50 border-gray-300 dark:bg-gray-800/50 dark:border-gray-600',
  custom: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
};

const SortableShowBillItem = ({ item, onEdit, onRemove, onRemoveClassFromBox, allClassItems, associationsData }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { origin: 'arena', item },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isClassBox = item.type === 'classBox';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg touch-none',
        isClassBox ? 'p-3 border-2' : 'flex items-center gap-2 p-2 border',
        typeStyles[item.type] || 'bg-background border-border',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      {/* Drag handle + content row */}
      <div className={cn('flex items-start gap-2', !isClassBox && 'flex-grow')}>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 shrink-0 mt-0.5">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-grow min-w-0">
          {isClassBox && (
            <ClassBoxDisplay
              item={item}
              allClassItems={allClassItems}
              associationsData={associationsData}
              onRemoveClassFromBox={onRemoveClassFromBox}
            />
          )}
          {item.type === 'break' && <BreakDisplay item={item} />}
          {item.type === 'drag' && <DragDisplay item={item} />}
          {item.type === 'sectionHeader' && <SectionHeaderDisplay item={item} />}
          {item.type === 'custom' && <CustomDisplay item={item} />}
        </div>

        <div className="flex gap-1 shrink-0 ml-auto">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(item.id)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SortableShowBillItem;
