import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, Plus, FileText, Clock, Trash2, Loader2, ArrowRight, FolderOpen } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const statusBadgeVariant = (status) => {
  switch (status) {
    case 'Submitted': return 'default';
    case 'In progress': return 'secondary';
    case 'Approved': return 'default';
    default: return 'outline';
  }
};

const MyPatternUploadsPage = () => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, status, created_at, updated_at, project_data')
        .eq('user_id', user.id)
        .eq('project_type', 'pattern_upload')
        .order('updated_at', { ascending: false });

      if (error) {
        toast({ title: 'Error loading uploads', description: error.message, variant: 'destructive' });
      } else {
        setProjects(data || []);
      }
      setIsLoading(false);
    };
    fetchProjects();
  }, [user, toast]);

  const handleDelete = async (projectId, projectName) => {
    if (!confirm(`Delete "${projectName || 'Untitled'}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast({ title: 'Deleted', description: 'Pattern upload removed.' });
    }
  };

  const getPatternCount = (projectData) => {
    if (!projectData?.patterns) return 0;
    return Object.values(projectData.patterns).filter(Boolean).length;
  };

  return (
    <>
      <Helmet>
        <title>My Pattern Uploads - EquiPatterns</title>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">My Pattern Uploads</h1>
              <p className="text-muted-foreground mt-1">Manage your pattern set drafts and submissions.</p>
            </div>
            <Button onClick={() => navigate('/upload-patterns/new')}>
              <Plus className="mr-2 h-4 w-4" /> New Pattern Set
            </Button>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground/40 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No pattern uploads yet</h2>
                <p className="text-muted-foreground mb-6">Start by creating your first pattern set.</p>
                <Button onClick={() => navigate('/upload-patterns/new')}>
                  <Upload className="mr-2 h-4 w-4" /> Create Pattern Set
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const patternCount = getPatternCount(project.project_data);
                const updatedAt = new Date(project.updated_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                });
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base font-semibold truncate">
                            {project.project_name || 'Untitled Pattern Upload'}
                          </CardTitle>
                          <Badge variant={statusBadgeVariant(project.status)} className="ml-2 shrink-0">
                            {project.status || 'Draft'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" /> {patternCount} pattern{patternCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {updatedAt}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 flex justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(project.id, project.project_name)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          asChild
                        >
                          <Link to={`/upload-patterns/edit/${project.id}`}>
                            Continue <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default MyPatternUploadsPage;
