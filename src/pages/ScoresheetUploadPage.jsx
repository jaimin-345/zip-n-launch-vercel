import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Loader2, Eye, Trash2, PlusCircle, Pen, Image as ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Navigation from '@/components/Navigation';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Label } from '@/components/ui/label';

const ScoresheetUploadPage = () => {
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scoresheets, setScoresheets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedScoresheet, setSelectedScoresheet] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [scoresheetToDelete, setScoresheetToDelete] = useState(null);
    const [editingScoresheetId, setEditingScoresheetId] = useState(null);

    const [patterns, setPatterns] = useState([]);
    const [associations, setAssociations] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [image, setImage] = useState(null);

    const [formData, setFormData] = useState({
        pattern_id: '',
        association_abbrev: '',
        discipline: '',
    });

    useEffect(() => {
        fetchScoresheets();
        fetchPatterns();
        fetchAssociations();
        fetchDisciplines();
    }, []);

    const fetchPatterns = async () => {
        const { data, error } = await supabase
            .from('tbl_patterns')
            .select('id, pdf_file_name, association_name, discipline, division, division_level, pattern_version')
            .order('pdf_file_name');

        if (error) {
            toast({ title: 'Error fetching patterns', description: error.message, variant: 'destructive' });
        } else {
            setPatterns(data || []);
        }
    };

    const fetchAssociations = async () => {
        const { data, error } = await supabase
            .from('associations')
            .select('id, name, abbreviation')
            .order('name');

        if (error) {
            console.error('Error fetching associations:', error);
        } else {
            setAssociations(data || []);
        }
    };

    const fetchDisciplines = async () => {
        const { data, error } = await supabase
            .from('disciplines')
            .select('id, name')
            .order('name');

        if (error) {
            console.error('Error fetching disciplines:', error);
        } else {
            setDisciplines(data || []);
        }
    };

    const fetchScoresheets = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('tbl_scoresheet')
            .select(`*, pattern:tbl_patterns(id, pdf_file_name, association_name, discipline)`)
            .order('created_at', { ascending: false });

        if (error) {
            toast({ title: 'Error fetching scoresheets', description: error.message, variant: 'destructive' });
        } else {
            setScoresheets(data || []);
        }
        setIsLoading(false);
    };

    const resetForm = () => {
        setFormData({
            pattern_id: '',
            association_abbrev: '',
            discipline: '',
        });
        setImage(null);
        setEditingScoresheetId(null);
        setIsFormOpen(false);
        setIsSubmitting(false);
    };



    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setImage(Object.assign(file, {
                preview: URL.createObjectURL(file),
                id: uuidv4()
            }));
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1
    });

    const removeImage = () => {
        if (image && image.preview && image.preview.startsWith('blob:')) {
            URL.revokeObjectURL(image.preview);
        }
        setImage(null);
    };

    const handleSubmit = async () => {
        if (!formData.pattern_id) {
            toast({ title: "Missing required fields", description: "Pattern ID is required.", variant: "destructive" });
            return;
        }

        if (!image && !editingScoresheetId) {
            toast({ title: "Missing image", description: "Please upload a scoresheet image.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);

        try {
            let imageUrl = null;
            let storagePath = null;

            // Upload new image if provided
            if (image && image.size) {
                const filePath = `scoresheets/${uuidv4()}-${image.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('pattern_uploads')
                    .upload(filePath, image);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('pattern_uploads')
                    .getPublicUrl(filePath);

                imageUrl = publicUrl;
                storagePath = filePath;
            }

            const scoresheetPayload = {
                pattern_id: parseInt(formData.pattern_id),
                association_abbrev: formData.association_abbrev,
                discipline: formData.discipline,
            };

            // Add image fields if new image was uploaded
            if (imageUrl) {
                scoresheetPayload.image_url = imageUrl;
                scoresheetPayload.storage_path = storagePath;
            }

            let scoresheetResponse;
            if (editingScoresheetId) {
                // If editing and there's an old image and a new image, delete the old one
                if (imageUrl) {
                    const oldScoresheet = scoresheets.find(s => s.id === editingScoresheetId);
                    if (oldScoresheet && oldScoresheet.storage_path) {
                        await supabase.storage
                            .from('pattern_uploads')
                            .remove([oldScoresheet.storage_path]);
                    }
                }

                scoresheetResponse = await supabase
                    .from('tbl_scoresheet')
                    .update(scoresheetPayload)
                    .eq('id', editingScoresheetId)
                    .select()
                    .single();
            } else {
                scoresheetResponse = await supabase
                    .from('tbl_scoresheet')
                    .insert([scoresheetPayload])
                    .select()
                    .single();
            }

            const { data: scoresheetData, error: scoresheetError } = scoresheetResponse;
            if (scoresheetError) throw scoresheetError;

            toast({
                title: "Success!",
                description: `Scoresheet ${editingScoresheetId ? 'updated' : 'created'} successfully.`
            });
            resetForm();
            fetchScoresheets();

        } catch (error) {
            toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditForm = (scoresheet) => {
        setEditingScoresheetId(scoresheet.id);
        setFormData({
            pattern_id: scoresheet.pattern_id?.toString() || '',
            association_abbrev: scoresheet.association_abbrev || '',
            discipline: scoresheet.discipline || '',
        });
        if (scoresheet.image_url) {
            setImage({
                id: scoresheet.id,
                preview: scoresheet.image_url,
                name: scoresheet.storage_path?.split('/').pop() || 'existing-image'
            });
        }
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (!scoresheetToDelete) return;

        // Delete image from storage if it exists
        if (scoresheetToDelete.storage_path) {
            await supabase.storage
                .from('pattern_uploads')
                .remove([scoresheetToDelete.storage_path]);
        }

        const { error } = await supabase
            .from('tbl_scoresheet')
            .delete()
            .eq('id', scoresheetToDelete.id);

        if (error) {
            toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Scoresheet deleted successfully.' });
            fetchScoresheets();
        }
        setIsDeleteDialogOpen(false);
        setScoresheetToDelete(null);
    };

    return (
        <>
            <Helmet>
                <title>Admin - Scoresheet Upload</title>
            </Helmet>
            <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
                <Navigation />
                <main className="flex-grow p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        <header className="flex flex-col sm:flex-row items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    Scoresheet Upload
                                </h1>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Upload scoresheet images and associate them with patterns
                                </p>
                            </div>
                            <Button onClick={() => { resetForm(); setIsFormOpen(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add New Scoresheet
                            </Button>
                        </header>

                        <Card>
                            <CardHeader><CardTitle>Existing Scoresheets</CardTitle></CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Pattern</TableHead>
                                                <TableHead>Association</TableHead>
                                                <TableHead>Discipline</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {scoresheets.map(s => (
                                                <TableRow key={s.id}>
                                                    <TableCell>{s.pattern?.pdf_file_name || 'N/A'}</TableCell>
                                                    <TableCell>{s.association_abbrev || s.pattern?.association_name || 'N/A'}</TableCell>
                                                    <TableCell>{s.discipline || s.pattern?.discipline || 'N/A'}</TableCell>
                                                    <TableCell className="space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => { setSelectedScoresheet(s); setIsDetailModalOpen(true); }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditForm(s)}
                                                        >
                                                            <Pen className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => { setScoresheetToDelete(s); setIsDeleteDialogOpen(true); }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                                {!isLoading && scoresheets.length === 0 && (
                                    <p className="text-center py-8 text-muted-foreground">No scoresheets found.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>

            <Dialog open={isFormOpen} onOpenChange={(open) => !open && resetForm()}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{editingScoresheetId ? 'Edit' : 'Add New'} Scoresheet</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4 overflow-y-auto pr-2">
                        <div>
                            <Label htmlFor="pattern_id">Pattern *</Label>
                            <Select
                                name="pattern_id"
                                onValueChange={value => {
                                    const selectedPattern = patterns.find(p => p.id.toString() === value);
                                    setFormData(prev => ({
                                        ...prev,
                                        pattern_id: value,
                                        association_abbrev: selectedPattern?.association_name || '',
                                        discipline: selectedPattern?.discipline || '',
                                    }));
                                }}
                                value={formData.pattern_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Pattern" />
                                </SelectTrigger>
                                <SelectContent>
                                    {patterns.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            {p.pdf_file_name} - {p.association_name} ({p.discipline})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="association_abbrev">Association</Label>
                                <Select
                                    value={formData.association_abbrev}
                                    onValueChange={value => setFormData(p => ({ ...p, association_abbrev: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Association" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {associations.map(a => (
                                            <SelectItem key={a.id} value={a.abbreviation || a.name}>
                                                {a.name} {a.abbreviation ? `(${a.abbreviation})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="discipline">Discipline</Label>
                                <Select
                                    value={formData.discipline}
                                    onValueChange={value => setFormData(p => ({ ...p, discipline: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Discipline" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {disciplines.map(d => (
                                            <SelectItem key={d.id} value={d.name}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Card>
                            <CardHeader><CardTitle>Scoresheet Image</CardTitle></CardHeader>
                            <CardContent>
                                {!image ? (
                                    <div
                                        {...getRootProps()}
                                        className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                                            isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                        }`}
                                    >
                                        <input {...getInputProps()} />
                                        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            {isDragActive ? 'Drop the image here' : 'Drag & drop an image here, or click to select'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative group">
                                        <img
                                            src={image.preview}
                                            alt="Scoresheet preview"
                                            className="w-full max-h-96 object-contain rounded-md border"
                                        />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={removeImage}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={resetForm}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editingScoresheetId ? 'Save Changes' : 'Create Scoresheet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-3xl">
                    {selectedScoresheet && (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    Scoresheet - {selectedScoresheet.pattern?.pdf_file_name}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Pattern Details</h3>
                                    <div className="text-sm space-y-1">
                                        <p><span className="font-medium">Association:</span> {selectedScoresheet.pattern?.association_name}</p>
                                        <p><span className="font-medium">Discipline:</span> {selectedScoresheet.pattern?.discipline}</p>
                                    </div>
                                </div>
                                {selectedScoresheet.image_url && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Scoresheet Image</h3>
                                        <img
                                            src={selectedScoresheet.image_url}
                                            alt="Scoresheet"
                                            className="w-full h-auto rounded-md border"
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Are you sure?"
                description="This will permanently delete the scoresheet and its image. This action cannot be undone."
            />
        </>
    );
};

export default ScoresheetUploadPage;
