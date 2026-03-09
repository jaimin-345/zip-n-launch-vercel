import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GripVertical, Undo2, Redo2, CalendarDays, X, CopyPlus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import ClassPalette from '@/components/show-builder/show-bill/ClassPalette';
import {
    initializeShowBill,
    getAllClassItems,
    getUnplacedClasses,
    createShowBillItem,
    renumberShowBill,
    findItemLocation,
} from '@/lib/showBillUtils';

const MAX_UNDO = 50;

// ─── Compact sortable class card inside an arena ────────────────
const SortableClassCard = ({ item, allClassItems, associationsData, onRemove, onUpdateTitle, onAddSecondGo, isSelected, onToggleSelection }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
        data: { origin: 'arena', item },
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(item.title || '');

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const classDetails = (item.classes || []).map(cid => allClassItems.find(c => c.id === cid)).filter(Boolean);
    const firstAssoc = classDetails[0] && associationsData?.find(a => a.id === classDetails[0].assocId);

    const handleStartEdit = () => {
        setEditValue(item.title || '');
        setIsEditing(true);
    };

    const handleFinishEdit = () => {
        setIsEditing(false);
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== item.title) {
            onUpdateTitle?.(item.id, trimmed);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleFinishEdit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group flex items-center gap-1.5 p-1.5 border-2 rounded bg-blue-50/80 border-blue-300 dark:bg-blue-950/30 dark:border-blue-700 touch-none text-sm',
                isDragging && 'opacity-40',
                isSelected && 'ring-2 ring-primary',
            )}
        >
            <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelection?.(item.id)}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 shrink-0"
            />
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="font-bold text-primary shrink-0 w-6 text-right">{item.number || '?'}.</span>
            {isEditing ? (
                <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleFinishEdit}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="flex-grow font-medium bg-white dark:bg-background border border-primary/40 rounded px-1 py-0 text-sm outline-none focus:ring-1 focus:ring-primary"
                    onPointerDown={(e) => e.stopPropagation()}
                />
            ) : (
                <span
                    className="truncate flex-grow font-medium cursor-text hover:underline hover:decoration-dotted"
                    onDoubleClick={handleStartEdit}
                    title="Double-click to edit"
                >
                    {item.title || 'Untitled'}
                </span>
            )}
            {item.isSecondGo && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">2nd Go</Badge>
            )}
            {firstAssoc && (
                <span className="text-xs text-muted-foreground shrink-0">({firstAssoc.abbreviation})</span>
            )}
            {!item.isSecondGo && (
                <button
                    type="button"
                    className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-primary/10 flex items-center justify-center"
                    onClick={() => onAddSecondGo?.(item.id)}
                    title="Add Second Go"
                >
                    <CopyPlus className="h-3 w-3 text-primary" />
                </button>
            )}
            <button
                type="button"
                className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-destructive/10 flex items-center justify-center"
                onClick={() => onRemove(item.id)}
            >
                <X className="h-3 w-3 text-destructive" />
            </button>
        </div>
    );
};

// ─── Arena drop zone with close toggle ──────────────────────────
const ArenaContainer = ({ arena, dayId, allClassItems, associationsData, onRemoveItem, onUpdateTitle, onAddSecondGo, isClosed, onToggleClosed, selectedArenaItemIds, onToggleArenaItemSelection }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `droppable-${dayId}-${arena.id}`,
        data: { dayId, arenaId: arena.id, origin: 'arena-zone' },
    });

    return (
        <div className={cn(
            'border rounded-lg shadow-sm',
            isClosed ? 'bg-muted/50 opacity-60' : 'bg-white dark:bg-card'
        )}>
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-bold text-base">{arena.name}</h4>
                <Badge variant="outline" className="ml-auto text-xs">
                    {arena.items.length} class{arena.items.length !== 1 ? 'es' : ''}
                </Badge>
                {isClosed && (
                    <Badge variant="secondary" className="text-xs">Closed</Badge>
                )}
                <Switch
                    checked={!isClosed}
                    onCheckedChange={onToggleClosed}
                    className="scale-75"
                />
            </div>

            {!isClosed ? (
                <div className="p-3">
                    <SortableContext
                        id={`${dayId}::${arena.id}`}
                        items={arena.items.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div
                            ref={setNodeRef}
                            className={cn(
                                'space-y-1 min-h-[60px] rounded-md transition-colors',
                                isOver && 'bg-primary/5 ring-2 ring-primary/20',
                                arena.items.length === 0 && 'border-2 border-dashed border-muted-foreground/20 flex items-center justify-center',
                            )}
                        >
                            {arena.items.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-6">Drag classes here</p>
                            ) : (
                                arena.items.map(item => (
                                    <SortableClassCard
                                        key={item.id}
                                        item={item}
                                        allClassItems={allClassItems}
                                        associationsData={associationsData}
                                        onRemove={onRemoveItem}
                                        onUpdateTitle={onUpdateTitle}
                                        onAddSecondGo={onAddSecondGo}
                                        isSelected={selectedArenaItemIds?.has(item.id)}
                                        onToggleSelection={onToggleArenaItemSelection}
                                    />
                                ))
                            )}
                        </div>
                    </SortableContext>
                </div>
            ) : (
                <div className="p-3 text-center text-sm text-muted-foreground italic">
                    Arena closed for this day
                </div>
            )}
        </div>
    );
};

