import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, Pin, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PatternPreview = ({ previewItem, hierarchyOrder, onAssign, isStaged, onPin, isPinned }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reset loading/error state when previewItem changes
  React.useEffect(() => {
    if (previewItem) {
      setLoading(true);
      setError(null);
      setPageNumber(1);
    }
  }, [previewItem?.id, previewItem?.dataUrl]);

  const handleAssign = (slotId) => {
    if (previewItem && slotId) {
      onAssign(previewItem.id, slotId);
    }
  };

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => {
    setNumPages(nextNumPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err) => {
    setError('Failed to load PDF preview');
    setLoading(false);
    console.error('PDF Load Error:', err);
  };

  // Prefer File object (most reliable for react-pdf), then dataUrl, then file_url
  const hasValidFile = previewItem && (previewItem.file || previewItem.dataUrl || previewItem.file_url);
  const fileSource = previewItem?.file || previewItem?.dataUrl || previewItem?.file_url;

  return (
    <div className="absolute top-0 left-full ml-4 h-auto w-[300px] z-50">
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="shadow-2xl border-2 border-primary/50">
              <CardHeader className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base truncate">{previewItem?.name || 'Pattern Preview'}</CardTitle>
                    <CardDescription className="text-xs">
                      {isStaged ? `Page ${previewItem.pageNumber}` : 'Pattern assigned'}
                    </CardDescription>
                  </div>
                  <Button 
                    variant={isPinned ? "default" : "outline"} 
                    size="icon" 
                    className="h-7 w-7 flex-shrink-0" 
                    onClick={() => onPin(previewItem)}
                  >
                    <Pin className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="h-[200px] bg-muted rounded-md overflow-hidden mb-3">
                  {hasValidFile ? (
                    <>
                      {loading && (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}
                      {error && (
                        <div className="flex flex-col items-center justify-center h-full text-destructive">
                          <AlertTriangle className="h-6 w-6 mb-1" />
                          <p className="text-xs text-center">{error}</p>
                        </div>
                      )}
                      {!error && (
                        <Document
                          file={fileSource}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          loading={null}
                        >
                          <Page 
                            pageNumber={pageNumber} 
                            renderTextLayer={false} 
                            renderAnnotationLayer={false}
                            width={270}
                            height={200}
                          />
                        </Document>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p className="text-xs">No preview available</p>
                    </div>
                  )}
                </div>
                
                {isStaged && hierarchyOrder && (
                  <div className="space-y-2">
                    <Select onValueChange={handleAssign}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Assign to slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {hierarchyOrder.map((slot) => (
                          <SelectItem key={slot.id} value={slot.id} className="text-xs">
                            {slot.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatternPreview;