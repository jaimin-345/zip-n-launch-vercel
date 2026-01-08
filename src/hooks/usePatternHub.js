import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useCart } from '@/hooks/useCart';
import { fetchAssociations } from '@/lib/associationsData';

const initialFormData = {
    usageType: 'individual',
    showType: '',
    associations: {},
    customAssociations: [],
    primaryAffiliates: [],
    nsbaApprovalType: '',
    nsbaCategory: '',
    nsbaDualApprovedWith: [],
    phbaHorseType: 'stock',
    pthaHorseType: 'stock',
    disciplines: [],
    showName: '',
    startDate: '',
    endDate: '',
    venueAddress: '',
    officials: [],
    staff: [],
    coverPageOption: 'none',
    patternSelections: {},
    scoresheetSelections: {},
    groupJudges: {},
    associationJudges: {},
    dueDateSelections: [],
    disciplineDueDates: {},
    groupDueDates: {},
    divisionDates: {},
    divisionOrder: [],
    schedule: [],
    judgeSelections: [],
    customDivisions: [],
    subAssociationSelections: {},
    disciplinePatterns: {},
    open_divisions: false,
    selectedAssociations: {},
    pattern_type: 'rulebook',
    category: 'pattern_and_scoresheet',
    isCustom: false,
    sort_order: 0,
    city: null,
    patternGroups: [],
};

export const usePatternHub = (projectId) => {
    const { toast } = useToast();
    const { addToCart } = useCart();
    
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState(initialFormData);
    const [highestStepReached, setHighestStepReached] = useState(0);
    
    const [isLoading, setIsLoading] = useState(true);
    const [disciplineLibrary, setDisciplineLibrary] = useState([]);
    const [associationsData, setAssociationsData] = useState([]);
    const [divisionsData, setDivisionsData] = useState({});
    const [usagePurposes, setUsagePurposes] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const [disciplinesRes, associations, divisionsRes, purposesRes] = await Promise.all([
                    supabase.from('disciplines').select('*').order('sort_order'),
                    fetchAssociations(),
                    supabase.from('divisions').select('*, division_levels(*)').order('sort_order'),
                    supabase.from('usage_purposes').select('*').order('sort_order')
                ]);
    
                if (disciplinesRes.error) throw disciplinesRes.error;
                if (divisionsRes.error) throw divisionsRes.error;
                if (purposesRes.error) throw purposesRes.error;
    
                const formattedDisciplines = disciplinesRes.data.map(d => ({
                  ...d,
                  associations: d.association_id ? [{ association_id: d.association_id, sub_association_type: d.sub_association_type }] : []
                }));
                setDisciplineLibrary(formattedDisciplines);
                setAssociationsData(associations);
                setUsagePurposes(purposesRes.data);
                
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
                
                // Load existing project data if projectId is provided
                if (projectId && projectId !== 'undefined') {
                    const { data: projectData, error: projectError } = await supabase
                        .from('projects')
                        .select('id, project_name, project_data, status')
                        .eq('id', projectId)
                        .eq('project_type', 'pattern_hub')
                        .maybeSingle();
                    
                    if (projectError) {
                        console.error('Error fetching project:', projectError);
                        toast({
                            title: 'Error loading project',
                            description: projectError.message || 'Failed to load project data',
                            variant: 'destructive',
                        });
                    } else if (projectData && projectData.project_data) {
                        console.log('Loading project data:', projectData);
                        
                        // Extract project_data and merge with initialFormData to ensure all fields are present
                        const savedProjectData = projectData.project_data;
                        
                        // Load project data - merge with initialFormData to ensure all fields exist
                        setFormData(prev => {
                            const mergedData = {
                                ...initialFormData,
                                ...savedProjectData,
                                id: projectId, // Store projectId in formData for reference
                            };
                            console.log('Merged form data:', mergedData);
                            return mergedData;
                        });
                        
                        // Restore step and completed steps from project_data (not from separate columns)
                        const savedStep = savedProjectData.currentStep || 0;
                        const savedCompleted = savedProjectData.completedSteps || [];
                        const maxCompleted = savedCompleted.length > 0 ? Math.max(...savedCompleted) : 0;
                        const maxStep = Math.max(savedStep, maxCompleted);
                        
                        console.log('Restoring step:', savedStep, 'completed steps:', savedCompleted, 'highest:', maxStep);
                        setCurrentStep(savedStep);
                        setHighestStepReached(maxStep);
                    } else {
                        console.log('No project data found, using defaults');
                        // Project not found or not a pattern_hub, use defaults
                        setFormData(prev => ({
                            ...prev,
                            startDate: new Date().toISOString().split('T')[0],
                            venueAddress: 'Digital Download',
                        }));
                    }
                } else {
                    // No projectId, use defaults
                    setFormData(prev => ({
                        ...prev,
                        startDate: new Date().toISOString().split('T')[0],
                        venueAddress: 'Digital Download',
                    }));
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
    }, [projectId, toast]);

    const resetDisciplines = useCallback(() => {
      setFormData(prev => ({ ...prev, disciplines: [] }));
    }, [setFormData]);

    const handlePurchase = async (pricing) => {
        try {
            const product = {
                id: pricing.id,
                title: 'Individual Pattern/Scoresheet Order',
                price_in_cents: pricing.price,
                description: `A custom selection of patterns and score sheets.`,
            };
            const variant = {
                id: `hub_order_${new Date().getTime()}`,
                title: 'Custom Selection',
                price_in_cents: pricing.price,
                manage_inventory: false,
            };
            await addToCart(product, variant, 1, Infinity);
            toast({
                title: 'Added to Cart! 🛒',
                description: 'Your custom selection is now in your shopping cart.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };
    
    return {
        currentStep, setCurrentStep,
        formData, setFormData,
        isLoading,
        disciplineLibrary,
        associationsData,
        divisionsData,
        usagePurposes,
        handlePurchase,
        resetDisciplines,
        highestStepReached,
        setHighestStepReached,
    };
};