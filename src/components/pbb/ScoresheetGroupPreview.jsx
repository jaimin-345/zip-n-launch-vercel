import React, { useEffect, useState } from 'react';
import { Card as UICard, CardContent as UICardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const ScoresheetGroupPreview = ({ group, scoresheets = [], selectedScoresheetId, onScoresheetSelect, primaryAffiliates = new Set(), scoresheetImage }) => {
    const [imageZoom, setImageZoom] = useState(1);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    useEffect(() => {
        if (scoresheets.length > 0 && !selectedScoresheetId) {
            onScoresheetSelect(scoresheets[0].id);
        }
    }, [scoresheets, selectedScoresheetId, onScoresheetSelect]);

    const handleImageClick = () => {
        setImageZoom(1);
        setIsDialogOpen(true);
    };

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
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 border-2 border-dashed border-slate-700 rounded-sm m-2 overflow-hidden">
                            {scoresheetImage && scoresheetImage.image_url ? (
                                <img 
                                    src={scoresheetImage.image_url} 
                                    alt="Scoresheet" 
                                    className="w-full h-full object-contain border-2 border-slate-600 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={handleImageClick}
                                    title="Click to enlarge"
                                />
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

            {/* Enlarged Image Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>Scoresheet Image</DialogTitle>
                    </DialogHeader>
                    <div className="relative">
                        {/* Zoom Controls */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/95 backdrop-blur-sm rounded-md p-1 border shadow-lg z-10">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setImageZoom(prev => Math.min(prev + 0.25, 3))}
                                title="Zoom In"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setImageZoom(prev => Math.max(prev - 0.25, 0.5))}
                                title="Zoom Out"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setImageZoom(1)}
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
                        <div className="overflow-auto max-h-[70vh] rounded-md border bg-muted/20">
                            <div className="flex items-center justify-center p-4 min-h-[400px]">
                                {scoresheetImage && scoresheetImage.image_url && (
                                    <img 
                                        src={scoresheetImage.image_url} 
                                        alt="Scoresheet - Enlarged" 
                                        className="object-contain transition-transform duration-200"
                                        style={{ 
                                            transform: `scale(${imageZoom})`,
                                            transformOrigin: 'center',
                                            maxWidth: '100%',
                                            height: 'auto'
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ScoresheetGroupPreview;
