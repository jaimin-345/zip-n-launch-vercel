import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { generatePatternBookPdf } from '@/lib/bookGenerator';
import { Loader2, Eye, Download } from 'lucide-react';

/**
 * Convert a data URI string to a Blob.
 */
function dataUriToBlob(dataUri) {
    const [header, base64] = dataUri.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

/**
 * Reusable Pattern Book Download Dialog
 *
 * Props:
 *  - open: boolean
 *  - onOpenChange: (open: boolean) => void
 *  - project: { id, project_name, project_data }
 */
const PatternBookDownloadDialog = ({ open, onOpenChange, project }) => {
    const { toast } = useToast();
    const [generatingAction, setGeneratingAction] = useState(null); // 'view-a' | 'download-a' | 'view-b' | 'download-b' | null

    const isGenerating = generatingAction !== null;

    const buildPbbData = useCallback((layout) => ({
        ...project?.project_data,
        id: project?.id,
        layoutSelection: layout,
        // Pattern Book PDF must NOT include score sheets
        downloadIncludes: { scoresheet: false },
    }), [project]);

    const handleView = useCallback(async (layout) => {
        const actionKey = `view-${layout === 'layout-a' ? 'a' : 'b'}`;
        try {
            setGeneratingAction(actionKey);
            const pbbData = buildPbbData(layout);
            const pdfDataUri = await generatePatternBookPdf(pbbData);

            const blob = dataUriToBlob(pdfDataUri);
            const blobUrl = URL.createObjectURL(blob);

            const newWindow = window.open(blobUrl, '_blank');
            if (newWindow) {
                newWindow.focus();
                // Keep blob URL alive long enough for the viewer to load
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            } else {
                toast({
                    title: 'Popup Blocked',
                    description: 'Please allow popups to view the PDF.',
                    variant: 'destructive',
                });
                URL.revokeObjectURL(blobUrl);
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({
                title: 'Error',
                description: 'Failed to generate pattern book.',
                variant: 'destructive',
            });
        } finally {
            setGeneratingAction(null);
        }
    }, [buildPbbData, onOpenChange, toast]);

    const handleDownload = useCallback(async (layout) => {
        const actionKey = `download-${layout === 'layout-a' ? 'a' : 'b'}`;
        const layoutLabel = layout === 'layout-a' ? 'A' : 'B';
        try {
            setGeneratingAction(actionKey);
            const pbbData = buildPbbData(layout);
            const pdfDataUri = await generatePatternBookPdf(pbbData);

            const blob = dataUriToBlob(pdfDataUri);
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${project?.project_name || 'Pattern-Book'}_Layout-${layoutLabel}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up after download starts
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

            toast({
                title: 'Success',
                description: `Layout ${layoutLabel} PDF downloaded successfully.`,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({
                title: 'Error',
                description: 'Failed to generate pattern book.',
                variant: 'destructive',
            });
        } finally {
            setGeneratingAction(null);
        }
    }, [buildPbbData, project, onOpenChange, toast]);

    const renderLayoutSection = (layout, label, color, description) => {
        const layoutKey = layout === 'layout-a' ? 'a' : 'b';
        const viewKey = `view-${layoutKey}`;
        const downloadKey = `download-${layoutKey}`;

        return (
            <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`}></div>
                    <h3 className="font-semibold text-lg">{label}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
                <div className="flex gap-3">
                    <Button
                        onClick={() => handleView(layout)}
                        className="flex-1"
                        variant="default"
                        disabled={isGenerating}
                    >
                        {generatingAction === viewKey ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Eye className="h-4 w-4 mr-2" />
                                View {label.split(' - ')[0]}
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={() => handleDownload(layout)}
                        className="flex-1"
                        variant="outline"
                        disabled={isGenerating}
                    >
                        {generatingAction === downloadKey ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                Download {label.split(' - ')[0]}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>View/Download Entire Pattern Book</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <p className="text-sm text-muted-foreground">
                        Choose a layout and action to view or download the entire pattern book.
                    </p>
                    {renderLayoutSection(
                        'layout-a',
                        'Layout A - By Date',
                        'bg-blue-500',
                        'Patterns organized by show date with clean, contemporary styling.'
                    )}
                    {renderLayoutSection(
                        'layout-b',
                        'Layout B - By Discipline',
                        'bg-green-500',
                        'Patterns organized by discipline with traditional, professional styling.'
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PatternBookDownloadDialog;
