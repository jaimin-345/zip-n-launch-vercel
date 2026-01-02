import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabaseClient';
import { fetchImageAsBase64 } from './pdfHelpers';

/**
 * Creates a PDF from an image (pattern or scoresheet)
 */
const createPdfFromImage = async (imageUrl, title) => {
    try {
        const base64 = await fetchImageAsBase64(imageUrl);
        if (!base64) return null;

        const doc = new jsPDF('p', 'pt', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 40;

        // Add title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pageWidth / 2, margin, { align: 'center' });

        // Add image centered on page
        const imgMaxWidth = pageWidth - margin * 2;
        const imgMaxHeight = pageHeight - margin * 3;

        // Create image to get dimensions
        const img = new Image();
        img.src = base64;
        
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });

        let imgWidth = img.width || 500;
        let imgHeight = img.height || 700;

        // Scale image to fit
        const scale = Math.min(imgMaxWidth / imgWidth, imgMaxHeight / imgHeight);
        imgWidth *= scale;
        imgHeight *= scale;

        const x = (pageWidth - imgWidth) / 2;
        const y = margin + 30;

        const imageType = base64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(base64, imageType, x, y, imgWidth, imgHeight);

        return doc.output('blob');
    } catch (error) {
        console.error("Error creating PDF from image:", error);
        return null;
    }
};

/**
 * Sanitizes a filename by removing invalid characters
 */
