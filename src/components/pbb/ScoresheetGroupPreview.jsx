import React, { useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card as UICard, CardContent as UICardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

const ScoresheetGroupPreview = ({ group, scoresheets = [], selectedScoresheetId, onScoresheetSelect, primaryAffiliates = new Set() }) => {
    
    useEffect(() => {
        if (scoresheets.length > 0 && !selectedScoresheetId) {
            onScoresheetSelect(scoresheets[0].id);
        }
    }, [scoresheets, selectedScoresheetId, onScoresheetSelect]);

    if (!scoresheets || scoresheets.length === 0) {
        return (
            <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
                No approved scoresheets found for this group.
            </div>
        );
    }

    const initialSelectionIndex = Math.max(0, scoresheets.findIndex(p => p.id === selectedScoresheetId));

    return (
        <div>
            <div className="mb-2">
                <p className="font-semibold">{group.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                    {(group.divisions || []).map(div => (
                        <Badge key={`${div.assocId}-${div.division}`} variant="secondary" className="text-xs">{div.division}</Badge>
                    ))}
                </div>
            </div>
            <Carousel 
                opts={{ align: "start" }} 
                className="w-full"
                onSelectApi={(api) => {
                    if (api) {
                        const onSelect = () => {
                            const selectedIndex = api.selectedScrollSnap();
                            if (scoresheets[selectedIndex] && scoresheets[selectedIndex].id !== selectedScoresheetId) {
                                onScoresheetSelect(scoresheets[selectedIndex].id);
                            }
                        };
                        api.on("select", onSelect);
                    }
                }}
                initial-selected-index={initialSelectionIndex}
            >
                <CarouselContent>
                    {scoresheets.map((scoresheet) => (
                        <CarouselItem key={scoresheet.id} className="md:basis-1/2 lg:basis-1/3">
                            <div className="p-1">
                                <UICard className={cn("overflow-hidden transition-all duration-300", scoresheet.id === selectedScoresheetId ? 'border-primary ring-2 ring-primary' : 'border-border')}>
                                    <UICardContent className="flex aspect-[4/5.65] items-center justify-center p-2 flex-col bg-gray-100 dark:bg-gray-800">
                                        <FileText className="w-16 h-16 text-muted-foreground" />
                                    </UICardContent>
                                    <div className="p-2 border-t text-center">
                                        <p className="text-xs font-semibold truncate">{scoresheet.name}</p>
                                        <Badge variant={primaryAffiliates.has(scoresheet.difficulty) ? 'default' : 'outline'} className="mt-1">{scoresheet.difficulty}</Badge>
                                    </div>
                                </UICard>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {scoresheets.length > 3 && (
                    <>
                        <CarouselPrevious className="ml-12" />
                        <CarouselNext className="mr-12"/>
                    </>
                )}
            </Carousel>
        </div>
    );
};

export default ScoresheetGroupPreview;