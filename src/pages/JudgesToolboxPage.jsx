import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Search, FileText, Download, Star, BookOpen, 
  Filter, Eye, Heart, Clock, AlertTriangle 
} from 'lucide-react';

const JudgesToolboxPage = () => {
  const { user, loading } = useAuth();
  const [associations, setAssociations] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [scoresheets, setScoresheets] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Filters
  const [selectedAssociation, setSelectedAssociation] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAssociations();
    fetchDisciplines();
  }, []);

  useEffect(() => {
    if (selectedAssociation || selectedDiscipline) {
      fetchPatterns();
      fetchScoresheets();
    }
  }, [selectedAssociation, selectedDiscipline]);

  const fetchAssociations = async () => {
    const { data } = await supabase
      .from('associations')
      .select('*')
      .order('sort_order', { ascending: true });
    setAssociations(data || []);
  };

  const fetchDisciplines = async () => {
    const { data } = await supabase
      .from('disciplines')
      .select('*')
      .order('sort_order', { ascending: true });
    setDisciplines(data || []);
    setLoadingData(false);
  };

  const fetchPatterns = async () => {
    let query = supabase
      .from('ep_patterns')
      .select('*')
      .eq('status', 'approved');
    
    if (selectedAssociation) {
      query = query.eq('association_id', selectedAssociation);
    }
    if (selectedDiscipline) {
      query = query.ilike('discipline', `%${selectedDiscipline}%`);
    }
    
    const { data } = await query.limit(50);
    setPatterns(data || []);
  };

  const fetchScoresheets = async () => {
    let query = supabase
      .from('association_assets')
      .select('*')
      .eq('asset_type', 'scoresheet');
    
    if (selectedAssociation) {
      query = query.eq('association_id', selectedAssociation);
    }
    
    const { data } = await query.limit(50);
    setScoresheets(data || []);
  };

  const filteredDisciplines = selectedAssociation 
    ? disciplines.filter(d => d.association_id === selectedAssociation)
    : disciplines;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user is a carded judge
  const isCardedJudge = user?.user_metadata?.isCardedJudge;

  if (!user || !isCardedJudge) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8 text-center">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" /> Access Restricted
              </CardTitle>
              <CardDescription>
                This area is only accessible to verified carded judges. 
                Please enable "I am a carded judge" in your profile settings.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Judge's Toolbox - EquiPatterns</title>
        <meta name="description" content="Quick access to score sheets, patterns, and judging resources." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Judge's Toolbox</h1>
              <p className="text-muted-foreground">
                Quick access to score sheets, rulebook patterns, and your favorites.
              </p>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Association</Label>
                    <Select value={selectedAssociation} onValueChange={setSelectedAssociation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select association" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Associations</SelectItem>
                        {associations.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Discipline</Label>
                    <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select discipline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Disciplines</SelectItem>
                        {filteredDisciplines.map(d => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search patterns or sheets..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="scoresheets" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="scoresheets" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Score Sheets
                </TabsTrigger>
                <TabsTrigger value="patterns" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Patterns
                </TabsTrigger>
                <TabsTrigger value="favorites" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" /> My Favorites
                </TabsTrigger>
              </TabsList>

              {/* Score Sheets Tab */}
              <TabsContent value="scoresheets">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingData ? (
                    <div className="col-span-full flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : scoresheets.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No score sheets found. Try adjusting your filters.</p>
                    </div>
                  ) : (
                    scoresheets.map(sheet => (
                      <Card key={sheet.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{sheet.class_name}</h3>
                              <p className="text-sm text-muted-foreground">{sheet.association_id}</p>
                              {sheet.pattern_number && (
                                <Badge variant="outline" className="mt-2">
                                  Pattern #{sheet.pattern_number}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            {sheet.file_url && (
                              <>
                                <Button size="sm" variant="outline" asChild>
                                  <a href={sheet.file_url} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4 mr-1" /> View
                                  </a>
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <a href={sheet.file_url} download>
                                    <Download className="h-4 w-4 mr-1" /> Download
                                  </a>
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost">
                              <Star className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Patterns Tab */}
              <TabsContent value="patterns">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingData ? (
                    <div className="col-span-full flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : patterns.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No patterns found. Try adjusting your filters.</p>
                    </div>
                  ) : (
                    patterns.map(pattern => (
                      <Card key={pattern.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="aspect-video bg-muted rounded-md mb-3 overflow-hidden">
                            {pattern.preview_image_url ? (
                              <img 
                                src={pattern.preview_image_url} 
                                alt={pattern.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <h3 className="font-semibold">{pattern.title}</h3>
                          <p className="text-sm text-muted-foreground">{pattern.discipline}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pattern.level && (
                              <Badge variant="secondary">{pattern.level}</Badge>
                            )}
                            {pattern.level_category && (
                              <Badge variant="outline">{pattern.level_category}</Badge>
                            )}
                          </div>
                          <div className="flex gap-2 mt-4">
                            {pattern.pdf_asset_url && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={pattern.pdf_asset_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4 mr-1" /> View
                                </a>
                              </Button>
                            )}
                            <Button size="sm" variant="ghost">
                              <Heart className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Favorites Tab */}
              <TabsContent value="favorites">
                <Card>
                  <CardContent className="py-12 text-center">
                    <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Your Favorite Patterns</h3>
                    <p className="text-muted-foreground mb-4">
                      Save your top patterns for quick access. Show managers can see your favorites when you're assigned to their shows.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click the heart icon on any pattern to add it to your favorites.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Quick Links */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                    <FileText className="h-6 w-6" />
                    <span className="text-sm">Recent Sheets</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                    <BookOpen className="h-6 w-6" />
                    <span className="text-sm">Recent Patterns</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                    <Download className="h-6 w-6" />
                    <span className="text-sm">Download Pack</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                    <Star className="h-6 w-6" />
                    <span className="text-sm">Assigned Shows</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default JudgesToolboxPage;
