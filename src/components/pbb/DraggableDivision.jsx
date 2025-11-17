import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, GripVertical } from 'lucide-react';
import { format } from 'date-fns';

const DraggableDivision = ({ division, id, pbbDiscipline, formData, associationsData }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: id,
        data: {
            division: division,
            type: 'division',
        },
    });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
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
        <div ref={setNodeRef} style={style} className="relative p-1.5 border rounded-md bg-background text-xs flex items-center gap-2 touch-none w-full">
            <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-grow flex items-center">
                <span className="truncate">{displayName}</span>
            </div>
            
            <div className="ml-auto flex items-center gap-1 shrink-0">
                 {division.date && (
                     <Badge variant="outline" className="flex items-center gap-1 border-info bg-info/10 text-info-foreground text-xs p-1 h-auto font-normal">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(division.date), 'MMM d')}
                    </Badge>
                 )}
                
                {getAssociationBadges()}
                {divisionTag && (
                    <Badge variant="outline" className="text-xs ml-1">
                        {divisionTag}
                    </Badge>
                )}
            </div>
        </div>
    );
};

export default DraggableDivision;