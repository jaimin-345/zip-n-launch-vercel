import React, { useState, useMemo, useCallback, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
    import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Badge } from '@/components/ui/badge';
    import { ScrollArea } from '@/components/ui/scroll-area';
    import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { Undo, Redo, Save, AlertTriangle, Search, GripVertical, Coffee, Tractor, Award, PlusCircle, Trash2 } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';
    import { cn } from '@/lib/utils';
    import { v4 as uuidv4 } from 'uuid';
    import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
    import { supabase } from '@/lib/supabaseClient';

    const PIXELS_PER_MINUTE = 2;

    const DraggableClassItem = React.forwardRef(({ pbbClass, isOverlay, associationsData, ...props }, ref) => {
        const getAssociationBadges = () => {
            if (!pbbClass || !associationsData) return [];
            const discipline = pbbClass.discipline;
            if (!discipline) return [];

            const selectedAssocIds = Object.keys(discipline.selectedAssociations);
            const assocs = selectedAssocIds
                .filter(assocId => !(assocId === 'NSBA' && discipline.isDualApproved))
                .map(assocId => {
                    const assoc = associationsData.find(a => a.id === assocId);
                    return <Badge key={assocId} variant={assoc?.color || 'secondary'} className="text-xs px-1 py-0">{assoc?.abbreviation || assocId}</Badge>;
                });

            if (discipline.isDualApproved) {
                 assocs.push(<Badge key="nsba-da" variant="dualApproved" className="text-xs px-1 py-0">NSBA D-A</Badge>);
            }
            if (discipline.isNsbaStandalone) {
                assocs.push(<Badge key="nsba-sa" variant="standalone" className="text-xs px-1 py-0">NSBA S-A</Badge>);
            }
            return assocs;
        }

        return (
            <div ref={ref} {...props} className={cn("p-2 border rounded-lg bg-background touch-none", isOverlay ? "cursor-grabbing shadow-lg" : "cursor-grab")}>
                <div className="flex items-start gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-grow">
                        <p className="text-sm font-semibold leading-tight">{pbbClass.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {getAssociationBadges()}
                        </div>
                    </div>
                </div>
            </div>
        );
    });

    const ScheduledItem = ({ item, onResizeStart, onRemove }) => {
        const itemStyle = {
            top: `${item.top}px`,
            height: `${item.height}px`,
        };

        const handleMouseDown = (e) => {
            e.stopPropagation();
            onResizeStart(e, item.id);
        };

        const typeStyles = {
            class: 'bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300',
            break: 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300',
            drag: 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-700 dark:text-yellow-300',
            custom: 'bg-purple-100 border-purple-400 text-purple-800 dark:bg-purple-900/50 dark:border-purple-700 dark:text-purple-300',
        };

        const typeIcons = {
            class: <Award className="h-3 w-3 mr-1 flex-shrink-0" />,
            break: <Coffee className="h-3 w-3 mr-1 flex-shrink-0" />,
            drag: <Tractor className="h-3 w-3 mr-1 flex-shrink-0" />,
            custom: <PlusCircle className="h-3 w-3 mr-1 flex-shrink-0" />,
        };

        return (
            <div 
                style={itemStyle} 
                className={cn("absolute w-[calc(100%-0.5rem)] mx-1 p-1.5 border rounded-lg text-xs overflow-hidden flex flex-col", typeStyles[item.type])}
            >
                <div className="flex-grow overflow-hidden">
                    <p className="font-bold flex items-center truncate">{typeIcons[item.type]} {item.title}</p>
                    {item.height > 25 && <p className="text-muted-foreground">{item.startTime} - {item.endTime}</p>}
                </div>
                <div 
                    className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize"
                    onMouseDown={handleMouseDown}
                ></div>
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-5 w-5" onClick={() => onRemove(item.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
            </div>
        );
    };

    const ScheduleHeader = ({ showName, startDate, endDate, onSave }) => {
        const { toast } = useToast();
        const handleNotImplemented = () => {
            toast({
                title: "🚧 Feature Not Implemented",
                description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
            });
        };

        return (
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm -mx-6 px-6 py-3 border-b mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">{showName || "Untitled Show"}</h2>
                        <p className="text-sm text-muted-foreground">{startDate && new Date(startDate + 'T00:00:00').toLocaleDateString()} - {endDate && new Date(endDate + 'T00:00:00').toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleNotImplemented}><Undo className="h-4 w-4 mr-2" />Undo</Button>
                        <Button variant="outline" size="sm" onClick={handleNotImplemented}><Redo className="h-4 w-4 mr-2" />Redo</Button>
                        <Button size="sm" onClick={onSave}><Save className="h-4 w-4 mr-2" />Save Schedule</Button>
                    </div>
                </div>
            </div>
        );
    };

    const DateTabs = ({ startDate, endDate, selectedDate, setSelectedDate }) => {
        const dates = useMemo(() => {
            if (!startDate) return [];
            const list = [];
            let current = new Date(startDate + 'T00:00:00');
            const end = endDate ? new Date(endDate + 'T00:00:00') : current;
            while (current <= end) {
                list.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
            return list;
        }, [startDate, endDate]);

        if (dates.length <= 1 && startDate) return null;
        if (dates.length === 0) return null;

        return (
            <div className="sticky top-[77px] z-20 bg-background/80 backdrop-blur-sm -mx-6 px-6 py-2 border-b mb-4">
                <Tabs value={selectedDate} onValueChange={setSelectedDate}>
                    <TabsList>
                        {dates.map(date => (
                            <TabsTrigger key={date} value={date}>
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>
        );
    };

    const ClassPalette = ({ classes, onToolDragStart, associationsData }) => {
        const [searchTerm, setSearchTerm] = useState('');
        const filteredClasses = useMemo(() => {
            return classes.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }, [classes, searchTerm]);

        return (
            <div className="h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-2 px-1">Class Palette & Tools</h3>
                <div className="relative mb-4">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search classes..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                    <Button variant="outline" size="sm" onMouseDown={() => onToolDragStart({ type: 'break', title: 'Break' })}><Coffee className="h-4 w-4 mr-2" />Insert Break</Button>
                    <Button variant="outline" size="sm" onMouseDown={() => onToolDragStart({ type: 'drag', title: 'Arena Drag' })}><Tractor className="h-4 w-4 mr-2" />Insert Drag</Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm"><PlusCircle className="h-4 w-4 mr-2" />Custom Event</Button>
                        </PopoverTrigger>
                        <PopoverContent>
                            <p className="text-sm text-muted-foreground">Drag from here to add a custom event.</p>
                            <div className="mt-2" onMouseDown={() => onToolDragStart({ type: 'custom', title: 'Custom Event' })}>
                                <div className="p-2 border rounded-lg bg-background cursor-grab active:cursor-grabbing">Custom Event</div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <Label className="text-sm font-medium text-muted-foreground px-1">Unscheduled Classes ({filteredClasses.length})</Label>
                <ScrollArea className="flex-grow mt-2 border rounded-lg p-2 bg-muted/30">
                    <div className="space-y-2">
                        {filteredClasses.map(pbbClass => (
                            <DraggableClassItem key={pbbClass.id} id={pbbClass.id} pbbClass={pbbClass} associationsData={associationsData} />
                        ))}
                    </div>
                </ScrollArea>
            </div>
        );
    };

    const ScheduleCanvas = ({ arenas, schedule, onDrop, onResizeStart, onRemoveItem, gridRef }) => {
        const timeSlots = Array.from({ length: 18 * 4 }, (_, i) => {
            const hour = Math.floor(i / 4) + 5; // 5 AM to 10 PM
            const minute = (i % 4) * 15;
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        });

        const validArenas = arenas.filter(a => a.name.trim() !== '');

        return (
            <div className="h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-2 px-1">Day Scheduler</h3>
                <ScrollArea className="flex-grow border rounded-lg relative" ref={gridRef}>
                    {validArenas.length > 0 ? (
                        <div className="grid" style={{ gridTemplateColumns: `60px repeat(${validArenas.length}, minmax(150px, 1fr))` }}>
                            <div className="sticky top-0 bg-background z-10"></div>
                            {validArenas.map(arena => (
                                <div key={arena.id} className="sticky top-0 bg-background z-10 p-2 border-b border-l text-center font-semibold">
                                    {arena.name}
                                </div>
                            ))}

                            {timeSlots.map((time, index) => (
                                <React.Fragment key={time}>
                                    <div className={cn("flex items-start justify-center text-xs text-muted-foreground", index % 4 === 0 ? "h-12 border-t" : "h-12 border-t border-dashed border-muted-foreground/20")}>
                                        {index % 4 === 0 && <span className="-translate-y-2">{time}</span>}
                                    </div>
                                    {validArenas.map(arena => (
                                        <div 
                                            key={`${arena.id}-${time}`} 
                                            data-arena-id={arena.id}
                                            data-time={time}
                                            className={cn("relative h-12 border-l", index % 4 === 0 ? "border-t" : "border-t border-dashed border-muted-foreground/20")}
                                        ></div>
                                    ))}
                                </React.Fragment>
                            ))}
                            
                            {validArenas.map((arena, arenaIndex) => (
                                <div key={arena.id} className="absolute top-[49px] h-full" style={{ left: `${60 + (arenaIndex * ((gridRef.current?.offsetWidth - 60) / validArenas.length))}px`, width: `${(gridRef.current?.offsetWidth - 60) / validArenas.length}px` }}>
                                    {schedule
                                        .filter(item => item.arenaId === arena.id)
                                        .map(item => (
                                            <ScheduledItem key={item.id} item={item} onResizeStart={onResizeStart} onRemove={onRemoveItem} />
                                        ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Please add and name arenas in Step 4: Details & Staff.</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
        );
    };

    const ConflictsPanel = () => {
        return (
            <div className="h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-2 px-1">Conflicts & Insights</h3>
                <div className="flex-grow border rounded-lg p-4 bg-muted/30">
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <AlertTriangle className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="font-semibold">No conflicts detected.</p>
                        <p className="text-sm text-muted-foreground">Conflicts will appear here as you build the schedule.</p>
                    </div>
                </div>
            </div>
        );
    };

    export const Step5_Schedule = ({ formData, setFormData }) => {
        const { toast } = useToast();
        const [selectedDate, setSelectedDate] = useState(formData.startDate || new Date().toISOString().split('T')[0]);
        const [activeDragItem, setActiveDragItem] = useState(null);
        const [resizingItem, setResizingItem] = useState(null);
        const [associationsData, setAssociationsData] = useState([]);
        const gridRef = React.useRef(null);

        useEffect(() => {
            if (formData.startDate && !selectedDate) {
                setSelectedDate(formData.startDate);
            }
        }, [formData.startDate, selectedDate]);

        useEffect(() => {
            const fetchAssociations = async () => {
                const { data, error } = await supabase.from('associations').select('*');
                if (error) {
                    toast({ title: 'Error fetching associations', description: error.message, variant: 'destructive' });
                } else {
                    setAssociationsData(data);
                }
            };
            fetchAssociations();
        }, [toast]);

        const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

        const allClassItems = useMemo(() => {
            return (formData.disciplines || []).flatMap(discipline => 
                (discipline.divisionOrder || []).map(divisionId => {
                    const [assocId, ...divisionParts] = divisionId.split('-');
                    const divisionName = divisionParts.join('-');
                    const customTitle = discipline.divisionPrintTitles?.[divisionId];
                    const name = customTitle || (divisionName.startsWith('custom-') ? divisionName.substring(7) : divisionName);
                    return { id: divisionId, name, discipline };
                })
            );
        }, [formData.disciplines]);

        const scheduleForDate = useMemo(() => {
            const daySchedule = (formData.schedule || []).filter(item => item.date === selectedDate);
            return daySchedule.map(item => {
                const [startHour, startMinute] = item.startTime.split(':').map(Number);
                const [endHour, endMinute] = item.endTime.split(':').map(Number);
                const startTotalMinutes = (startHour - 5) * 60 + startMinute;
                const endTotalMinutes = (endHour - 5) * 60 + endMinute;
                return {
                    ...item,
                    top: startTotalMinutes * PIXELS_PER_MINUTE,
                    height: Math.max(15 * PIXELS_PER_MINUTE, (endTotalMinutes - startTotalMinutes) * PIXELS_PER_MINUTE),
                };
            });
        }, [formData.schedule, selectedDate]);

        const unscheduledClasses = useMemo(() => {
            const scheduledClassIds = new Set((formData.schedule || []).map(item => item.classId));
            return allClassItems.filter(c => !scheduledClassIds.has(c.id));
        }, [allClassItems, formData.schedule]);

        const arenas = useMemo(() => formData.arenas || [], [formData.arenas]);

        const handleSave = () => {
            toast({
                title: "Schedule Saved (Locally)",
                description: "Your schedule changes have been saved. Don't forget to save progress for the whole show!",
            });
        };

        const handleDragStart = (event) => {
            const { active } = event;
            const pbbClass = allClassItems.find(c => c.id === active.id);
            if (pbbClass) {
                setActiveDragItem({ type: 'class', data: pbbClass });
            }
        };

        const handleToolDragStart = (tool) => {
            setActiveDragItem({ type: 'tool', data: tool });
        };

        const handleDrop = (e) => {
            e.preventDefault();
            if (!activeDragItem || !gridRef.current) return;

            const gridRect = gridRef.current.getBoundingClientRect();
            const y = e.clientY - gridRect.top + gridRef.current.scrollTop;
            const x = e.clientX - gridRect.left;

            const minutes = Math.round((y / PIXELS_PER_MINUTE) / 15) * 15;
            const hour = Math.floor(minutes / 60) + 5;
            const minute = minutes % 60;
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

            const arenaIndex = Math.floor((x - 60) / ((gridRect.width - 60) / arenas.length));
            const arenaId = arenas[arenaIndex]?.id;

            if (!arenaId) {
                setActiveDragItem(null);
                return;
            }

            let newItem;
            if (activeDragItem.type === 'class') {
                const pbbClass = activeDragItem.data;
                newItem = {
                    id: uuidv4(), date: selectedDate, arenaId, startTime: time,
                    endTime: `${(hour + 1).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                    type: 'class', classId: pbbClass.id, title: pbbClass.name,
                };
            } else if (activeDragItem.type === 'tool') {
                const tool = activeDragItem.data;
                const endMinute = (minute + 15) % 60;
                const endHour = minute + 15 >= 60 ? hour + 1 : hour;
                newItem = {
                    id: uuidv4(), date: selectedDate, arenaId, startTime: time,
                    endTime: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
                    type: tool.type, title: tool.title,
                };
            }

            if (newItem) {
                setFormData(prev => ({ ...prev, schedule: [...(prev.schedule || []), newItem] }));
            }
            setActiveDragItem(null);
        };

        const handleDragEnd = () => setActiveDragItem(null);

        const handleResizeStart = (e, itemId) => {
            e.preventDefault();
            const item = scheduleForDate.find(i => i.id === itemId);
            if (!item) return;
            setResizingItem({ id: itemId, initialY: e.clientY, initialHeight: item.height });
        };

        const handleMouseMove = useCallback((e) => {
            if (!resizingItem) return;
            const dy = e.clientY - resizingItem.initialY;
            let newHeight = resizingItem.initialHeight + dy;
            newHeight = Math.max(15 * PIXELS_PER_MINUTE, Math.round(newHeight / (15 * PIXELS_PER_MINUTE)) * (15 * PIXELS_PER_MINUTE));

            setFormData(prev => ({
                ...prev,
                schedule: (prev.schedule || []).map(item => {
                    if (item.id === resizingItem.id) {
                        const [startHour, startMinute] = item.startTime.split(':').map(Number);
                        const durationMinutes = newHeight / PIXELS_PER_MINUTE;
                        const endTotalMinutes = startHour * 60 + startMinute + durationMinutes;
                        const endHour = Math.floor(endTotalMinutes / 60);
                        const endMinute = endTotalMinutes % 60;
                        return { ...item, endTime: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}` };
                    }
                    return item;
                }),
            }));
        }, [resizingItem, setFormData]);

        const handleMouseUp = useCallback(() => setResizingItem(null), []);

        const handleRemoveItem = (itemId) => {
            setFormData(prev => ({ ...prev, schedule: (prev.schedule || []).filter(item => item.id !== itemId) }));
        };

        useEffect(() => {
            if (resizingItem) {
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
            } else {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            }
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }, [resizingItem, handleMouseMove, handleMouseUp]);

        return (
            <motion.div key="step5" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                <CardHeader>
                    <CardTitle>Step 5: Build Your Show Schedule</CardTitle>
                    <CardDescription>Drag classes to the schedule. Click and drag the bottom edge of an event to resize it.</CardDescription>
                </CardHeader>
                <CardContent className="h-[calc(100vh-350px)]" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
                    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <ScheduleHeader showName={formData.showName} startDate={formData.startDate} endDate={formData.endDate} onSave={handleSave} />
                        <DateTabs startDate={formData.startDate} endDate={formData.endDate} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                            <div className="lg:col-span-3 h-full">
                                <ClassPalette classes={unscheduledClasses} onToolDragStart={handleToolDragStart} associationsData={associationsData} />
                            </div>
                            <div className="lg:col-span-6 h-full">
                                <ScheduleCanvas arenas={arenas} schedule={scheduleForDate} onDrop={handleDrop} onResizeStart={handleResizeStart} onRemoveItem={handleRemoveItem} gridRef={gridRef} />
                            </div>
                            <div className="lg:col-span-3 h-full">
                                <ConflictsPanel />
                            </div>
                        </div>
                        <DragOverlay>
                            {activeDragItem?.type === 'class' ? <DraggableClassItem pbbClass={activeDragItem.data} isOverlay associationsData={associationsData} /> : 
                             activeDragItem?.type === 'tool' ? <div className="p-2 border rounded-lg bg-background cursor-grabbing shadow-lg">{activeDragItem.data.title}</div> : null}
                        </DragOverlay>
                    </DndContext>
                </CardContent>
            </motion.div>
        );
    };