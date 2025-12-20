import React, { useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card as UICard, CardContent as UICardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PatternGroupPreview = ({ group, patterns, selectedPatternId, selectedPatternDetail, onPatternSelect, primaryAffiliates = new Set() }) => {
    
    useEffect(() => {
        if (patterns.length > 0 && !selectedPatternId) {
            onPatternSelect(patterns[0].id);
        }
    }, [patterns, selectedPatternId, onPatternSelect]);

    // Display empty state if no patterns
    if (!patterns || patterns.length === 0) {
        return (
            <div className="p-4 border rounded-lg bg-card">
                <div className="mb-3 relative">
                    {group.name === 'Group 1' ? (
                        <div className={`flex items-center gap-2`}>
                            {/* <p className="font-bold text-base">{group.name}</p> */}
                            {selectedPatternDetail && (
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs hover:bg-green-200 hover:text-green-900">
                                    {(() => {
                                        const patternName = selectedPatternDetail.pdf_file_name || '';
                                        const match = patternName.match(/PATTERN\s*\d+/i);
                                        const shortName = match ? match[0].toUpperCase() : patternName;
                                        const version = selectedPatternDetail.pattern_version || 'ALL';
                                        return `${shortName} (${version})`;
                                    })()}
                                </Badge>
                            )}
                        </div>
                    ) : (
                        <div className={`flex items-center gap-2`}>
                            <p className="font-bold text-base">{group.name}</p>
                            {selectedPatternDetail && (
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs hover:bg-green-200 hover:text-green-900">
                                    {(() => {
                                        const patternName = selectedPatternDetail.pdf_file_name || '';
                                        const match = patternName.match(/PATTERN\s*\d+/i);
                                        const shortName = match ? match[0].toUpperCase() : patternName;
                                        const version = selectedPatternDetail.pattern_version || 'ALL';
                                        return `${shortName} (${version})`;
                                    })()}
                                </Badge>
                            )}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {(group.divisions || []).map(div => (
                            <Badge key={`${div.assocId}-${div.division}`} variant="secondary" className="text-xs bg-slate-700 text-white">
                                {div.division} - {div.level || div.divisionLevel || 'All'}
                            </Badge>
                        ))}
                    </div>
                </div>
            
            {/* Selected Pattern Details (Media & Maneuvers) for Empty State */}
            {selectedPatternDetail && (
                <div className="mb-4 space-y-4">
                     {/* Media Section using Carousel Design */}
                     {selectedPatternDetail.media && selectedPatternDetail.media.length > 0 ? (
                        <Carousel 
                            opts={{ align: "center" }} 
                            className="w-full"
                        >
                            <CarouselContent className="flex items-center justify-center">
                                {selectedPatternDetail.media.map((mediaItem, idx) => (
                                    <CarouselItem key={idx} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                                        <div className="p-1">
                                            <UICard className="overflow-hidden bg-slate-900 border-slate-700">
                                                <UICardContent className="flex aspect-[4/5] items-center justify-center p-0 flex-col">
                                                    <div className="relative w-full h-full flex items-center justify-center bg-slate-900 border-2 border-dashed border-slate-700 rounded-sm m-2 overflow-hidden group/media">
                                                        {mediaItem && (
                                                            <img src={mediaItem.image_url || mediaItem.media_url} alt="Pattern Media" className="w-full h-full object-contain" />
                                                        )}

                                                        {/* Maneuvers Overlay */}
                                                        {selectedPatternDetail.maneuvers && selectedPatternDetail.maneuvers.length > 0 && (
                                                            <div className="absolute bottom-0 left-0 w-full bg-black/60 backdrop-blur-sm text-white transition-all duration-300 h-8 hover:h-[90%] overflow-hidden z-10 flex flex-col">
                                                                <div className="flex items-center justify-center h-8 flex-shrink-0 border-t border-white/10 bg-black/40 font-semibold text-xs uppercase tracking-wider cursor-pointer">
                                                                    Maneuvers
                                                                </div>
                                                                <div className="p-4 overflow-y-auto flex-1 text-left">
                                                                    <ol className="list-decimal list-inside space-y-2 text-xs text-slate-200">
                                                                        {selectedPatternDetail.maneuvers.map((step) => (
                                                                            <li key={step.id || step.step_no} className="pl-1 leading-relaxed">
                                                                                <span>{step.instruction}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ol>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </UICardContent>
                                                <div className="p-3 border-t border-slate-700 text-center space-y-2">
                                                    <p className="text-xs font-semibold text-foreground truncate">{selectedPatternDetail.pdf_file_name}</p>
                                                </div>
                                            </UICard>
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                     ) : (
                        <div className="w-full h-48 flex items-center justify-center bg-slate-900 border-2 border-dashed border-slate-700 rounded-sm">
                            <span className="text-muted-foreground text-sm">No Preview Media Available</span>
                        </div>
                     )}
                </div>
            )}
            {!selectedPatternDetail && (
                <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
                    No approved patterns found for this group.
                </div>
            )}
            </div>
        );
    }

    const initialSelectionIndex = Math.max(0, patterns.findIndex(p => p.id === selectedPatternId));

    return (
        <div className="p-4 border rounded-lg bg-card">
            {/* Group Header */}
      
        </div>
    );
};

export default PatternGroupPreview;