import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import AdminBackButton from '@/components/admin/AdminBackButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, X, Loader2, Eye, Trash2, File as FileIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Navigation from '@/components/Navigation';

const AdminPatternExtractorPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ patternName: '', discipline: '', association: '' });
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [patterns, setPatterns] = useState([]);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(true);
  const [disciplines, setDisciplines] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    fetchPatterns();
    fetchDisciplines();
    fetchAssociations();
  };

  const fetchPatterns = async () => {
    setIsLoadingPatterns(true);
    const { data, error } = await supabase
      .from('tbl_patterns')
      .select(`
        *,
        maneuvers:tbl_maneuvers(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error fetching patterns', description: error.message, variant: 'destructive' });
    } else {
      setPatterns(data);
    }
    setIsLoadingPatterns(false);
  };

  const fetchDisciplines = async () => {
    const { data, error } = await supabase.from('disciplines').select('name').order('name');
    if (error) {
      console.error('Error fetching disciplines:', error);
    } else {
      setDisciplines(data.map(d => d.name));
    }
  };

  const fetchAssociations = async () => {
    const { data, error } = await supabase.from('associations').select('name').order('name');
    if (error) {
      console.error('Error fetching associations:', error);
    } else {
      setAssociations(data.map(a => a.name));
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const resetForm = () => {
    setFormData({ patternName: '', discipline: '', association: '' });
    setFile(null);
    setIsUploading(false);
  };

  const handleUploadAndProcess = async () => {
    if (!file || !user) {
      toast({ title: 'Missing information', description: 'Please provide a file and ensure you are logged in.', variant: 'destructive' });
      return;
    }
    setIsUploading(true);

    const fileId = uuidv4();
    const fileName = `${fileId}-${file.name}`;
    const filePath = `public/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('pattern_uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      toast({ title: 'File uploaded successfully!', description: 'Processing has started. This may take a moment.' });
      setIsModalOpen(false);

      const { data: functionData, error: functionError } = await supabase.functions.invoke('extract-patterns', {
        body: {
          file_path: filePath,
          file_name: file.name,
          user_id: user.id,
          form_data: formData,
        },
      });
      
      if (functionError) {
        // Attempt to parse function error if it's a stringified JSON
        let readableError = functionError.message;
        try {
            const errorObj = JSON.parse(functionError.message);
            if(errorObj.error) readableError = errorObj.error;
        } catch (e) {
            // Not a JSON string, use as is
        }
        throw new Error(readableError);
      }
      
      const responseBody = functionData;
      if (responseBody.error) throw new Error(responseBody.error);

      toast({ title: 'Processing complete!', description: responseBody.message || 'Pattern data has been extracted and saved.', variant: 'success' });
      fetchPatterns();
    } catch (error) {
      console.error('Error in upload/process:', error);
      let errorMessage = 'An unexpected error occurred.';
      if (error && error.message) {
        if (error.message.includes("Bucket not found")) {
            errorMessage = "The 'pattern_uploads' bucket does not exist. Please create it in your Supabase storage.";
        } else if (error.message.includes("violates row-level security policy")) {
            errorMessage = "You do not have permission to upload to this bucket. Please check RLS policies.";
        } else {
            errorMessage = error.message;
        }
      }
      toast({ title: 'Error', description: `Failed to upload or process file: ${errorMessage}`, variant: 'destructive' });
    } finally {
      resetForm();
    }
  };

  const memoizedFilePreview = useMemo(() => {
    if (!file) return null;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="mt-4 border rounded-lg p-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <div className="flex flex-col">
            <span className="font-medium text-sm">{file.name}</span>
            <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
          <X className="w-4 h-4" />
        </Button>
      </motion.div>
    );
  }, [file]);

  const openDetailModal = (pattern) => {
    setSelectedPattern(pattern);
    setIsDetailModalOpen(true);
  };

  const handleDeletePattern = async (patternId) => {
    if (!window.confirm('Are you sure you want to delete this pattern and all its associated data? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase.from('tbl_patterns').delete().eq('id', patternId);

    if (error) {
      toast({ title: 'Error deleting pattern', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pattern deleted successfully', variant: 'success' });
      setPatterns(patterns.filter(p => p.id !== patternId));
      if (selectedPattern?.id === patternId) {
        setIsDetailModalOpen(false);
        setSelectedPattern(null);
      }
    }
  };


  return (
    <>
      <Helmet>
        <title>Admin - Pattern Extractor</title>
        <meta name="description" content="Manage and extract data from pattern PDFs." />
      </Helmet>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <main className="flex-grow p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <AdminBackButton />
              <div className="text-center flex-1">
                <h1 className="text-2xl md:text-3xl font-bold">Pattern Extractor</h1>
                <p className="text-sm text-muted-foreground">AI-powered PDF pattern data extraction.</p>
              </div>
              <Button onClick={() => setIsModalOpen(true)}>
                <UploadCloud className="mr-2 h-4 w-4" /> Add New Pattern PDF
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Extracted Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPatterns ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <AnimatePresence>
                      {patterns.map((pattern) => (
                        <motion.div
                          key={pattern.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative group"
                        >
                          <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105">
                            <CardContent className="p-0">
                               <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <FileIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                               </div>
                              <div className="p-4">
                                <p className="font-semibold text-sm truncate">{pattern.association_name}</p>
                                <p className="text-xs text-gray-500">{pattern.discipline} - {pattern.division}</p>
                                <p className="text-xs text-gray-500">Page {pattern.page_no}</p>
                              </div>
                            </CardContent>
                          </Card>
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
                            <Button variant="secondary" size="sm" onClick={() => openDetailModal(pattern)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
                {!isLoadingPatterns && patterns.length === 0 && (
                  <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500">No patterns extracted yet.</p>
                    <p className="text-sm text-gray-400 mt-2">Click "Add New Pattern PDF" to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Pattern PDF</DialogTitle>
                <DialogDescription>
                  Upload a PDF to automatically extract pattern details.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="patternName" className="text-right">Name</Label>
                  <Input id="patternName" name="patternName" value={formData.patternName} onChange={handleInputChange} className="col-span-3" placeholder="e.g., 2025 Nationals Trail Book" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="association" className="text-right">Association</Label>
                  <Select name="association" onValueChange={(value) => handleSelectChange('association', value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select an association" />
                    </SelectTrigger>
                    <SelectContent>
                      {associations.map(assoc => <SelectItem key={assoc} value={assoc}>{assoc}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discipline" className="text-right">Discipline</Label>
                  <Select name="discipline" onValueChange={(value) => handleSelectChange('discipline', value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplines.map(disc => <SelectItem key={disc} value={disc}>{disc}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div
                  {...getRootProps()}
                  className={`mt-2 p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-600 hover:border-primary'}`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                    <UploadCloud className="w-10 h-10" />
                    {isDragActive ? (
                      <p>Drop the PDF here...</p>
                    ) : (
                      <p>Drag 'n' drop a PDF here, or click to select</p>
                    )}
                  </div>
                </div>
                {memoizedFilePreview}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleUploadAndProcess} disabled={!file || isUploading}>
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUploading ? 'Processing...' : 'Upload & Process'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDetailModalOpen && selectedPattern && (
          <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{selectedPattern.association_name} - {selectedPattern.discipline}</DialogTitle>
                <DialogDescription>
                  {selectedPattern.division} - Page {selectedPattern.page_no}
                  {selectedPattern.pattern_date && ` - ${new Date(selectedPattern.pattern_date).toLocaleDateString()}`}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto p-1">
                  <h3 className="font-semibold mb-2">Maneuvers</h3>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Step</TableHead>
                          <TableHead>Instruction</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPattern.maneuvers && selectedPattern.maneuvers.sort((a,b) => a.step_no - b.step_no).map((maneuver) => (
                          <TableRow key={maneuver.id}>
                            <TableCell className="font-medium">{maneuver.step_no}</TableCell>
                            <TableCell>{maneuver.instruction}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                     {(!selectedPattern.maneuvers || selectedPattern.maneuvers.length === 0) && (
                        <p className="text-center text-sm text-gray-500 p-4">No maneuvers were extracted for this pattern.</p>
                    )}
                  </div>
              </div>
              <DialogFooter>
                <Button variant="destructive" onClick={() => handleDeletePattern(selectedPattern.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </Button>
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminPatternExtractorPage;