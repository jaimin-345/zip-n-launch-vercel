import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, BookCopy, CalendarDays, PlusCircle, ArrowRight, Pencil, ImageIcon, CalendarIcon, Copy, Link2, Archive } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

const COVER_COLORS = [
    '#4BCE97', '#F5CD47', '#FEA362', '#F87168', '#E774BB', '#C59CDF',
    '#579DFF', '#6CC3E0', '#94C748', '#E388A3'
];

const CoverColorDialog = ({ open, onClose, currentColor, onSelectColor, onRemoveCover }) => {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[320px]">
                <DialogHeader>
                    <DialogTitle>Cover</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Size</p>
                        <div className="flex gap-2">
                            <div className="flex-1 h-12 bg-muted rounded border-2 border-primary flex items-center justify-center">
                                <div className="w-full h-2 bg-primary/30 mx-4 rounded" />
                            </div>
                            <div className="flex-1 h-12 bg-muted rounded border flex items-center justify-center">
                                <div className="w-full h-full bg-primary/20 rounded" />
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" className="w-full" onClick={onRemoveCover}>
                        Remove cover
                    </Button>
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Colors</p>
                        <div className="grid grid-cols-5 gap-2">
                            {COVER_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => onSelectColor(color)}
                                    className={`w-10 h-8 rounded cursor-pointer transition-all hover:scale-110 ${currentColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const DueDateDialog = ({ open, onClose, currentDate, onSaveDate }) => {
    const [selectedDate, setSelectedDate] = useState(currentDate ? new Date(currentDate) : undefined);
    
    const handleSave = () => {
        onSaveDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
        onClose();
    };
    
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[320px]">
                <DialogHeader>
                    <DialogTitle>Edit Due Date</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Due Date</p>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setSelectedDate(undefined)}>
                            Clear
                        </Button>
                        <Button className="flex-1" onClick={handleSave}>
                            Save
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const ProjectCard = ({ project, onUpdateCover }) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [coverDialogOpen, setCoverDialogOpen] = useState(false);
    const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
    const [coverColor, setCoverColor] = useState(project.project_data?.coverColor || null);
    const [dueDate, setDueDate] = useState(project.project_data?.dueDate || null);
    const [isHovered, setIsHovered] = useState(false);
    
    const isPatternBook = project.project_type === 'pattern_book';
    const editPath = isPatternBook
        ? `/pattern-book-builder/${project.id}`
        : `/horse-show-manager/edit/${project.id}`;

    const handleMenuAction = async (action) => {
        switch (action) {
            case 'open':
                navigate(editPath);
                break;
            case 'cover':
                setCoverDialogOpen(true);
                break;
            case 'dates':
                setDueDateDialogOpen(true);
                break;
            case 'link':
                const link = `${window.location.origin}${editPath}`;
                await navigator.clipboard.writeText(link);
                toast({ title: "Link copied", description: "Project link copied to clipboard" });
                break;
            case 'archive':
                await supabase
                    .from('projects')
                    .update({ status: 'archived' })
                    .eq('id', project.id);
                toast({ title: "Project archived", description: "Project has been archived" });
                break;
            default:
                console.log('Action:', action, project.id);
        }
    };

    const handleSelectColor = async (color) => {
        setCoverColor(color);
        const updatedData = { ...project.project_data, coverColor: color };
        await supabase
            .from('projects')
            .update({ project_data: updatedData })
            .eq('id', project.id);
        setCoverDialogOpen(false);
    };

    const handleRemoveCover = async () => {
        setCoverColor(null);
        const updatedData = { ...project.project_data, coverColor: null };
        await supabase
            .from('projects')
            .update({ project_data: updatedData })
            .eq('id', project.id);
        setCoverDialogOpen(false);
    };

    const handleSaveDueDate = async (date) => {
        setDueDate(date);
        const updatedData = { ...project.project_data, dueDate: date };
        await supabase
            .from('projects')
            .update({ project_data: updatedData })
            .eq('id', project.id);
        toast({ title: "Due date updated", description: date ? `Due date set to ${format(new Date(date), 'MMM d, yyyy')}` : "Due date removed" });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
            className="flex flex-col h-full relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Cover Color Bar */}
            {coverColor && (
                <div 
                    className="h-8 w-full rounded-t-lg" 
                    style={{ backgroundColor: coverColor }}
                />
            )}
            
            {/* Edit Menu Button - Only visible on hover */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-2 right-2 z-10 h-7 w-7 bg-background/80 hover:bg-background shadow-sm border transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="bg-red-500 text-white hover:bg-red-600 focus:bg-red-600 focus:text-white rounded-md mb-1">
                        <BookCopy className="mr-2 h-4 w-4" /> Pattern Books
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('open')}>
                        <Pencil className="mr-2 h-4 w-4" /> Open card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('cover')}>
                        <ImageIcon className="mr-2 h-4 w-4" /> Change cover
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('dates')}>
                        <CalendarIcon className="mr-2 h-4 w-4" /> Edit dates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('copy')}>
                        <Copy className="mr-2 h-4 w-4" /> Copy card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('link')}>
                        <Link2 className="mr-2 h-4 w-4" /> Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('archive')}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Card className={`flex flex-col flex-grow glass-effect ${coverColor ? 'rounded-t-none' : ''}`}>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            {isPatternBook ? <BookCopy className="h-6 w-6 text-primary" /> : <CalendarDays className="h-6 w-6 text-primary" />}
                        </div>
                        <div>
                            <CardTitle className="leading-tight">{project.project_name || 'Untitled Project'}</CardTitle>
                            <CardDescription>{isPatternBook ? 'Pattern Book' : 'Horse Show'}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">
                        Last saved: {format(new Date(project.updated_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Status: <span className="capitalize font-medium text-foreground">{project.status || 'Draft'}</span></p>
                    {dueDate && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Due: <span className="font-medium text-foreground">{format(new Date(dueDate), 'MMM d, yyyy')}</span>
                        </p>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={() => navigate(editPath)} className="w-full">
                        Continue Editing <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>

            <CoverColorDialog
                open={coverDialogOpen}
                onClose={() => setCoverDialogOpen(false)}
                currentColor={coverColor}
                onSelectColor={handleSelectColor}
                onRemoveCover={handleRemoveCover}
            />
            
            <DueDateDialog
                open={dueDateDialogOpen}
                onClose={() => setDueDateDialogOpen(false)}
                currentDate={dueDate}
                onSaveDate={handleSaveDueDate}
            />
        </motion.div>
    );
};

const CustomerPortalPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            if (!user) return;
            setIsLoading(true);
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching projects:', error);
            } else {
                setProjects(data);
            }
            setIsLoading(false);
        };

        fetchProjects();
    }, [user]);

    const patternBookProjects = projects.filter(p => p.project_type === 'pattern_book');
    const showManagerProjects = projects.filter(p => p.project_type !== 'pattern_book');

    const renderProjectList = (projectList, title, description, newProjectPath, newProjectLabel) => (
        <div className="mb-16">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground mt-1">{description}</p>
                </div>
                <Button onClick={() => navigate(newProjectPath)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> {newProjectLabel}
                </Button>
            </div>
            {projectList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {projectList.map(project => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">You haven't created any projects here yet.</p>
                </div>
            )}
        </div>
    );

    return (
        <>
            <Helmet>
                <title>Customer Portal - EquiPatterns</title>
                <meta name="description" content="Manage your horse show projects, pattern books, and access exclusive customer tools." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-8">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                            Welcome to Your Portal
                        </h1>
                        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                            This is your command center for all your projects. Manage your pattern books, build show schedules, and access your assets.
                        </p>
                    </motion.div>

                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div>
                            {renderProjectList(
                                patternBookProjects,
                                "Pattern Books",
                                "Create and manage your professional pattern books.",
                                "/pattern-book-builder",
                                "New Pattern Book"
                            )}
                            {renderProjectList(
                                showManagerProjects,
                                "Horse Shows",
                                "Build and organize your complete horse show schedules.",
                                "/horse-show-manager/create",
                                "New Horse Show"
                            )}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default CustomerPortalPage;