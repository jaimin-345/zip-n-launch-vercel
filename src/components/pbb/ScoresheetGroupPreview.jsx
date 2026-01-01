import React, { useEffect, useState } from 'react';
import { Card as UICard, CardContent as UICardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

const ScoresheetGroupPreview = ({ group, scoresheets = [], selectedScoresheetId, onScoresheetSelect, primaryAffiliates = new Set(), scoresheetImage }) => {
    
    useEffect(() => {
        if (scoresheets.length > 0 && !selectedScoresheetId) {
            onScoresheetSelect(scoresheets[0].id);
        }
    }, [scoresheets, selectedScoresheetId, onScoresheetSelect]);

    return (
        <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/30">
            <div className="mb-2">
                <p className="font-semibold">{group.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                    {(group.divisions || []).map(div => (
                        <Badge key={`${div.assocId}-${div.division}`} variant="secondary" className="text-xs">{div.division}</Badge>
                    ))}
                </div>
            </div>
            
            <div className="p-1 max-w-sm mx-auto">
                <UICard className="overflow-hidden transition-all duration-300 bg-slate-900 border-slate-700">
                    <UICardContent className="flex aspect-[4/5] items-center justify-center p-0 flex-col">
                        {/* Scoresheet Preview Area */}
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 border-2 border-dashed border-slate-700 rounded-sm m-2 overflow-hidden">
                            {scoresheetImage && scoresheetImage.image_url ? (
                                <HoverCard openDelay={100} closeDelay={100}>
                                    <HoverCardTrigger asChild>
                                        <img 
                                            src={scoresheetImage.image_url} 
                                            alt="Scoresheet" 
                                            className="w-full h-full object-contain border-2 border-slate-600 rounded cursor-zoom-in hover:opacity-80 transition-opacity"
                                            title="Hover to enlarge"
                                        />
                                    </HoverCardTrigger>
                                    <HoverCardContent 
                                        side="top" 
                                        align="center"
                                        sideOffset={10}
                                        className="w-[500px] h-[600px] p-2 bg-background border shadow-2xl z-[9999]"
                                        style={{ position: 'fixed' }}
                                    >
                                        <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded overflow-hidden">
                                            <img 
                                                src={scoresheetImage.image_url} 
                                                alt="Scoresheet - Enlarged" 
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                            ) : (
                                <span className="text-muted-foreground text-sm">No Scoresheet Available</span>
                            )}
                        </div>
                    </UICardContent>
                    {/* Scoresheet Info Footer */}
                    <div className="p-3 border-t border-slate-700 text-center space-y-2">
                        <p className="text-xs font-semibold text-foreground truncate">
                            {scoresheetImage ? 'Scoresheet' : 'No Scoresheet'}
                        </p>
                    </div>
                </UICard>
            </div>
        </div>
    );
};

export default ScoresheetGroupPreview;
