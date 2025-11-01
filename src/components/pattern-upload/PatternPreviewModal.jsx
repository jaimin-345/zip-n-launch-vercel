import React, { useState, useEffect } from 'react';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
    import { X, Loader2, AlertTriangle, Download } from 'lucide-react';
    import { Button } from '@/components/ui/button';

    const PatternPreviewModal = ({ isOpen, onClose, pattern }) => {
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);

      const originalFileUrl = pattern?.file_url || pattern?.fileUrl || pattern?.dataUrl;

      useEffect(() => {
        if (isOpen && originalFileUrl) {
          setLoading(true);
          setError(null);
          // A small delay to show loading state, as iframe loading is native and fast
          const timer = setTimeout(() => {
            setLoading(false);
          }, 500); 
          return () => clearTimeout(timer);
        } else if (isOpen && !originalFileUrl) {
          setError('No file available for preview');
          setLoading(false);
        }
      }, [isOpen, originalFileUrl]);

      const handleDownload = () => {
        if (originalFileUrl) {
          const link = document.createElement('a');
          link.href = originalFileUrl;
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
                {originalFileUrl && (
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
                  {originalFileUrl && <p className="text-sm mt-2">File URL: {originalFileUrl}</p>}
                </div>
              )}
              {!loading && !error && originalFileUrl && (
                <iframe
                  src={originalFileUrl}
                  title={pattern?.name || 'Pattern Preview'}
                  width="100%"
                  height="100%"
                  className="border-none"
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setError('Failed to load PDF in iframe. Check the file or URL.');
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