// ─── Main component ─────────────────────────────────────────────
export const Step3_ConfigureDivisions = ({ formData, setFormData, associationsData }) => {
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [activeDayId, setActiveDayId] = useState(null);
    const [activeDragData, setActiveDragData] = useState(null);

    // Multi-select state
    const [selectedPaletteIds, setSelectedPaletteIds] = useState(new Set());
    const [selectedArenaItemIds, setSelectedArenaItemIds] = useState(new Set());

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const showBill = formData.showBill;

    // Initialize showBill on first mount
    useEffect(() => {
        if (!formData.showBill) {
            const initial = initializeShowBill(formData);
            setFormData(prev => ({ ...prev, showBill: initial }));
        }
    }, [formData.showBill, formData, setFormData]);

    // Set default active day
    useEffect(() => {
        if (showBill?.days?.length > 0 && !activeDayId) {
            setActiveDayId(showBill.days[0].id);
        }
    }, [showBill, activeDayId]);

    const allClassItems = useMemo(() => getAllClassItems(formData), [formData]);
    const unplacedClasses = useMemo(() => getUnplacedClasses(formData), [formData]);
    const activeDay = useMemo(() => showBill?.days?.find(d => d.id === activeDayId), [showBill, activeDayId]);

    // Prune stale palette selections
    useEffect(() => {
        if (selectedPaletteIds.size > 0) {
            const unplacedIds = new Set(unplacedClasses.map(c => c.id));
            const pruned = new Set([...selectedPaletteIds].filter(id => unplacedIds.has(id)));
            if (pruned.size !== selectedPaletteIds.size) setSelectedPaletteIds(pruned);
        }
    }, [unplacedClasses, selectedPaletteIds]);

    // Selection helpers
    const clearSelection = useCallback(() => {
        setSelectedPaletteIds(new Set());
        setSelectedArenaItemIds(new Set());
    }, []);

    const selectedCount = selectedPaletteIds.size + selectedArenaItemIds.size;

    const togglePaletteSelection = useCallback((classId) => {
        setSelectedArenaItemIds(new Set());
        setSelectedPaletteIds(prev => {
            const next = new Set(prev);
            if (next.has(classId)) next.delete(classId);
            else next.add(classId);
            return next;
        });
    }, []);

    const toggleArenaItemSelection = useCallback((itemId) => {
        setSelectedPaletteIds(new Set());
        setSelectedArenaItemIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    }, []);

    // Undo-aware setter
    const setShowBill = useCallback((newShowBill) => {
        setUndoStack(prev => [...prev.slice(-(MAX_UNDO - 1)), formData.showBill]);
        setRedoStack([]);
        setFormData(prev => ({ ...prev, showBill: newShowBill }));
    }, [formData.showBill, setFormData]);

    const handleUndo = useCallback(() => {
        if (undoStack.length === 0) return;
        const prevState = undoStack[undoStack.length - 1];
        setRedoStack(r => [...r, formData.showBill]);
        setUndoStack(u => u.slice(0, -1));
        setFormData(p => ({ ...p, showBill: prevState }));
    }, [undoStack, formData.showBill, setFormData]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const nextState = redoStack[redoStack.length - 1];
        setUndoStack(u => [...u, formData.showBill]);
        setRedoStack(r => r.slice(0, -1));
        setFormData(p => ({ ...p, showBill: nextState }));
    }, [redoStack, formData.showBill, setFormData]);

    // Toggle arena closed/open
    const handleToggleArenaClosed = useCallback((dayId, arenaId) => {
        const key = `${dayId}::${arenaId}`;
        const sb = JSON.parse(JSON.stringify(showBill));
        if (!sb.closedArenas) sb.closedArenas = {};
        if (sb.closedArenas[key]) {
            delete sb.closedArenas[key];
        } else {
            sb.closedArenas[key] = true;
        }
        setShowBill(renumberShowBill(sb));
    }, [showBill, setShowBill]);

    // Remove an item from its arena
    const handleRemoveItem = useCallback((itemId) => {
        const loc = findItemLocation(showBill, itemId);
        if (!loc) return;
        const sb = JSON.parse(JSON.stringify(showBill));
        const day = sb.days.find(d => d.id === loc.dayId);
        const arena = day?.arenas.find(a => a.id === loc.arenaId);
        if (arena) {
            arena.items = arena.items.filter(i => i.id !== itemId);
        }
        setShowBill(renumberShowBill(sb));
    }, [showBill, setShowBill]);

    // Update an item's title
    const handleUpdateItemTitle = useCallback((itemId, newTitle) => {
        const loc = findItemLocation(showBill, itemId);
        if (!loc) return;
        const sb = JSON.parse(JSON.stringify(showBill));
        const day = sb.days.find(d => d.id === loc.dayId);
        const arena = day?.arenas.find(a => a.id === loc.arenaId);
        if (arena) {
            const item = arena.items.find(i => i.id === itemId);
            if (item) item.title = newTitle;
        }
        setShowBill(sb);
    }, [showBill, setShowBill]);

    // Add Second Go for a class item
    const handleAddSecondGo = useCallback((itemId) => {
        const loc = findItemLocation(showBill, itemId);
        if (!loc) return;
        const sb = JSON.parse(JSON.stringify(showBill));
        const day = sb.days.find(d => d.id === loc.dayId);
        const arena = day?.arenas.find(a => a.id === loc.arenaId);
        if (!arena) return;
        const parentItem = arena.items[loc.index];
        const secondGoItem = {
            type: 'classBox',
            id: uuidv4(),
            number: 0,
            title: `${parentItem.title} (Second Go)`,
            classes: [...(parentItem.classes || [])],
            isSecondGo: true,
            parentItemId: parentItem.id,
            parentNumber: parentItem.number,
        };
        // Insert right after the parent
        arena.items.splice(loc.index + 1, 0, secondGoItem);
        setShowBill(renumberShowBill(sb));
    }, [showBill, setShowBill]);

    // DnD handlers
    const handleDragStart = (event) => {
        setActiveDragData(event.active.data.current);
    };

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        setActiveDragData(null);
        if (!over || !showBill) return;

        const activeData = active.data.current;

        // Case 1: Palette → Arena
        if (activeData?.origin === 'palette') {
            const classItem = activeData.classItem;

            // Multi-select: move all selected or just the dragged one
            const isMulti = selectedPaletteIds.has(classItem.id) && selectedPaletteIds.size > 1;
            const classesToMove = isMulti
                ? unplacedClasses.filter(c => selectedPaletteIds.has(c.id))
                : [classItem];

            let targetDayId, targetArenaId, targetIndex;

            if (over.data.current?.origin === 'arena-zone') {
                targetDayId = over.data.current.dayId;
                targetArenaId = over.data.current.arenaId;
                const day = showBill.days.find(d => d.id === targetDayId);
                const arena = day?.arenas.find(a => a.id === targetArenaId);
                targetIndex = arena?.items.length || 0;
            } else if (over.data.current?.sortable?.containerId) {
                const containerId = over.data.current.sortable.containerId;
                const [dayId, arenaId] = containerId.split('::');
                targetDayId = dayId;
                targetArenaId = arenaId;
                const day = showBill.days.find(d => d.id === dayId);
                const arena = day?.arenas.find(a => a.id === arenaId);
                targetIndex = arena?.items.findIndex(i => i.id === over.id);
                if (targetIndex === -1) targetIndex = arena?.items.length || 0;
            } else {
                return;
            }

            // Reject drops into closed arenas
            if ((showBill.closedArenas || {})[`${targetDayId}::${targetArenaId}`]) return;

            const sb = JSON.parse(JSON.stringify(showBill));
            const day = sb.days.find(d => d.id === targetDayId);
            const arena = day?.arenas.find(a => a.id === targetArenaId);
            if (arena) {
                const newItems = classesToMove.map(cls => createShowBillItem('classBox', {
                    title: cls.name,
                    classes: [cls.id],
                }));
                arena.items.splice(targetIndex, 0, ...newItems);
            }
            setShowBill(renumberShowBill(sb));
            clearSelection();
            return;
        }

        // Case 2: Reorder within / between arenas
        if (activeData?.origin === 'arena') {
            const activeContainerId = active.data.current?.sortable?.containerId;
            let overContainerId = over.data.current?.sortable?.containerId;

            if (!overContainerId && over.data.current?.origin === 'arena-zone') {
                overContainerId = `${over.data.current.dayId}::${over.data.current.arenaId}`;
            }
            if (!activeContainerId || !overContainerId) return;

            const [srcDayId, srcArenaId] = activeContainerId.split('::');
            const [destDayId, destArenaId] = overContainerId.split('::');

            // Reject drops into closed arenas
            if ((showBill.closedArenas || {})[`${destDayId}::${destArenaId}`]) return;

            const isDraggedSelected = selectedArenaItemIds.has(active.id) && selectedArenaItemIds.size > 1;

            if (isDraggedSelected) {
                // Multi-move
                const sb = JSON.parse(JSON.stringify(showBill));
                const collectedItems = [];
                for (const day of sb.days) {
                    for (const arena of day.arenas) {
                        const kept = [];
                        for (const item of arena.items) {
                            if (selectedArenaItemIds.has(item.id)) {
                                collectedItems.push(item);
                            } else {
                                kept.push(item);
                            }
                        }
                        arena.items = kept;
                    }
                }
                const destDay = sb.days.find(d => d.id === destDayId);
                const destArena = destDay?.arenas.find(a => a.id === destArenaId);
                if (!destArena) return;
                let destIdx = destArena.items.findIndex(i => i.id === over.id);
                if (destIdx === -1) destIdx = destArena.items.length;
                destArena.items.splice(destIdx, 0, ...collectedItems);
                setShowBill(renumberShowBill(sb));
                clearSelection();
                return;
            }

            // Single-item move
            const sb = JSON.parse(JSON.stringify(showBill));
            const srcDay = sb.days.find(d => d.id === srcDayId);
            const srcArena = srcDay?.arenas.find(a => a.id === srcArenaId);

            if (srcDayId === destDayId && srcArenaId === destArenaId) {
                if (!srcArena) return;
                const oldIdx = srcArena.items.findIndex(i => i.id === active.id);
                const newIdx = srcArena.items.findIndex(i => i.id === over.id);
                if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
                srcArena.items = arrayMove(srcArena.items, oldIdx, newIdx);
                setShowBill(renumberShowBill(sb));
            } else {
                const destDay = sb.days.find(d => d.id === destDayId);
                const destArena = destDay?.arenas.find(a => a.id === destArenaId);
                if (!srcArena || !destArena) return;
                const srcIdx = srcArena.items.findIndex(i => i.id === active.id);
                if (srcIdx === -1) return;
                const [movedItem] = srcArena.items.splice(srcIdx, 1);
                let destIdx = destArena.items.findIndex(i => i.id === over.id);
                if (destIdx === -1) destIdx = destArena.items.length;
                destArena.items.splice(destIdx, 0, movedItem);
                setShowBill(renumberShowBill(sb));
            }
        }
    }, [showBill, setShowBill, selectedPaletteIds, selectedArenaItemIds, unplacedClasses, clearSelection]);

    // Empty state — no classes built
    if (!formData.disciplines || formData.disciplines.length === 0) {
        return (
            <motion.div key="step5-schedule" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                <CardHeader>
                    <CardTitle>Step 5: Organize Your Schedule</CardTitle>
                    <CardDescription>Drag and drop classes into arena time slots to build your show schedule.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground font-medium">No classes built yet.</p>
                        <p className="text-sm text-muted-foreground mt-1">Go back to Step 4 to build your class list.</p>
                    </div>
                </CardContent>
            </motion.div>
        );
    }

    if (!showBill) {
        return (
            <motion.div key="step5-schedule" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                <CardContent className="flex items-center justify-center p-16">
                    <p className="text-muted-foreground">Initializing schedule...</p>
                </CardContent>
            </motion.div>
        );
    }

    return (
        <motion.div key="step5-schedule" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div>
                            <CardTitle>Step 5: Organize Your Schedule</CardTitle>
                            <CardDescription>Drag classes from the library into arena containers to build your show schedule.</CardDescription>
                        </div>
                        {selectedCount > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-sm">
                                <span className="font-semibold">{selectedCount} selected</span>
                                <button onClick={clearSelection} className="p-0.5 rounded-full hover:bg-primary/20">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handleUndo} disabled={undoStack.length === 0} title="Undo">
                            <Undo2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleRedo} disabled={redoStack.length === 0} title="Redo">
                            <Redo2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    {/* Day tabs */}
                    {showBill.days.length > 1 && (
                        <Tabs value={activeDayId} onValueChange={setActiveDayId} className="mb-4">
                            <TabsList>
                                {showBill.days.map(day => (
                                    <TabsTrigger key={day.id} value={day.id}>{day.label}</TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* Left — Class Library */}
                        <div className="lg:col-span-4 xl:col-span-3">
                            <div className="sticky top-4">
                                <ClassPalette
                                    allClassItems={allClassItems}
                                    unplacedClasses={unplacedClasses}
                                    associationsData={associationsData}
                                    selectedIds={selectedPaletteIds}
                                    onToggleSelection={togglePaletteSelection}
                                />
                            </div>
                        </div>

                        {/* Right — Arena Workspace */}
                        <div className="lg:col-span-8 xl:col-span-9">
                            <div className="bg-gray-50 dark:bg-muted/10 rounded-lg p-4 min-h-[500px] shadow-inner">
                                {activeDay ? (
                                    <div className="space-y-4">
                                        {activeDay.arenas.length > 0 ? (
                                            activeDay.arenas.map(arena => {
                                                const isClosed = !!(showBill.closedArenas || {})[`${activeDay.id}::${arena.id}`];
                                                return (
                                                    <ArenaContainer
                                                        key={arena.id}
                                                        arena={arena}
                                                        dayId={activeDay.id}
                                                        allClassItems={allClassItems}
                                                        associationsData={associationsData}
                                                        onRemoveItem={handleRemoveItem}
                                                        onUpdateTitle={handleUpdateItemTitle}
                                                        onAddSecondGo={handleAddSecondGo}
                                                        isClosed={isClosed}
                                                        onToggleClosed={() => handleToggleArenaClosed(activeDay.id, arena.id)}
                                                        selectedArenaItemIds={selectedArenaItemIds}
                                                        onToggleArenaItemSelection={toggleArenaItemSelection}
                                                    />
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-10 text-muted-foreground">
                                                <p>No arenas for this day.</p>
                                                <p className="text-sm mt-1">Go back to Step 3 to assign arenas to dates.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-10">Select a day to view the schedule</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Drag overlay */}
                    <DragOverlay>
                        {activeDragData?.origin === 'palette' && activeDragData.classItem && (
                            <div className="p-2 border rounded-lg bg-background shadow-lg cursor-grabbing flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">{activeDragData.classItem.name}</span>
                                {selectedPaletteIds.has(activeDragData.classItem.id) && selectedPaletteIds.size > 1 && (
                                    <Badge className="ml-1">{selectedPaletteIds.size}</Badge>
                                )}
                            </div>
                        )}
                        {activeDragData?.origin === 'arena' && activeDragData.item && (
                            <div className="p-2 border rounded-lg bg-background shadow-lg cursor-grabbing flex items-center gap-2 opacity-90">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">{activeDragData.item.title || 'Class'}</span>
                                {selectedArenaItemIds.has(activeDragData.item.id) && selectedArenaItemIds.size > 1 ? (
                                    <Badge className="ml-auto">{selectedArenaItemIds.size}</Badge>
                                ) : (
                                    activeDragData.item.number && (
                                        <Badge className="ml-auto">{activeDragData.item.number}</Badge>
                                    )
                                )}
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            </CardContent>
        </motion.div>
    );
};
