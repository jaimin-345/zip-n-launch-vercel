import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

const ClassTypeSelector = ({ classType, setClassType, customClassType, setCustomClassType }) => {
  const { toast } = useToast();
  const [disciplineLibrary, setDisciplineLibrary] = useState([]);

  useEffect(() => {
    const fetchDisciplines = async () => {
        const { data, error } = await supabase
            .from('disciplines')
            .select('name')
            .eq('category', 'pattern_and_scoresheet')
            .eq('pattern_type', 'custom')
            .order('sort_order');
            
        if (error) {
            toast({ title: 'Error fetching disciplines', description: error.message, variant: 'destructive' });
        } else {
            setDisciplineLibrary(data.map(d => d.name));
        }
    };
    fetchDisciplines();
  }, [toast]);

  const sortedDisciplineTypes = useMemo(() => {
    const uniqueDisciplines = [...new Set(disciplineLibrary)];
    return uniqueDisciplines.sort();
  }, [disciplineLibrary]);

  const isCustomDiscipline = classType === 'new-discipline';

  return (
    <div className="space-y-2">
      <Label htmlFor="classType" className="font-semibold">Discipline Type</Label>
      <Select value={classType} onValueChange={setClassType}>
        <SelectTrigger id="classType" className="w-full">
          <SelectValue placeholder="Select a discipline type" />
        </SelectTrigger>
        <SelectContent>
          {sortedDisciplineTypes.map(type => (
            <SelectItem key={type} value={type}>{type}</SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="new-discipline">
            <div className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" /> New Discipline...
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      {isCustomDiscipline && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
          <Input
            value={customClassType}
            onChange={(e) => setCustomClassType(e.target.value)}
            placeholder="Enter custom discipline name"
            className="mt-2"
          />
        </motion.div>
      )}
    </div>
  );
};

export default ClassTypeSelector;