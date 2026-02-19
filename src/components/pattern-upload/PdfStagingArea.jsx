import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDraggable } from '@dnd-kit/core';
import { Document, Page } from 'react-pdf';
import { Upload, X, GripVertical, Loader2, Maximize, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const StagedPdfItem = ({ pdf, onRemove, onPreview, onHover, onLeave, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(pdf.displayName || '');

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `staged-${pdf.id}`,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
        position: 'relative',
    } : undefined;

    const handleRenameConfirm = () => {
        const trimmed = editName.trim();
        if (trimmed && trimmed !== pdf.displayName) {
            onRename(pdf.id, trimmed);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleRenameConfirm();
        if (e.key === 'Escape') {
            setEditName(pdf.displayName || '');
            setIsEditing(false);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group"
            onMouseEnter={() => onHover(pdf)}
            onMouseLeave={onLeave}
        >
            <div className="p-2 border rounded-lg bg-background flex items-center gap-2">
                <div {...listeners} {...attributes} className="cursor-grab touch-none">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="w-12 h-16 bg-secondary rounded-sm overflow-hidden flex items-center justify-center flex-shrink-0">
                    <Document file={pdf.dataUrl} loading={<Loader2 className="h-4 w-4 animate-spin" />}>
                        <Page pageNumber={1} width={48} height={64} renderAnnotationLayer={false} renderTextLayer={false} />
                    </Document>
                </div>
                <div className="flex-1 overflow-hidden min-w-0">
                    {isEditing ? (
                        <div className="flex items-center gap-1">
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={handleRenameConfirm}
                                onKeyDown={handleKeyDown}
                                className="h-6 text-xs px-1"
                                autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleRenameConfirm}>
                                <Check className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <p className="text-xs font-medium truncate">{pdf.displayName || pdf.originalFileName}</p>
                    )}
                    <Badge variant="outline" className="mt-0.5">Page {pdf.pageNumber}</Badge>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {!isEditing && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditName(pdf.displayName || ''); setIsEditing(true); }}>
                            <Pencil className="h-3 w-3" />
                        </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onPreview(pdf)}>
                        <Maximize className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(pdf.id)}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

const PdfStagingArea = ({ stagedPdfs, onPdfSplit, onRemove, onPreview, onHover, onLeave, onRename }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: acceptedFiles => acceptedFiles.forEach(onPdfSplit),
        accept: { 'application/pdf': ['.pdf'] },
    });

    return (
        <div className="space-y-2">
            <div {...getRootProps()} className={`p-4 border-2 border-dashed rounded-md text-center cursor-pointer hover:border-primary transition-colors ${isDragActive ? 'border-primary bg-primary/10' : ''}`}>
                <input {...getInputProps()} />
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">Drop multi-page PDF here (max 5 pages)</p>
            </div>
            <ScrollArea className="h-96">
                <div className="space-y-2 pr-3">
                    {stagedPdfs.map(pdf => (
                        <StagedPdfItem
                            key={pdf.id}
                            pdf={pdf}
                            onRemove={onRemove}
                            onPreview={onPreview}
                            onHover={onHover}
                            onLeave={onLeave}
                            onRename={onRename}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

export default PdfStagingArea;
