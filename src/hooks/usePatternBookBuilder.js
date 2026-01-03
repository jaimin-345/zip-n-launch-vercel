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
  subAssociationSelections: {},
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
  associationJudges: {},
  staff: [],
  schedule: [],
  groupDueDates: {},
  groupStaff: {},
  groupJudges: {},
  patternSelections: {},
  disciplinePatterns: {},
  judgeSelections: [],
  dueDateSelections: [],
  disciplineDueDates: {},
};

export const usePatternBookBuilder = (projectId) => {
  // Sanitize projectId - treat "undefined" string as null
  const sanitizedProjectId = projectId && projectId !== 'undefined' ? projectId : null;

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

  // Fetch disciplines function (reusable for refreshing)
  const fetchDisciplines = useCallback(async () => {
    const { data, error } = await supabase.from('disciplines').select('*').order('sort_order');
    if (error) {
      console.error('Error fetching disciplines:', error);
      return [];
    }
    const disciplinesWithAssociationId = data.map(d => ({
      ...d,
      associations: d.association_id ? [{ association_id: d.association_id, sub_association_type: d.sub_association_type }] : []
    }));
    return disciplinesWithAssociationId;
  }, []);

  // Refresh discipline library (call after adding new disciplines)
  const refreshDisciplineLibrary = useCallback(async () => {
    const disciplines = await fetchDisciplines();
    setDisciplineLibrary(disciplines);
  }, [fetchDisciplines]);

  useEffect(() => {
    const fetchInitialData = async () => {
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

        const disciplinesWithAssociationId = disciplinesRes.data.map(d => ({
          ...d,
          associations: d.association_id ? [{ association_id: d.association_id, sub_association_type: d.sub_association_type }] : []
        }));

        setDisciplineLibrary(disciplinesWithAssociationId);
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

        if (sanitizedProjectId) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('project_data')
            .eq('id', sanitizedProjectId)
            .single();

          if (projectError) throw projectError;
          if (projectData && projectData.project_data) {
            setFormData(prev => ({ ...initialFormData, ...projectData.project_data, id: sanitizedProjectId }));
            const savedStep = projectData.project_data.currentStep || 1;
            const savedCompleted = projectData.project_data.completedSteps || [];
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
    };

    fetchInitialData();
  }, [sanitizedProjectId, toast]);

  const handleShowTypeChange = useCallback((newShowType) => {
    setFormData(prev => {
      let newDisciplines = [...(prev.disciplines || [])];
      const vrhDisciplines = disciplineLibrary.filter(d => d.associations.some(a => a.association_id === 'versatility-ranch'));

      if (newShowType === 'versatility-ranch') {
        const existingVrhNames = new Set(newDisciplines.map(d => d.name));
        vrhDisciplines.forEach(vrhDisc => {
          if (!existingVrhNames.has(vrhDisc.name)) {
            newDisciplines.push({
              ...vrhDisc,
              id: `${vrhDisc.name.replace(/\s+/g, '-')}-${Date.now()}`,
              pattern: vrhDisc.category?.startsWith('pattern'),
              scoresheet: vrhDisc.category !== 'none',
              patternType: vrhDisc.pattern_type || 'none',
              isCustom: false,
              selectedAssociations: { 'versatility-ranch': true },
              divisions: { 'versatility-ranch': {} },
              patternGroups: [{ id: `pg-${Date.now()}`, name: 'Pattern 1', divisions: [], competitionDate: null }],
            });
          }
        });
      } else {
        const vrhDisciplineNames = new Set(vrhDisciplines.map(d => d.name));
        newDisciplines = newDisciplines.filter(d => !vrhDisciplineNames.has(d.name));
      }

      newDisciplines.sort((a, b) => {
        const aSort = disciplineLibrary.find(d => d.name === a.name)?.sort_order ?? 999;
        const bSort = disciplineLibrary.find(d => d.name === b.name)?.sort_order ?? 999;
        return aSort - bSort;
      });

      return { ...prev, showType: newShowType, disciplines: newDisciplines };
    });
  }, [disciplineLibrary]);

  const createOrUpdateProject = useCallback(async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to save a project.', variant: 'destructive' });
      return null;
    }

    // Add current step to completedSteps before saving
    const updatedCompletedSteps = new Set(completedSteps);
    updatedCompletedSteps.add(step);
    
    // Update the state so it's reflected immediately
    setCompletedSteps(updatedCompletedSteps);

    // Check if completedSteps contains all steps 1-8
    const completedStepsArray = Array.from(updatedCompletedSteps);
    const allSteps = [1, 2, 3, 4, 5, 6, 7, 8];
    const allStepsComplete = allSteps.every(step => completedStepsArray.includes(step));
    const projectStatus = allStepsComplete ? 'Lock & Approve Mode' : 'Draft';

    const projectToSave = {
      ...formData,
      currentStep: step,
      completedSteps: Array.from(updatedCompletedSteps),
    };

    const projectPayload = {
      project_name: formData.showName || 'Untitled Pattern Book',
      project_type: 'pattern_book',
      project_data: projectToSave,
      status: projectStatus,
      user_id: user.id,
    };

    let currentProjectId = sanitizedProjectId || formData.id;

    if (currentProjectId) {
      const { error } = await supabase
        .from('projects')
        .update(projectPayload)
        .eq('id', currentProjectId);

      if (error) {
        toast({ title: 'Error saving project', description: error.message, variant: 'destructive' });
        return null;
      }
      toast({ title: 'Project Saved!', description: 'Your progress has been successfully saved.' });
      return currentProjectId;
    } else {
      const newId = uuidv4();
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...projectPayload, id: newId }])
        .select('id')
        .single();

      if (error) {
        toast({ title: 'Error creating project', description: error.message, variant: 'destructive' });
        return null;
      }

      const newProjectId = data.id;
      setFormData(prev => ({ ...prev, id: newProjectId }));
      navigate(`/pattern-book-builder/${newProjectId}`, { replace: true });
      toast({ title: 'Project Created & Saved!', description: 'Your new project has been saved.' });
      return newProjectId;
    }
  }, [formData, step, completedSteps, setCompletedSteps, sanitizedProjectId, toast, navigate, user]);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 10));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
  const setCurrentStep = (newStep) => setStep(newStep);

  const resetDisciplines = useCallback(() => {
    setFormData(prev => ({ ...prev, disciplines: [] }));
  }, [setFormData]);

  const resetCurrentStep = useCallback((currentStep) => {
    setFormData(prev => {
      switch (currentStep) {
        case 1:
          return {
            ...prev,
            showName: '',
            associations: {},
            subAssociationSelections: {},
            customAssociations: [],
            primaryAffiliates: [],
            nsbaApprovalType: '',
            nsbaCategory: '',
            nsbaDualApprovedWith: [],
            phbaHorseType: 'stock',
            pthaHorseType: 'stock',
          };
        case 2:
          return { ...prev, disciplines: [] };
        case 3:
          return {
            ...prev,
            disciplines: prev.disciplines.map(d => ({
              ...d,
              divisions: {},
              divisionOrder: [],
              divisionDates: {},
              divisionPrintTitles: {},
              patternGroups: [{ id: `pg-${Date.now()}`, name: 'Group 1', divisions: [], competitionDate: null }],
            })),
            // Also reset Step 5 data that depends on class configuration
            patternSelections: {},
            disciplinePatterns: {},
            groupDueDates: {},
            groupStaff: {},
            groupJudges: {},
            disciplineDueDates: {},
            judgeSelections: [],
            dueDateSelections: [],
          };
        case 4:
          return {
            ...prev,
            startDate: null,
            endDate: null,
            venueName: '',
            venueAddress: '',
            officials: [],
            associationJudges: [],
          };
        case 5:
          return {
            ...prev,
            patternSelections: {},
            disciplinePatterns: {},
            groupDueDates: {},
            groupStaff: {},
            groupJudges: {},
            disciplineDueDates: {},
            judgeSelections: [],
            dueDateSelections: [],
          };
        case 8:
          return {
            ...prev,
            delegations: {},
            adminOwner: null,
            secondAdmin: null,
            publicationDate: null,
          };
        default:
          return prev;
      }
    });
  }, []);

  return {
    step,
    setCurrentStep,
    nextStep,
    prevStep,
    formData,
    setFormData,
    completedSteps,
    setCompletedSteps,
    createOrUpdateProject,
    isLoading,
    disciplineLibrary,
    associationsData,
    divisionsData,
    handleShowTypeChange,
    resetDisciplines,
    resetCurrentStep,
    refreshDisciplineLibrary,
  };
};