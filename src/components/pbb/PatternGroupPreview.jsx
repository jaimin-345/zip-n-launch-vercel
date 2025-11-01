import React, { useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card as UICard, CardContent as UICardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PatternGroupPreview = ({ group, patterns, selectedPatternId, onPatternSelect, primaryAffiliates = new Set() }) => {
    
    useEffect(() => {
        if (patterns.length > 0 && !selectedPatternId) {
            onPatternSelect(patterns[0].id);
        }
    }, [patterns, selectedPatternId, onPatternSelect]);

    if (!patterns || patterns.length === 0) {
        return (
            <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
                No approved patterns found for this group.
            </div>
        );
    }

    const initialSelectionIndex = Math.max(0, patterns.findIndex(p => p.id === selectedPatternId));

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
                            if (patterns[selectedIndex] && patterns[selectedIndex].id !== selectedPatternId) {
                                onPatternSelect(patterns[selectedIndex].id);
                            }
                        };
                        api.on("select", onSelect);
                    }
                }}
                initial-selected-index={initialSelectionIndex}
            >
                <CarouselContent>
                    {patterns.map((pattern) => (
                        <CarouselItem key={pattern.id} className="md:basis-1/2 lg:basis-1/3">
                            <div className="p-1">
                                <UICard className={cn("overflow-hidden transition-all duration-300", pattern.id === selectedPatternId ? 'border-primary ring-2 ring-primary' : 'border-border')}>
                                    <UICardContent className="flex aspect-[4/5.65] items-center justify-center p-2 flex-col">
                                        {pattern.url ?
                                            <img src={pattern.url} alt={pattern.name} className="w-full h-full object-cover rounded-md"/>
                                            : <div className="text-muted-foreground text-sm text-center">No Preview Available</div>
                                        }
                                    </UICardContent>
                                    <div className="p-2 border-t text-center">
                                        <p className="text-xs font-semibold truncate">{pattern.name}</p>
                                        <Badge variant={primaryAffiliates.has(pattern.difficulty) ? 'default' : 'outline'} className="mt-1">{pattern.difficulty}</Badge>
                                    </div>
                                </UICard>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {patterns.length > 3 && (
                    <>
                        <CarouselPrevious className="ml-12" />
                        <CarouselNext className="mr-12"/>
                    </>
                )}
            </Carousel>
        </div>
    );
};

export default PatternGroupPreview;