import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, AlertTriangle, CheckCircle, FileText, Sparkles, ShieldCheck } from 'lucide-react';
import Navigation from '@/components/Navigation';

const PatternCard = ({ pattern, onUpdate }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAiAction = async (action) => {
    setIsProcessing(true);
    let functionName = '';
    let body = {};

    if (action === 'auto-tag') {
      functionName = 'ai-auto-tagger';
      body = { patternData: { title: pattern.title, required_maneuvers: pattern.required_maneuvers } };
    } else if (action === 'validate') {
      functionName = 'ai-maneuver-checker';
      body = { discipline: pattern.discipline, required_maneuvers: pattern.required_maneuvers };
    }

    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body: JSON.stringify(body) });
      if (error) throw error;

      if (action === 'auto-tag') {
        const newTags = [...new Set([...(pattern.tags?.split(',') || []), ...data.tags])].join(',');
        const { data: updatedPattern, error: updateError } = await supabase
          .from('ep_patterns')
          .update({ tags: newTags })
          .eq('id', pattern.id)
          .select()
          .single();
        if (updateError) throw updateError;
        onUpdate(updatedPattern);
        toast({ title: 'AI Auto-Tagging Complete', description: `Added tags: ${data.tags.join(', ')}` });
      } else if (action === 'validate') {
        toast({
          title: 'Validation Result',
          description: data.message,
          variant: data.valid ? 'default' : 'destructive',
        });
      }
    } catch (error) {
      toast({ title: `AI Action Failed`, description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div whileHover={{ y: -5 }} className="h-full">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="aspect-video bg-muted rounded-md mb-4 flex items-center justify-center">
            {pattern.preview_image_url ? (
              <img-replace src={pattern.preview_image_url} alt={pattern.title} className="w-full h-full object-cover rounded-md" />
            ) : (
              <FileText className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <CardTitle className="text-base">{pattern.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow space-y-2">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{pattern.discipline || 'N/A'}</Badge>
            <Badge variant="outline">{pattern.division || 'N/A'}</Badge>
            <Badge variant="outline">{pattern.level || 'N/A'}</Badge>
            <Badge variant="secondary">v{pattern.version || 1}</Badge>
            {pattern.checksum && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Duplicate?</Badge>}
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            {(pattern.tags?.split(',') || []).filter(t => t).map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 items-stretch">
           <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleAiAction('auto-tag')} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Auto-Tag
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleAiAction('validate')} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Validate
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const PatternLibraryPage = () => {
  const [patterns, setPatterns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchPatterns = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ep_patterns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Error fetching patterns', description: error.message, variant: 'destructive' });
      } else {
        setPatterns(data);
      }
      setIsLoading(false);
    };
    fetchPatterns();
  }, [toast]);

  const handlePatternUpdate = (updatedPattern) => {
    setPatterns(prevPatterns =>
      prevPatterns.map(p => (p.id === updatedPattern.id ? updatedPattern : p))
    );
  };

  const filteredPatterns = patterns.filter(p =>
    (p.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.discipline?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.tags?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Pattern Library - EquiPatterns</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight">Pattern Library</h1>
            <p className="text-lg text-muted-foreground">Search, manage, and approve all patterns.</p>
          </motion.div>

          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by association, discipline, division, level, tags, status..."
              className="pl-10 h-12 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPatterns.map(pattern => (
                <PatternCard key={pattern.id} pattern={pattern} onUpdate={handlePatternUpdate} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default PatternLibraryPage;