const sanitizeFilename = (name) => {
    return (name || 'Untitled')
        .replace(/[<>:"/\\|?*]/g, '-')
        .replace(/\s+/g, '_')
        .trim()
        .substring(0, 100);
};

/**
 * Get scoresheet for a discipline and group following the same priority as Step6_Preview
 */
const getScoresheetForGroup = async (discipline, group, projectData, associationsData) => {
    const disciplineKey = `${discipline.association_id}-${discipline.sub_association_type || 'none'}-${discipline.name}-${discipline.pattern_type || 'none'}`;
    
    // Priority 1: Check if scoresheet was selected in Step 3 (per group via patternSelections)
    const patternSelection = projectData.patternSelections?.[discipline.id]?.[group.id];
    if (patternSelection && typeof patternSelection === 'object' && patternSelection.scoresheetData) {
        return patternSelection.scoresheetData;
    }
    
    // Priority 2: Check VRH-RHC Ranch CowWork selections from Step 2
    const vrhSelection = projectData.vrhRanchCowWorkSelections?.[disciplineKey];
    if (vrhSelection) {
        let queryDisciplineName = 'VRH-RHC Ranch CowWork';
        if (vrhSelection === 'rookie') {
            queryDisciplineName = 'VRH-RHC Ranch CowWork Rookie';
        } else if (vrhSelection === 'limited') {
            queryDisciplineName = 'VRH-RHC Ranch CowWork Limited';
        }
        
        const association = associationsData?.find(a => a.id === discipline.association_id);
        if (association?.abbreviation) {
            const { data } = await supabase
                .from('tbl_scoresheet')
                .select('id, pattern_id, image_url, storage_path, discipline')
                .eq('association_abbrev', association.abbreviation)
                .eq('discipline', queryDisciplineName)
                .maybeSingle();
            
            if (data) return data;
        }
    }
    
    // Priority 3: Check disciplineScoresheetSelections from Step 2 (user-selected)
    const userSelectedScoresheet = projectData.disciplineScoresheetSelections?.[disciplineKey];
    if (userSelectedScoresheet && userSelectedScoresheet.image_url) {
        return userSelectedScoresheet;
    }
    
    // Priority 4: Try to get scoresheet by pattern_id if pattern is selected
    const selectedPatternId = patternSelection
        ? (typeof patternSelection === 'object' ? (patternSelection.patternId || patternSelection.id) : patternSelection)
        : null;
    
    if (selectedPatternId) {
        const { data } = await supabase
            .from('tbl_scoresheet')
            .select('id, pattern_id, image_url, storage_path, discipline')
            .eq('pattern_id', parseInt(selectedPatternId))
            .maybeSingle();
        
        if (data) return data;
    }
    
    // Priority 5: Fallback - try to find scoresheet by association and discipline name
    const association = associationsData?.find(a => a.id === discipline.association_id);
    if (association?.abbreviation && discipline.name) {
        const { data } = await supabase
            .from('tbl_scoresheet')
            .select('id, pattern_id, image_url, storage_path, discipline')
            .eq('association_abbrev', association.abbreviation)
            .ilike('discipline', `%${discipline.name}%`)
            .maybeSingle();
        
        if (data) return data;
    }
    
    return null;
};

/**
 * Downloads the pattern book folder as a ZIP file
 * Structure:
 * - PatternBookName/
 *   - DisciplineName/
 *     - GroupName/
 *       - pattern.pdf
 *       - scoresheet.pdf
 */
export const downloadPatternBookFolder = async (projectData, projectName, onProgress) => {
    const zip = new JSZip();
    const rootFolderName = sanitizeFilename(projectName || projectData.showName || 'Pattern_Book');
    const rootFolder = zip.folder(rootFolderName);

    const disciplines = projectData.disciplines || [];
    const patternSelections = projectData.patternSelections || {};

    // Fetch associations data for scoresheet lookups
    let associationsData = [];
    try {
        const { data } = await supabase.from('associations').select('id, abbreviation, name');
        associationsData = data || [];
    } catch (err) {
        console.error('Error fetching associations:', err);
    }

    // Collect all pattern IDs for batch fetching
    const patternIds = new Set();

    // Pattern selections use discipline ID and group ID as keys
    disciplines.forEach((discipline) => {
        const disciplineSelections = patternSelections[discipline.id];
        if (disciplineSelections && typeof disciplineSelections === 'object') {
            Object.values(disciplineSelections).forEach(selection => {
                if (selection) {
                    const patternId = typeof selection === 'object' 
                        ? (selection.patternId || selection.id) 
                        : selection;
                    if (patternId && !isNaN(parseInt(patternId))) {
                        patternIds.add(parseInt(patternId));
                    }
                }
            });
        }
    });

    console.log('Collected pattern IDs for download:', Array.from(patternIds));

    // Fetch pattern data from database
    const patternDataMap = new Map();

    if (patternIds.size > 0) {
        try {
            // Try tbl_pattern_media first
            const { data: mediaData } = await supabase
                .from('tbl_pattern_media')
                .select('pattern_id, image_url')
                .in('pattern_id', Array.from(patternIds));

            if (mediaData) {
                mediaData.forEach(m => patternDataMap.set(m.pattern_id, m.image_url));
            }

            // Fallback to tbl_patterns for missing ones
            const missingPatterns = Array.from(patternIds).filter(id => !patternDataMap.has(id));
            if (missingPatterns.length > 0) {
                const { data: patternsData } = await supabase
                    .from('tbl_patterns')
                    .select('id, image_url, url, pdf_file_name')
                    .in('id', missingPatterns);

                if (patternsData) {
                    patternsData.forEach(p => {
                        patternDataMap.set(p.id, p.image_url || p.url);
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching pattern data:', error);
        }
    }

    console.log(`Fetched ${patternDataMap.size} pattern images`);

    // Process disciplines and create folder structure
    let processedCount = 0;
    const totalItems = disciplines.reduce((sum, d) => sum + (d.patternGroups?.length || 1), 0);

    for (const discipline of disciplines) {
        // Skip disciplines without pattern groups
        const groups = discipline.patternGroups || [];
        if (groups.length === 0) continue;

        const disciplineName = sanitizeFilename(discipline.name || 'Discipline');
        const disciplineFolder = rootFolder.folder(disciplineName);

        for (const group of groups) {
            // Create group folder name from divisions
            const divisions = group.divisions || [];
            let groupName = 'Group';
            
            if (divisions.length > 0) {
                const divisionNames = divisions.map(d => {
                    if (typeof d === 'string') return d;
                    return d.division || d.name || d.id || 'Division';
                });
                groupName = sanitizeFilename(divisionNames.join('_'));
            } else {
                groupName = sanitizeFilename(group.name || `Group_${group.id || 'default'}`);
            }
            
            const groupFolder = disciplineFolder.folder(groupName);

            // Get pattern selection for this group
            const patternSelection = patternSelections[discipline.id]?.[group.id];
            const patternId = patternSelection
                ? (typeof patternSelection === 'object' 
                    ? (patternSelection.patternId || patternSelection.id) 
                    : patternSelection)
                : null;

            // Add pattern PDF
            if (patternId && patternDataMap.has(parseInt(patternId))) {
                const patternUrl = patternDataMap.get(parseInt(patternId));
                if (patternUrl) {
                    const patternName = typeof patternSelection === 'object' && patternSelection.patternName
                        ? patternSelection.patternName
                        : `Pattern_${patternId}`;
                    
                    console.log(`Creating PDF for pattern: ${patternName}`);
                    const pdfBlob = await createPdfFromImage(patternUrl, patternName);
                    if (pdfBlob) {
                        groupFolder.file(`${sanitizeFilename(patternName)}.pdf`, pdfBlob);
                    }
                }
            }

            // Get scoresheet using the same priority logic as Step6_Preview
            const scoresheetData = await getScoresheetForGroup(discipline, group, projectData, associationsData);
            
            if (scoresheetData && scoresheetData.image_url) {
                const scoresheetName = scoresheetData.file_name || 
                                       scoresheetData.display_name ||
                                       scoresheetData.discipline ||
                                       `Scoresheet_${discipline.name}`;
                
                console.log(`Creating PDF for scoresheet: ${scoresheetName}`);
                const pdfBlob = await createPdfFromImage(scoresheetData.image_url, scoresheetName);
                if (pdfBlob) {
                    groupFolder.file(`${sanitizeFilename(scoresheetName)}_scoresheet.pdf`, pdfBlob);
                }
            }

            processedCount++;
            if (onProgress) {
                onProgress(Math.round((processedCount / totalItems) * 50)); // First 50% for processing
            }
        }
    }

    // Generate and download the ZIP file
    const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    }, (metadata) => {
        if (onProgress) {
            onProgress(50 + Math.round(metadata.percent / 2)); // Last 50% for zip generation
        }
    });

    // Trigger download
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rootFolderName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
};
