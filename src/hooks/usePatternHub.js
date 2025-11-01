import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useCart } from '@/hooks/useCart';
import { fetchAssociations } from '@/lib/associationsData';

export const usePatternHub = () => {
    const { toast } = useToast();
    const { addToCart } = useCart();
    
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
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
    });
    
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
                
                setFormData(prev => ({
                    ...prev,
                    startDate: new Date().toISOString().split('T')[0],
                    venueAddress: 'Digital Download',
                }));
    
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
    }, [toast]);

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
    };
};