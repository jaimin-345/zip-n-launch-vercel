import { supabase } from '@/lib/supabaseClient';

export const fetchImageAsBase64 = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error fetching image as base64:", error);
        return null;
    }
};

/**
 * Compress a base64 image using Canvas API.
 * Resizes to fit within maxWidth × maxHeight (preserving aspect ratio)
 * and outputs JPEG at the given quality.
 */
export const compressImage = (base64, maxWidth = 200, maxHeight = 200, quality = 0.8) => {
    return new Promise((resolve) => {
        if (!base64) { resolve(null); return; }
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            // Scale down if larger than max dimensions
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            // White background (handles PNG transparency)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(null);
        img.src = base64;
    });
};

export const fetchPatternAndScoresheetAssets = async (pbbData) => {
    const assetUrls = {
        patterns: {},
        scoresheets: {}
    };

    const patternIds = new Set();
    const scoresheetIds = new Set();

    if (pbbData.patternSelections) {
        Object.values(pbbData.patternSelections).forEach(disciplineSelection => {
            Object.values(disciplineSelection).forEach(selection => {
                // Skip special selection types (judge-assigned, custom-request)
                if (typeof selection === 'object' && selection !== null) {
                    if (selection.type === 'judgeAssigned' || selection.type === 'customRequest') return;
                    const id = selection.patternId || selection.id;
                    if (id) patternIds.add(id);
                } else if (selection) {
                    patternIds.add(selection);
                }
            });
        });
    }

    if (pbbData.scoresheetSelections) {
        Object.values(pbbData.scoresheetSelections).forEach(disciplineSelection => {
            Object.values(disciplineSelection).forEach(scoresheetId => {
                if (scoresheetId) scoresheetIds.add(scoresheetId);
            });
        });
    }

    const fetchPromises = [];

    if (patternIds.size > 0) {
        fetchPromises.push(
            supabase.from('patterns').select('id, preview_image_url').in('id', Array.from(patternIds))
        );
    } else {
        fetchPromises.push(Promise.resolve({ data: [] }));
    }

    if (scoresheetIds.size > 0) {
        fetchPromises.push(
            supabase.from('association_assets').select('id, file_url').in('id', Array.from(scoresheetIds))
        );
    } else {
        fetchPromises.push(Promise.resolve({ data: [] }));
    }

    const [patternsRes, scoresheetsRes] = await Promise.all(fetchPromises);

    if (patternsRes.data) {
        for (const pattern of patternsRes.data) {
            if (pattern.preview_image_url) {
                assetUrls.patterns[pattern.id] = await fetchImageAsBase64(pattern.preview_image_url);
            }
        }
    }

    if (scoresheetsRes.data) {
        for (const scoresheet of scoresheetsRes.data) {
             if (scoresheet.file_url) {
                assetUrls.scoresheets[scoresheet.id] = await fetchImageAsBase64(scoresheet.file_url);
            }
        }
    }

    return assetUrls;
};