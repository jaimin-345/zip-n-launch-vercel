import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X, Loader2, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PatternPreviewModal = ({ isOpen, onClose, pattern }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create a stable blob URL from File object if available
  const blobUrl = useMemo(() => {
    if (pattern?.file instanceof File || pattern?.file instanceof Blob) {
      return URL.createObjectURL(pattern.file);
    }
    return null;
  }, [pattern?.file]);

  // Clean up blob URL on unmount or pattern change
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  // Prefer blob URL (from File), then dataUrl, then remote URLs
  const displayUrl = blobUrl || pattern?.dataUrl || pattern?.file_url || pattern?.fileUrl;

  useEffect(() => {
    if (isOpen && displayUrl) {
      setLoading(true);
      setError(null);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    } else if (isOpen && !displayUrl) {
      setError('No file available for preview');
      setLoading(false);
    }
  }, [isOpen, displayUrl]);

  const handleDownload = () => {
    if (displayUrl) {
      const link = document.createElement('a');
      link.href = displayUrl;
      link.download = pattern?.name || 'pattern.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-4 border-b flex flex-row items-center justify-between">
          <DialogTitle>{pattern?.name || 'Pattern Preview'}</DialogTitle>
          <div className="flex items-center gap-2">
            {displayUrl && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-hidden p-4 bg-secondary/30">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full text-destructive">
              <AlertTriangle className="h-10 w-10 mb-2" />
              <p className="font-semibold">{error}</p>
            </div>
          )}
          {!loading && !error && displayUrl && (
            <iframe
              src={displayUrl}
              title={pattern?.name || 'Pattern Preview'}
              width="100%"
              height="100%"
              className="border-none"
              onLoad={() => setLoading(false)}
              onError={() => {
                setError('Failed to load PDF in iframe.');
                setLoading(false);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatternPreviewModal;
