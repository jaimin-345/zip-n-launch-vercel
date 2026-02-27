import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { fetchImageAsBase64 } from './pdfHelpers';
import { createGenericScoreSheetPdf } from './genericScoreSheet';
import { parseLocalDate } from '@/lib/utils';

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
            console.log('Fetching pattern images for IDs:', Array.from(patternIds));
            
            // Fetch from tbl_pattern_media using pattern_id
            const { data: mediaData, error: mediaError } = await supabase
                .from('tbl_pattern_media')
                .select('pattern_id, image_url')
                .in('pattern_id', Array.from(patternIds));

            if (mediaError) {
                console.error('Error fetching from tbl_pattern_media:', mediaError);
            }

            if (mediaData && mediaData.length > 0) {
                console.log('Found pattern media data:', mediaData.length, 'records');
                mediaData.forEach(m => {
                    if (m.image_url) {
                        patternDataMap.set(m.pattern_id, m.image_url);
                    }
                });
            }

            console.log('Pattern data map after fetch:', Object.fromEntries(patternDataMap));
        } catch (error) {
            console.error('Error fetching pattern data:', error);
        }
    }

    console.log(`Fetched ${patternDataMap.size} pattern images for ${patternIds.size} pattern IDs`);

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

            // Detect special selection types
            const isCustomRequest = patternSelection?.type === 'customRequest';

            if (isCustomRequest) {
                // --- Custom request: include uploaded file + generic scoresheet ---

                // Include uploaded custom pattern file if available
                if (patternSelection.uploadedFileUrl) {
                    try {
                        const base64 = await fetchImageAsBase64(patternSelection.uploadedFileUrl);
                        if (base64) {
                            const fileName = patternSelection.uploadedFileName || 'Custom_Pattern';
                            const pdfBlob = await createPdfFromImage(patternSelection.uploadedFileUrl, fileName);
                            if (pdfBlob) {
                                groupFolder.file(`${sanitizeFilename(fileName)}.pdf`, pdfBlob);
                                console.log(`✓ Added uploaded custom pattern: ${fileName}`);
                            }
                        }
                    } catch (err) {
                        console.error('Failed to include uploaded custom pattern:', err);
                    }
                }

                // Generate generic scoresheet (no maneuvers)
                const divisions = (group.divisions || []).map(d =>
                    typeof d === 'string' ? d : (d.division || d.name || '')
                ).join(' / ');
                let competitionDate = projectData.startDate;
                if (group.divisions?.length > 0) {
                    const divDate = discipline.divisionDates?.[group.divisions[0]?.id || group.divisions[0]];
                    if (divDate) competitionDate = divDate;
                }
                const dateStr = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';
                const assoc = associationsData?.find(a => a.id === discipline.association_id);
                const judges = Object.values(projectData.associationJudges || {})
                    .flatMap(a => (a.judges || []))
                    .filter(j => j?.name)
                    .map(j => j.name);
                const genericBlob = createGenericScoreSheetPdf({
                    association: assoc?.abbreviation || assoc?.name || '',
                    showName: projectData.showName || '',
                    discipline: discipline.name || '',
                    division: divisions,
                    date: dateStr,
                    judge: judges[0] || '',
                });
                groupFolder.file(`${sanitizeFilename(discipline.name)}_generic_scoresheet.pdf`, genericBlob);
                console.log(`✓ Added generic scoresheet for custom request: ${discipline.name}`);

            } else {
                // --- Standard pattern flow ---

                // Add pattern PDF
                const numericPatternId = patternId ? parseInt(patternId) : null;
                console.log(`Looking for pattern ID ${numericPatternId} in map. Has it? ${patternDataMap.has(numericPatternId)}`);

                if (numericPatternId && patternDataMap.has(numericPatternId)) {
                    const patternUrl = patternDataMap.get(numericPatternId);
                    console.log(`Found pattern URL for ${numericPatternId}:`, patternUrl);
                    if (patternUrl) {
                        const patternName = typeof patternSelection === 'object' && patternSelection.patternName
                            ? patternSelection.patternName
                            : `Pattern_${patternId}`;

                        console.log(`Creating PDF for pattern: ${patternName} from URL: ${patternUrl}`);
                        const pdfBlob = await createPdfFromImage(patternUrl, patternName);
                        if (pdfBlob) {
                            groupFolder.file(`${sanitizeFilename(patternName)}.pdf`, pdfBlob);
                            console.log(`✓ Added pattern PDF: ${patternName}`);
                        } else {
                            console.error(`✗ Failed to create PDF for pattern: ${patternName}`);
                        }
                    }
                } else {
                    console.warn(`Pattern ID ${numericPatternId} not found in pattern data map`);
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
