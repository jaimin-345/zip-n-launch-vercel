import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const initialFormData = {
  showName: '',
  showNumber: '',
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
  lockedSections: { step1: false, structure: false },
  showClassNumbers: false,
};

// Migration function: Convert old Prelims/Finals format to new Go 1/Go 2 format
const migrateToGoFormat = (projectData) => {
  if (!projectData || !projectData.disciplines) return projectData;

  const migratedDisciplines = projectData.disciplines.map(discipline => {
    // Skip if already migrated (has divisionGos)
    if (discipline.divisionGos && Object.keys(discipline.divisionGos).length > 0) {
      return discipline;
    }

    const divisionPrelimsDates = discipline.divisionPrelimsDates || {};
    const divisionFinalsDates = discipline.divisionFinalsDates || {};

    // If no old date fields, nothing to migrate
    if (Object.keys(divisionPrelimsDates).length === 0 && Object.keys(divisionFinalsDates).length === 0) {
      return { ...discipline, divisionGos: {} };
    }

    const divisionGos = {};

    // Divisions with Finals date = two-go class
    Object.keys(divisionFinalsDates).forEach(divId => {
      divisionGos[divId] = {
        hasGo2: true,
        go1Date: divisionPrelimsDates[divId] || null,
        go2Date: divisionFinalsDates[divId]
      };
    });

    // Divisions with only Prelims date = single-go class with date
    Object.keys(divisionPrelimsDates).forEach(divId => {
      if (!divisionGos[divId]) {
        divisionGos[divId] = {
          hasGo2: false,
          go1Date: divisionPrelimsDates[divId],
          go2Date: null
        };
      }
    });

    return {
      ...discipline,
      divisionGos,
      // Keep old fields for reference but they're now deprecated
      _migrated_divisionPrelimsDates: divisionPrelimsDates,
      _migrated_divisionFinalsDates: divisionFinalsDates
    };
  });

  return { ...projectData, disciplines: migratedDisciplines };
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
  const [existingProjects, setExistingProjects] = useState([]);
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
        const projectsQuery = user
          ? supabase.from('projects').select('id, project_name, project_type, project_data, status').eq('user_id', user.id).in('project_type', ['show', 'pattern_book']).order('created_at', { ascending: false })
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
        if (projectsRes.data) setExistingProjects(projectsRes.data);

        if (sanitizedProjectId) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('project_data')
            .eq('id', sanitizedProjectId)
            .single();

          if (projectError) throw projectError;
          if (projectData && projectData.project_data) {
            // Migrate old Prelims/Finals format to new Go 1/Go 2 format
            const migratedData = migrateToGoFormat(projectData.project_data);
            setFormData(prev => ({ ...initialFormData, ...migratedData, id: sanitizedProjectId }));
            const savedStep = migratedData.currentStep || 1;
            const savedCompleted = migratedData.completedSteps || [];
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

  // Helper function to get the next available show number
  // Starts from 1000 and increments sequentially, filling any gaps
  const getNextShowNumber = useCallback(async () => {
    try {
      // Fetch all pattern book projects
      const { data: projects, error } = await supabase
        .from('projects')
        .select('project_data')
        .eq('project_type', 'pattern_book');

      if (error) {
        console.error('Error fetching projects for show number:', error);
        return '1000'; // Default to 1000 on error
      }

      // Extract show numbers from project_data
      // Only consider numbers that are >= 1000 and are simple numeric values
      const showNumbers = new Set();
      if (projects && projects.length > 0) {
        projects.forEach(project => {
          const showNumber = project.project_data?.showNumber;
          if (showNumber) {
            const showNumberStr = showNumber.toString().trim();
            // Only consider if it's a simple numeric value (not formats like "2024-001")
            // Check if it's a pure number >= 1000
            if (/^\d+$/.test(showNumberStr)) {
              const numericValue = parseInt(showNumberStr, 10);
              if (!isNaN(numericValue) && numericValue >= 1000) {
                showNumbers.add(numericValue);
              }
            }
          }
        });
      }

      // If no show numbers exist, start from 1000
      if (showNumbers.size === 0) {
        return '1000';
      }

      // Find the next available number sequentially starting from 1000
      // This fills any gaps in the sequence
      for (let num = 1000; num <= 9999; num++) {
        if (!showNumbers.has(num)) {
          return num.toString();
        }
      }

      // If all numbers 1000-9999 are taken, continue from highest + 1
      const highestNumber = Math.max(...Array.from(showNumbers));
      return (highestNumber + 1).toString();
    } catch (error) {
      console.error('Error generating show number:', error);
      return '1000'; // Default to 1000 on error
    }
  }, []);

  const createOrUpdateProject = useCallback(async (explicitStatus) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to save a project.', variant: 'destructive' });
      return null;
    }

    // Auto-generate show number if empty
    let finalFormData = { ...formData };
    if (!finalFormData.showNumber || finalFormData.showNumber.trim() === '') {
      const generatedShowNumber = await getNextShowNumber();
      finalFormData.showNumber = generatedShowNumber;
      // Update formData state so it's reflected in the UI
      setFormData(prev => ({ ...prev, showNumber: generatedShowNumber }));
    }

    // Add current step to completedSteps before saving
    const updatedCompletedSteps = new Set(completedSteps);
    updatedCompletedSteps.add(step);

    // Update the state so it's reflected immediately
    setCompletedSteps(updatedCompletedSteps);

    // If an explicit status is provided (from closeout step), use it directly.
    // Otherwise, auto-determine based on step completion.
    let projectStatus;
    if (explicitStatus) {
      projectStatus = explicitStatus;
      // Persist the status in formData so it's available on reload
      finalFormData.projectStatus = explicitStatus;
      setFormData(prev => ({ ...prev, projectStatus: explicitStatus }));
    } else {
      const completedStepsArray = Array.from(updatedCompletedSteps);
      const allSteps = [1, 2, 3, 4, 5, 6, 7, 8];
      const allStepsComplete = allSteps.every(step => completedStepsArray.includes(step));
      projectStatus = allStepsComplete ? 'Draft' : 'In progress';
    }

    const projectToSave = {
      ...finalFormData,
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

    let currentProjectId = sanitizedProjectId || formData.id || formData.linkedProjectId;

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
      // Auto-lock Step 1 and structure after save
      setFormData(prev => ({
        ...prev,
        id: currentProjectId,
        lockedSections: { ...prev.lockedSections, step1: true, structure: true }
      }));
      // If URL doesn't have the project ID yet, navigate to it
      if (!sanitizedProjectId) {
        navigate(`/pattern-book-builder/${currentProjectId}`, { replace: true });
      }
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
      setFormData(prev => ({
        ...prev,
        id: newProjectId,
        lockedSections: { ...prev.lockedSections, step1: true, structure: true }
      }));
      navigate(`/pattern-book-builder/${newProjectId}`, { replace: true });
      toast({ title: 'Project Created & Saved!', description: 'Your new project has been saved.' });
      return newProjectId;
    }
  }, [formData, step, completedSteps, setCompletedSteps, sanitizedProjectId, toast, navigate, user, getNextShowNumber]);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 10));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
  const setCurrentStep = (newStep) => setStep(newStep);

  const unlockSection = useCallback((sectionKey) => {
    setFormData(prev => ({
      ...prev,
      lockedSections: { ...prev.lockedSections, [sectionKey]: false }
    }));
  }, []);

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
          return { ...prev, disciplines: [], selected4HCity: '' };
        case 3:
          return {
            ...prev,
            disciplines: prev.disciplines.map(d => ({
              ...d,
              divisions: {},
              divisionOrder: [],
              divisionDates: {},
              divisionPrintTitles: {},
              divisionGos: {},  // Go 1/Go 2 configuration
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
            associationJudges: {},
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
    unlockSection,
    existingProjects,
  };
};