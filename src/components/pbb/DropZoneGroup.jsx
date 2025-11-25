import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Edit, Calendar as CalendarIcon, X, Save, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';

const SortableDivisionItem = ({ division, pbbDiscipline, setFormData, formData, associationsData, groupId }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: division.id,
        data: {
            division: division,
            type: 'division',
            sortable: {
                containerId: groupId
            }
        }
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(division.customTitle || '');
    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleTitleSave = () => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newPrintTitles = { ...(disc.divisionPrintTitles || {}), [division.id]: editedTitle };
                    return { ...disc, divisionPrintTitles: newPrintTitles };
                }
                return disc;
            })
        }));
        setIsEditing(false);
    };

    const handleDateSelect = (date) => {
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newDates = { ...(disc.divisionDates || {}), [division.id]: format(date, 'yyyy-MM-dd') };
                    return { ...disc, divisionDates: newDates };
                }
                return disc;
            })
        }));
        setPopoverOpen(false);
    };

    const handleRemoveDate = (e) => {
        e.stopPropagation();
        setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(disc => {
                if (disc.id === pbbDiscipline.id) {
                    const newDates = { ...(disc.divisionDates || {}) };
                    delete newDates[division.id];
                    return { ...disc, divisionDates: newDates };
                }
                return disc;
            })
        }));
    };

    // Parse division name to extract tag and clean name
    const originalDivisionName = division.division.startsWith('custom') ? division.division.substring(7) : division.division;
    const dashIndex = originalDivisionName.indexOf(' - ');
    const divisionTag = dashIndex > -1 ? originalDivisionName.substring(0, dashIndex).trim() : '';
    const cleanedName = dashIndex > -1 ? originalDivisionName.substring(dashIndex + 3).trim() : originalDivisionName;
    const displayName = division.customTitle || cleanedName;

    const getAssociationBadges = () => {
        if (!pbbDiscipline || !formData) return [];

        const badges = [];
        const nsbaDualApprovedWith = formData.nsbaDualApprovedWith || [];

        if (pbbDiscipline.name) {
            badges.push(<Badge key="discipline-badge" variant="discipline" className="text-xs">{pbbDiscipline.name}</Badge>);
        }

        const assoc = associationsData.find(a => a.id === division.assocId);
        if (assoc) {
            badges.push(<Badge key={division.assocId} variant={assoc?.color || 'secondary'} className="text-xs">{assoc.abbreviation || assoc.name}</Badge>);

            if (pbbDiscipline.isDualApproved && nsbaDualApprovedWith.includes(division.assocId)) {
                badges.push(<Badge key={`${division.assocId}-da`} variant="dualApproved" className="text-xs">NSBA Dual-Approved</Badge>);
            }
        }

        if (pbbDiscipline.isNsbaStandalone && division.assocId === 'NSBA') {
            badges.push(<Badge key="nsba-standalone" variant="standalone" className="text-xs">NSBA Standalone</Badge>);
        }

        return badges;
    };


    return (
        <div ref={setNodeRef} style={style} className="relative p-1.5 pr-2 border rounded-md bg-background/70 text-xs flex items-center touch-none w-full group">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 mr-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            {isEditing ? (
                <div className="flex-grow flex items-center gap-1">
                    <Input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="h-6 text-xs"
                        autoFocus
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleTitleSave}><Save className="h-3 w-3" /></Button>
                </div>
            ) : (
                <span className="truncate flex-grow">{displayName}</span>
            )}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(true)}><Edit className="h-3 w-3" /></Button>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6"><CalendarIcon className="h-3 w-3" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={division.date ? parseLocalDate(division.date) : null}
                            onSelect={handleDateSelect}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex items-center gap-1 ml-2">
                {divisionTag && (
                    <Badge variant="outline" className="text-xs">
                        {divisionTag}
                    </Badge>
                )}

                {division.date && (
                    <Badge variant="outline" className="flex items-center gap-1 border-info bg-info/10 text-info-foreground text-xs p-1 h-auto font-normal">
                        <CalendarIcon className="h-3 w-3" />
                        {format(parseLocalDate(division.date), 'EEE, MMM d')}
                        <button onClick={handleRemoveDate} className="ml-1 rounded-full hover:bg-muted-foreground/20"><X className="h-3 w-3" /></button>
                    </Badge>
                )}
                {getAssociationBadges()}
            </div>
        </div>
    );
};


const DropZoneGroup = ({ group, index, pbbDiscipline, handleGroupFieldChange, handleRemovePatternGroup, handleAiAssistClick, setFormData, formData, associationsData }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: group.id,
        data: {
            type: 'group',
        }
    });
    const { attributes, listeners, setNodeRef: setSortableNodeRef, transform, transition } = useSortable({
        id: group.id,
        data: {
            type: 'group',
            sortable: {
                containerId: 'groups-container'
            }
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const divisionsWithDetails = group.divisions.map(div => {
        const id = div.id || `${div.assocId}-${div.division}`;
        const date = (pbbDiscipline.divisionDates && pbbDiscipline.divisionDates[id]) || null;
        const customTitle = (pbbDiscipline.divisionPrintTitles && pbbDiscipline.divisionPrintTitles[id]) || null;
        return { ...div, id, date, customTitle };
    });

    return (
        <div ref={setSortableNodeRef} style={style} className="p-4 border border-border rounded-lg bg-card shadow-sm">
            <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 shrink-0">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                        value={group.name}
                        onChange={(e) => handleGroupFieldChange(pbbDiscipline.id, group.id, 'name', e.target.value)}
                        className="font-semibold h-9 flex-1"
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleAiAssistClick()}><Sparkles className="h-4 w-4 text-primary" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleRemovePatternGroup(pbbDiscipline.id, group.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            </div>
            <div ref={setNodeRef} className={cn('min-h-[80px] p-3 rounded-md bg-muted/30 transition-colors border-2 border-dashed border-border', { 'border-primary bg-primary/10': isOver })}>
                <SortableContext items={divisionsWithDetails.map(d => d.id)} strategy={verticalListSortingStrategy} id={group.id}>
                    <div className="space-y-2">
                        {divisionsWithDetails.map(div => (
                            <SortableDivisionItem key={div.id} division={div} pbbDiscipline={pbbDiscipline} setFormData={setFormData} formData={formData} associationsData={associationsData} groupId={group.id} />
                        ))}
                    </div>
                </SortableContext>
                {group.divisions.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-6">
                        Drop divisions here
                    </div>
                )}
            </div>
        </div>
    );
};

export default DropZoneGroup;