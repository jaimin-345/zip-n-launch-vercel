import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabaseClient';
import { fetchImageAsBase64 } from './pdfHelpers';

/**
 * Fetches an image and returns it as a blob
 */
const fetchImageAsBlob = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.blob();
    } catch (error) {
        console.error("Error fetching image:", error);
        return null;
    }
};

/**
 * Converts base64 data URI to blob
 */
const base64ToBlob = (base64, mimeType = 'application/pdf') => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
};

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

        let imgWidth = img.width;
        let imgHeight = img.height;

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
    const scoresheetSelections = projectData.scoresheetSelections || {};

    // Collect all pattern and scoresheet IDs for batch fetching
    const patternIds = new Set();
    const scoresheetIds = new Set();

    disciplines.forEach((discipline, discIndex) => {
        const groups = discipline.patternGroups || [];
        groups.forEach((group, groupIndex) => {
            const patternSelection = patternSelections[discIndex]?.[groupIndex];
            const scoresheetSelection = scoresheetSelections[discIndex]?.[groupIndex];

            if (patternSelection) {
                const patternId = typeof patternSelection === 'object' 
                    ? (patternSelection.patternId || patternSelection.id) 
                    : patternSelection;
                if (patternId) patternIds.add(patternId);
            }

            if (scoresheetSelection) {
                const scoresheetId = typeof scoresheetSelection === 'object'
                    ? (scoresheetSelection.scoresheetId || scoresheetSelection.id)
                    : scoresheetSelection;
                if (scoresheetId) scoresheetIds.add(scoresheetId);
            }
        });
    });

    // Fetch pattern data from database
    const patternDataMap = new Map();
    const scoresheetDataMap = new Map();

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

    // Fetch scoresheet data
    if (scoresheetIds.size > 0) {
        try {
            const { data: scoresheetData } = await supabase
                .from('tbl_scoresheet')
                .select('id, pattern_id, file_url, file_name')
                .in('id', Array.from(scoresheetIds));

            if (scoresheetData) {
                scoresheetData.forEach(s => scoresheetDataMap.set(s.id, { url: s.file_url, name: s.file_name }));
            }

            // Fallback to association_assets if not found
            const missingScoresheet = Array.from(scoresheetIds).filter(id => !scoresheetDataMap.has(id));
            if (missingScoresheet.length > 0) {
                const { data: assetsData } = await supabase
                    .from('association_assets')
                    .select('id, file_url, file_name')
                    .in('id', missingScoresheet);

                if (assetsData) {
                    assetsData.forEach(a => scoresheetDataMap.set(a.id, { url: a.file_url, name: a.file_name }));
                }
            }
        } catch (error) {
            console.error('Error fetching scoresheet data:', error);
        }
    }

    // Process disciplines and create folder structure
    let processedCount = 0;
    const totalItems = disciplines.reduce((sum, d) => sum + (d.patternGroups?.length || 0), 0);

    for (const [discIndex, discipline] of disciplines.entries()) {
        const disciplineName = sanitizeFilename(discipline.name || `Discipline_${discIndex + 1}`);
        const disciplineFolder = rootFolder.folder(disciplineName);

        const groups = discipline.patternGroups || [];

        for (const [groupIndex, group] of groups.entries()) {
            // Create group folder name from divisions
            const divisions = group.divisions || [];
            const groupName = divisions.length > 0
                ? sanitizeFilename(divisions.map(d => d.division || d.name || d).join('_'))
                : `Group_${groupIndex + 1}`;
            
            const groupFolder = disciplineFolder.folder(groupName);

            // Get pattern selection
            const patternSelection = patternSelections[discIndex]?.[groupIndex];
            const patternId = patternSelection
                ? (typeof patternSelection === 'object' 
                    ? (patternSelection.patternId || patternSelection.id) 
                    : patternSelection)
                : null;

            // Get scoresheet selection
            const scoresheetSelection = scoresheetSelections[discIndex]?.[groupIndex];
            const scoresheetId = scoresheetSelection
                ? (typeof scoresheetSelection === 'object'
                    ? (scoresheetSelection.scoresheetId || scoresheetSelection.id)
                    : scoresheetSelection)
                : null;

            // Add pattern PDF
            if (patternId && patternDataMap.has(patternId)) {
                const patternUrl = patternDataMap.get(patternId);
                if (patternUrl) {
                    const patternName = typeof patternSelection === 'object' && patternSelection.patternName
                        ? patternSelection.patternName
                        : `Pattern_${patternId}`;
                    
                    const pdfBlob = await createPdfFromImage(patternUrl, patternName);
                    if (pdfBlob) {
                        groupFolder.file(`${sanitizeFilename(patternName)}.pdf`, pdfBlob);
                    }
                }
            }

            // Add scoresheet PDF
            if (scoresheetId && scoresheetDataMap.has(scoresheetId)) {
                const scoresheetInfo = scoresheetDataMap.get(scoresheetId);
                if (scoresheetInfo?.url) {
                    const scoresheetName = scoresheetInfo.name || `Scoresheet_${scoresheetId}`;
                    
                    // Check if it's already a PDF
                    if (scoresheetInfo.url.toLowerCase().endsWith('.pdf')) {
                        const blob = await fetchImageAsBlob(scoresheetInfo.url);
                        if (blob) {
                            groupFolder.file(`${sanitizeFilename(scoresheetName)}.pdf`, blob);
                        }
                    } else {
                        // Convert image to PDF
                        const pdfBlob = await createPdfFromImage(scoresheetInfo.url, scoresheetName);
                        if (pdfBlob) {
                            groupFolder.file(`${sanitizeFilename(scoresheetName)}.pdf`, pdfBlob);
                        }
                    }
                }
            }

            processedCount++;
            if (onProgress) {
                onProgress(Math.round((processedCount / totalItems) * 100));
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
            onProgress(Math.round(metadata.percent));
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
