import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const initialFormData = {
  showName: '',
  showNumber: null,
  showType: 'multi-day',
  associations: {},
  customAssociations: [],
  primaryAffiliates: [],
  subAssociationSelections: {},
  selected4HCity: '',
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
  arenas: [],
  officials: [],
  staff: [],
  schedule: [],
  showBill: null,
  layoutSettings: null,
  showStatus: 'draft',
  sponsorLevels: [
    { id: 'platinum', name: 'Platinum', amount: 5000, color: '#E5E4E2', benefits: 'Main arena banner, program cover logo, PA announcements, VIP passes' },
    { id: 'gold', name: 'Gold', amount: 2500, color: '#FFD700', benefits: 'Class sponsorship, program logo, banner placement' },
    { id: 'silver', name: 'Silver', amount: 1000, color: '#C0C0C0', benefits: 'Program listing, shared banner space' },
  ],
  sponsors: [],
};

export const useShowBuilder = (showId) => {
  const [formData, setFormData] = useState(initialFormData);
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [disciplineLibrary, setDisciplineLibrary] = useState([]);
  const [associationsData, setAssociationsData] = useState([]);
  const [divisionsData, setDivisionsData] = useState({});
  const [existingProjects, setExistingProjects] = useState([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const projectsQuery = user
        ? supabase.from('projects').select('id, project_name, project_type, project_data, status').eq('user_id', user.id).not('project_type', 'in', '("pattern_book","pattern_folder","pattern_hub","pattern_upload","contract")').order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null });

      const [disciplinesRes, associationsRes, divisionsRes, projectsRes] = await Promise.all([
        supabase.from('disciplines').select('*').order('sort_order'),
        supabase.from('associations').select('*').order('position').order('name'),
        supabase.from('divisions').select('*, division_levels(*)').order('sort_order'),
        projectsQuery,
      ]);

      if (disciplinesRes.error) throw disciplinesRes.error;
      if (associationsRes.error) throw associationsRes.error;
      if (divisionsRes.error) throw divisionsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setExistingProjects(projectsRes.data || []);

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
          const savedStep = Math.min(showData.project_data.currentStep || 1, 8);
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

  const refreshDisciplineLibrary = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('disciplines').select('*').order('sort_order');
      if (error) throw error;
      const formatted = data.map(d => ({
        ...d,
        associations: d.association_id ? [{ association_id: d.association_id, sub_association_type: d.sub_association_type }] : []
      }));
      setDisciplineLibrary(formatted);
    } catch (error) {
      toast({ title: 'Error refreshing disciplines', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const createOrUpdateShow = useCallback(async (statusOverride) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to save a project.', variant: 'destructive' });
      return null;
    }

    // Validate: show name is required
    const trimmedName = (formData.showName || '').trim();
    if (!trimmedName) {
      toast({ title: 'Show Name Required', description: 'Please enter a show name before saving.', variant: 'destructive' });
      return null;
    }

    // Validate: check for duplicate show names (only for new shows or name changes)
    let currentShowId = showId || formData.id || formData.linkedProjectId;
    const dupQuery = supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('project_type', 'show')
      .eq('user_id', user.id)
      .ilike('project_name', trimmedName);
    if (currentShowId) dupQuery.neq('id', currentShowId);
    const { count: dupCount } = await dupQuery;
    if (dupCount > 0) {
      toast({ title: 'Duplicate Show Name', description: `A show named "${trimmedName}" already exists. Please use a different name.`, variant: 'destructive' });
      return null;
    }

    const effectiveStatus = statusOverride || formData.showStatus || 'draft';

    // Update formData with the status if overridden
    if (statusOverride && statusOverride !== formData.showStatus) {
      setFormData(prev => ({ ...prev, showStatus: statusOverride }));
    }

    // Mark current step as completed on save
    const updatedCompletedSteps = new Set(completedSteps);
    updatedCompletedSteps.add(step);
    setCompletedSteps(updatedCompletedSteps);

    const showDataToSave = {
      ...formData,
      showName: trimmedName,
      showStatus: effectiveStatus,
      currentStep: step,
      completedSteps: Array.from(updatedCompletedSteps),
    };

    const showPayload = {
      project_name: trimmedName,
      project_type: 'show',
      project_data: showDataToSave,
      status: effectiveStatus,
      user_id: user.id,
    };

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
      // Generate sequential show number
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('project_type', 'show');
      const showNumber = (count || 0) + 1;

      const newId = uuidv4();
      const payloadWithNumber = {
        ...showPayload,
        id: newId,
        project_data: { ...showPayload.project_data, showNumber },
      };
      const { data, error } = await supabase
        .from('projects')
        .insert([payloadWithNumber])
        .select('id')
        .single();

      if (error) {
        toast({ title: 'Error creating show', description: error.message, variant: 'destructive' });
        return null;
      }

      const newShowId = data.id;
      setFormData(prev => ({ ...prev, id: newShowId, showNumber }));
      return data;
    }
  }, [formData, step, completedSteps, showId, toast, user]);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 8));
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
    refreshDisciplineLibrary,
    existingProjects,
  };
};