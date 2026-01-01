import React, { useEffect, useState } from 'react';
import { Card as UICard, CardContent as UICardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { FileText } from 'lucide-react';

const ScoresheetGroupPreview = ({ group, scoresheets = [], selectedScoresheetId, onScoresheetSelect, primaryAffiliates = new Set(), scoresheetImage }) => {
    const [imageZoom, setImageZoom] = useState(1);
    
    useEffect(() => {
        if (scoresheets.length > 0 && !selectedScoresheetId) {
            onScoresheetSelect(scoresheets[0].id);
        }
    }, [scoresheets, selectedScoresheetId, onScoresheetSelect]);

    // Always show the scoresheet if available, even without scoresheet data in the group
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
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 border-2 border-dashed border-slate-700 rounded-sm m-2">
                            {scoresheetImage && scoresheetImage.image_url ? (
                                <HoverCard 
                                    openDelay={200} 
                                    closeDelay={100}
                                    onOpenChange={(open) => {
                                        if (open) {
                                            setImageZoom(1); // Reset zoom when opening
                                        }
                                    }}
                                >
                                    <HoverCardTrigger asChild>
                                        <div className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity">
                                            <img 
                                                src={scoresheetImage.image_url} 
                                                alt="Scoresheet" 
                                                className="w-full h-full object-contain border-2 border-slate-600 rounded"
                                            />
                                        </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent 
                                        className="p-4 z-[9999] w-[600px] max-w-[90vw]" 
                                        align="center" 
                                        side="right" 
                                        sideOffset={10}
                                        style={{ 
                                            zIndex: 9999,
                                            maxHeight: '85vh'
                                        }}
                                    >
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm mb-2">Scoresheet Image</h4>
                                            <div className="rounded-md border-2 border-dashed border-slate-700 bg-slate-900/50 p-4 relative" style={{ 
                                                overflow: 'auto',
                                                maxHeight: '75vh',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'flex-start'
                                            }}>
                                                <img 
                                                    src={scoresheetImage.image_url} 
                                                    alt="Scoresheet - Zoomed" 
                                                    className="transition-transform duration-200 w-full h-auto object-contain"
                                                    loading="lazy"
                                                    style={{ 
                                                        transform: `scale(${imageZoom})`,
                                                        transformOrigin: 'center',
                                                        maxWidth: '100%',
                                                        maxHeight: '70vh',
                                                        display: 'block'
                                                    }}
                                                />
                                                {/* Zoom Controls */}
                                                <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/95 backdrop-blur-sm rounded-md p-1 border shadow-lg z-10">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setImageZoom(prev => Math.min(prev + 0.25, 3));
                                                        }}
                                                        title="Zoom In"
                                                    >
                                                        <ZoomIn className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setImageZoom(prev => Math.max(prev - 0.25, 0.5));
                                                        }}
                                                        title="Zoom Out"
                                                    >
                                                        <ZoomOut className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setImageZoom(1);
                                                        }}
                                                        title="Reset Zoom"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                {/* Zoom Level Indicator */}
                                                {imageZoom !== 1 && (
                                                    <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium border shadow-lg z-10">
                                                        {Math.round(imageZoom * 100)}%
                                                    </div>
                                                )}
                                            </div>
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