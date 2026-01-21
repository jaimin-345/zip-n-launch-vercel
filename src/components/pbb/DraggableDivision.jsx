import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';

const DraggableDivision = ({ division, id, pbbDiscipline, formData, associationsData }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: id,
        data: {
            division: division,
            type: 'division',
            sortable: {
                containerId: 'ungrouped-list'
            }
        },
    });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Parse division name to extract tag and clean name
    // Custom divisions have format "custom-DivisionName", strip the prefix
    const originalDivisionName = division.division.startsWith('custom-') ? division.division.substring(7) : division.division;
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
        <div ref={setNodeRef} style={style} className="relative p-2 border rounded-md bg-background text-xs flex items-center gap-2 touch-none w-full">
            <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1 shrink-0">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-grow min-w-0 flex items-center">
                <span className="truncate">{displayName}</span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {divisionTag && (
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {divisionTag}
                    </Badge>
                )}
                
                 {division.finalsDate && (
                     <Badge variant="outline" className="flex items-center gap-1 border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-xs px-2 py-1 h-auto font-normal whitespace-nowrap">
                        <CalendarIcon className="h-3 w-3" />
                        <span className="font-medium">Finals:</span>
                        {format(parseLocalDate(division.finalsDate), 'EEE, MMM d')}
                    </Badge>
                 )}
                
                {getAssociationBadges()}
            </div>
        </div>
    );
};

export default DraggableDivision;