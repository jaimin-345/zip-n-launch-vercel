import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const initialFormData = {
  showName: '',
  showType: 'multi-day',
  associations: {},
  customAssociations: [],
  primaryAffiliates: [],
  nsbaApprovalType: '',
  nsbaCategory: '',
  nsbaDualApprovedWith: [],
  phbaHorseType: 'stock',
  pthaHorseType: 'stock',
  disciplines: [],
  startDate: null,
  endDate: null,
  venueName: '',
  venueAddress: '',
  officials: [],
  staff: [],
  schedule: [],
};

export const useShowBuilder = (showId) => {
  const [formData, setFormData] = useState(initialFormData);
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [disciplineLibrary, setDisciplineLibrary] = useState([]);
  const [associationsData, setAssociationsData] = useState([]);
  const [divisionsData, setDivisionsData] = useState({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [disciplinesRes, associationsRes, divisionsRes] = await Promise.all([
        supabase.from('disciplines').select('*').order('sort_order'),
        supabase.from('associations').select('*').order('position').order('name'),
        supabase.from('divisions').select('*, division_levels(*)').order('sort_order')
      ]);

      if (disciplinesRes.error) throw disciplinesRes.error;
      if (associationsRes.error) throw associationsRes.error;
      if (divisionsRes.error) throw divisionsRes.error;

      const formattedDisciplines = disciplinesRes.data.map(d => ({
        ...d,
        associations: d.association_id ? [{ association_id: d.association_id, sub_association_type: d.sub_association_type }] : []
      }));
      setDisciplineLibrary(formattedDisciplines);
      setAssociationsData(associationsRes.data);
      
      const divisionsByAssoc = (divisionsRes.data || []).reduce((acc, div) => {
          const key = div.association_id;
          
          if (!acc[key]) acc[key] = [];
          
          div.division_levels.sort((a, b) => a.sort_order - b.sort_order);
          
          acc[key].push({ 
              group: div.name, 
              levels: div.division_levels.map(l => l.name),
              sub_association_type: div.sub_association_type 
          });
          return acc;
      }, {});
      setDivisionsData(divisionsByAssoc);

      if (showId) {
        const { data: showData, error: showError } = await supabase
          .from('projects')
          .select('project_data')
          .eq('id', showId)
          .single();

        if (showError) throw showError;
        if (showData && showData.project_data) {
          setFormData(prev => ({ ...initialFormData, ...showData.project_data, id: showId }));
          const savedStep = showData.project_data.currentStep || 1;
          const savedCompleted = showData.project_data.completedSteps || [];
          setStep(savedStep);
          setCompletedSteps(new Set(savedCompleted));
        }
      } else {
        setFormData(initialFormData);
        setStep(1);
        setCompletedSteps(new Set());
      }
    } catch (error) {
      toast({
        title: 'Error fetching data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showId, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const resetDisciplines = () => {
    setFormData(prev => ({ ...prev, disciplines: [] }));
  };

  const createOrUpdateShow = useCallback(async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to save a project.', variant: 'destructive' });
      return null;
    }

    const showDataToSave = {
      ...formData,
      currentStep: step,
      completedSteps: Array.from(completedSteps),
    };

    const showPayload = {
      project_name: formData.showName || 'Untitled Show',
      project_type: 'show',
      project_data: showDataToSave,
      status: 'draft',
      user_id: user.id,
    };

    let currentShowId = showId || formData.id;

    if (currentShowId) {
      const { data, error } = await supabase
        .from('projects')
        .update(showPayload)
        .eq('id', currentShowId)
        .select('id')
        .single();

      if (error) {
        toast({ title: 'Error saving show', description: error.message, variant: 'destructive' });
        return null;
      }
      toast({ title: 'Show Saved!', description: 'Your progress has been successfully saved.' });
      return data;
    } else {
      const newId = uuidv4();
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...showPayload, id: newId }])
        .select('id')
        .single();

      if (error) {
        toast({ title: 'Error creating show', description: error.message, variant: 'destructive' });
        return null;
      }
      
      const newShowId = data.id;
      setFormData(prev => ({ ...prev, id: newShowId }));
      navigate(`/horse-show-manager/edit/${newShowId}`, { replace: true });
      return data;
    }
  }, [formData, step, completedSteps, showId, toast, navigate, user]);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
  const setCurrentStep = (newStep) => setStep(newStep);

  return {
    step,
    setCurrentStep,
    nextStep,
    prevStep,
    formData,
    setFormData,
    completedSteps,
    setCompletedSteps,
    createOrUpdateShow,
    isLoading,
    disciplineLibrary,
    associationsData,
    divisionsData,
    resetDisciplines,
  };
};