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

    // Display empty state if no patterns
    if (!patterns || patterns.length === 0) {
        return (
            <div className="p-4 border rounded-lg bg-card">
                <div className="mb-3">
                    <p className="font-bold text-base">{group.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {(group.divisions || []).map(div => (
                            <Badge key={`${div.assocId}-${div.division}`} variant="secondary" className="text-xs bg-slate-700 text-white">
                                {div.division} - {div.level || div.divisionLevel || 'All'}
                            </Badge>
                        ))}
                    </div>
                </div>
                <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
                    No approved patterns found for this group.
                </div>
            </div>
        );
    }

    const initialSelectionIndex = Math.max(0, patterns.findIndex(p => p.id === selectedPatternId));

    return (
        <div className="p-4 border rounded-lg bg-card">
            {/* Group Header */}
            <div className="mb-4">
                <p className="font-bold text-base">{group.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {(group.divisions || []).map(div => (
                        <Badge key={`${div.assocId}-${div.division}`} variant="secondary" className="text-xs bg-slate-700 text-white">
                            {div.division} - {div.level || div.divisionLevel || 'All'}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Pattern Carousel */}
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
                <CarouselContent className="-ml-2 md:-ml-4">
                    {patterns.map((pattern) => (
                        <CarouselItem key={pattern.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                            <div className="p-1">
                                <UICard className={cn(
                                    "overflow-hidden transition-all duration-300 bg-slate-900 border-slate-700",
                                    pattern.id === selectedPatternId ? 'border-primary ring-2 ring-primary' : ''
                                )}>
                                    <UICardContent className="flex aspect-[4/5] items-center justify-center p-0 flex-col">
                                        {/* Pattern Preview Area */}
                                        <div className="w-full h-full flex items-center justify-center bg-slate-900 border-2 border-dashed border-slate-700 rounded-sm m-2">
                                            {pattern.url ? (
                                                <img src={pattern.url} alt={pattern.name} className="w-full h-full object-contain"/>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">No Preview Available</span>
                                            )}
                                        </div>
                                    </UICardContent>
                                    {/* Pattern Info Footer */}
                                    <div className="p-3 border-t border-slate-700 text-center space-y-2">
                                        <p className="text-xs font-semibold text-foreground truncate">{pattern.name}</p>
                                        <Badge 
                                            variant={primaryAffiliates.has(pattern.difficulty) ? 'default' : 'outline'} 
                                            className="text-xs bg-slate-700 text-white border-slate-600"
                                        >
                                            {pattern.difficulty || 'Pattern Set'}
                                        </Badge>
                                    </div>
                                </UICard>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2"/>
            </Carousel>
        </div>
    );
};

export default PatternGroupPreview;