import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableShowBillItem from './SortableShowBillItem';
import InsertToolbar from './InsertToolbar';
import { cn } from '@/lib/utils';

const ArenaDropZone = ({ arena, dayId, onEditItem, onRemoveItem, onRemoveClassFromBox, onInsertItem, allClassItems, associationsData }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${dayId}-${arena.id}`,
    data: { dayId, arenaId: arena.id, origin: 'arena-zone' },
  });

  return (
    <div className="border rounded-lg bg-white dark:bg-card shadow-sm mb-4">
      <div className="px-4 py-2 border-b bg-muted/30">
        <h4 className="font-bold text-base">{arena.name}</h4>
      </div>
      <div className="p-3">
        <SortableContext
          id={`${dayId}::${arena.id}`}
          items={arena.items.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className={cn(
              'space-y-1.5 min-h-[80px] rounded-md transition-colors',
              isOver && 'bg-primary/5 ring-2 ring-primary/20',
              arena.items.length === 0 && 'border-2 border-dashed border-muted-foreground/20 flex items-center justify-center'
            )}
          >
            {arena.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">
                Drag classes here or use the buttons below to add items
              </p>
            ) : (
              arena.items.map(item => (
                <SortableShowBillItem
                  key={item.id}
                  item={item}
                  onEdit={onEditItem}
                  onRemove={onRemoveItem}
                  onRemoveClassFromBox={onRemoveClassFromBox}
                  allClassItems={allClassItems}
                  associationsData={associationsData}
                />
              ))
            )}
          </div>
        </SortableContext>
        <InsertToolbar onInsert={(type) => onInsertItem(dayId, arena.id, type)} />
      </div>
    </div>
  );
};

const ArenaSection = ({ day, onEditItem, onRemoveItem, onRemoveClassFromBox, onInsertItem, allClassItems, associationsData }) => {
  if (!day) return null;

  return (
    <div className="space-y-4">
      {day.arenas.length > 1 && (
        <h3 className="text-lg font-bold">{day.label}</h3>
      )}
      {day.arenas.map(arena => (
        <ArenaDropZone
          key={arena.id}
          arena={arena}
          dayId={day.id}
          onEditItem={onEditItem}
          onRemoveItem={onRemoveItem}
          onRemoveClassFromBox={onRemoveClassFromBox}
          onInsertItem={onInsertItem}
          allClassItems={allClassItems}
          associationsData={associationsData}
        />
      ))}
    </div>
  );
};

export default ArenaSection;
