import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fetchImageAsBase64, fetchPatternAndScoresheetAssets } from './pdfHelpers';
import { supabase } from '@/lib/supabaseClient';
import { parseLocalDate } from '@/lib/utils';
import patternDiagram from '@/assets/pattern-diagram-sample.png';

export const generatePatternBookPdf = async (pbbData) => {
    console.log('Generating PDF for', pbbData);
    
    // Get selected layout (default to 'layout-a' if not specified)
    const selectedLayout = pbbData.layoutSelection || 'layout-a';
    console.log('Selected layout:', selectedLayout);
    
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let yPos = margin;
    let toc = [];

    // --- Helper Functions ---
    const addPageHeader = (text, rightText = null) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(text, margin, margin / 2 + 10);
        if (rightText) {
            doc.text(rightText, pageWidth - margin, margin / 2 + 10, { align: 'right' });
        }
    };

    const addPageFooter = (pageNumber) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        const footerText = `${pbbData.showName || 'Pattern Book'} – Page ${pageNumber}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 20, { align: 'center' });
    };
    
    const addNewPage = () => {
        doc.addPage();
        yPos = margin + 30;
    };

    // Helper function to remove first word, "Pro", and "Non-Pro" from division names
    const removeFirstWord = (name) => {
        if (!name) return name;
        let cleaned = name;
        
        // Remove first word and any separator (dash, hyphen, etc.)
        cleaned = cleaned.replace(/^[^\s-]+\s*[-–—]\s*/, '').trim();
        
        // Remove "Pro" or "Non-Pro" at the start
        cleaned = cleaned.replace(/^(Pro|Non-Pro)\s*[-–—]?\s*/i, '').trim();
        
        // If no separator found and still original, try removing just the first word
        if (cleaned === name) {
            const parts = name.split(/\s+/);
            // Skip first word if it's not "Pro" or "Non-Pro"
            if (parts.length > 1 && !/^(Pro|Non-Pro)$/i.test(parts[0])) {
                cleaned = parts.slice(1).join(' ');
            } else if (parts.length > 1) {
                // If first word is "Pro" or "Non-Pro", remove it and separator if present
                cleaned = parts.slice(1).join(' ').replace(/^\s*[-–—]\s*/, '').trim();
            }
        }
        
        return cleaned || name;
    };

    const addImageToPage = async (base64, x, y, width, height) => {
        if (!base64) return;
        try {
            const imageType = base64.substring(base64.indexOf('/') + 1, base64.indexOf(';'));
            doc.addImage(base64, imageType.toUpperCase(), x, y, width, height);
        } catch (e) {
            console.error("Failed to add image", e);
        }
    };

    const formatAssociationName = (assocId) => {
        const assocNames = {
            'aqha': 'AMERICAN QUARTER HORSE ASSOCIATION',
            'aha': 'ARABIAN HORSE ASSOCIATION',
            'apha': 'AMERICAN PAINT HORSE ASSOCIATION',
            'aphc': 'APPALOOSA HORSE CLUB',
            'nsba': 'NATIONAL SNAFFLE BIT ASSOCIATION',
            'phba': 'PINTO HORSE ASSOCIATION',
            'abra': 'AMERICAN BUCKSKIN REGISTRY ASSOCIATION',
            'ptha': 'PALOMINO HORSE BREEDERS OF AMERICA'
        };
        console.log('assocId', assocId);
        return assocNames[assocId?.toLowerCase()] || assocId?.toUpperCase() || 'HORSE ASSOCIATION';
    };
    
    // --- Fetch Assets ---
    const assets = await fetchPatternAndScoresheetAssets(pbbData);
    let coverImageBase64 = null;
    if (pbbData.coverPageOption === 'upload' && pbbData.marketing?.coverImage?.fileUrl) {
        coverImageBase64 = await fetchImageAsBase64(pbbData.marketing.coverImage.fileUrl);
    }
    
    // Load dummy pattern graph image as fallback
    const dummyPatternBase64 = await fetchImageAsBase64(patternDiagram);
    
    // Fetch real pattern images from database
    const patternImagesMap = new Map();
    const patternIds = new Set();
    
    // Collect all pattern IDs from patternSelections
    // patternSelections can be keyed by discipline ID or index, and group ID or index
    if (pbbData.patternSelections) {
        Object.values(pbbData.patternSelections).forEach(disciplineSelection => {
            if (disciplineSelection) {
                Object.values(disciplineSelection).forEach(selection => {
                    // Handle both object format {patternId: ..., patternName: ...} and direct ID format
                    let patternId = null;
                    if (typeof selection === 'object' && selection !== null) {
                        // Extract patternId from object
                        patternId = selection.patternId || selection.id;
                        // If still an object or null, skip it
                        if (!patternId || (typeof patternId === 'object' && patternId !== null)) {
                            return; // Skip this selection
                        }
                    } else {
                        patternId = selection;
                    }
                    
                    // Convert to number if it's a valid ID
                    if (patternId) {
                        const numericId = typeof patternId === 'number' ? patternId : parseInt(patternId);
                        if (!isNaN(numericId) && isFinite(numericId)) {
                            patternIds.add(numericId);
                        }
                    }
                });
            }
        });
    }
    
    console.log('Collected pattern IDs:', Array.from(patternIds));
    
    // Fetch pattern images from database
    if (patternIds.size > 0) {
        try {
            // First, try to fetch from tbl_pattern_media (priority)
            const { data: mediaData, error: mediaError } = await supabase
                .from('tbl_pattern_media')
                .select('pattern_id, image_url')
                .in('pattern_id', Array.from(patternIds));
            
            if (!mediaError && mediaData) {
                console.log(`Found ${mediaData.length} pattern media records`);
                for (const media of mediaData) {
                    const imageUrl = media.image_url;
                    if (imageUrl && !patternImagesMap.has(media.pattern_id)) {
                        console.log(`Fetching image for pattern ${media.pattern_id}: ${imageUrl}`);
                        const base64 = await fetchImageAsBase64(imageUrl);
                        if (base64) {
                            patternImagesMap.set(media.pattern_id, base64);
                            console.log(`Successfully loaded image for pattern ${media.pattern_id}`);
                        } else {
                            console.warn(`Failed to fetch image for pattern ${media.pattern_id}`);
                        }
                    }
                }
            } else if (mediaError) {
                console.error('Error fetching pattern media:', mediaError);
            }
            
            // For patterns without media, try to fetch from tbl_patterns
            const patternsWithoutMedia = Array.from(patternIds).filter(id => !patternImagesMap.has(id));
            if (patternsWithoutMedia.length > 0) {
                const { data: patternsData, error: patternsError } = await supabase
                    .from('tbl_patterns')
                    .select('id, image_url, url')
                    .in('id', patternsWithoutMedia);
                
                if (!patternsError && patternsData) {
                    console.log(`Found ${patternsData.length} patterns without media, checking tbl_patterns`);
                    for (const pattern of patternsData) {
                        const imageUrl = pattern.image_url || pattern.url;
                        if (imageUrl && !patternImagesMap.has(pattern.id)) {
                            console.log(`Fetching image for pattern ${pattern.id} from tbl_patterns: ${imageUrl}`);
                            const base64 = await fetchImageAsBase64(imageUrl);
                            if (base64) {
                                patternImagesMap.set(pattern.id, base64);
                                console.log(`Successfully loaded image for pattern ${pattern.id} from tbl_patterns`);
                            } else {
                                console.warn(`Failed to fetch image for pattern ${pattern.id} from tbl_patterns`);
                            }
                        }
                    }
                } else if (patternsError) {
                    console.error('Error fetching patterns:', patternsError);
                }
            }
            
        } catch (err) {
            console.error('Error fetching pattern images:', err);
        }
    } else {
        console.log('No pattern IDs found in patternSelections');
    }
    
    console.log(`Total pattern images loaded: ${patternImagesMap.size} out of ${patternIds.size} requested`);
    
    const sponsorLogosBase64 = [];
    if (pbbData.marketing?.sponsorLogos?.length > 0) {
        for(const logo of pbbData.marketing.sponsorLogos) {
            const base64 = await fetchImageAsBase64(logo.fileUrl);
            if(base64) sponsorLogosBase64.push(base64);
        }
    }


    // --- Cover Page ---
    if (selectedLayout === 'layout-b') {
        // LAYOUT B: Classic Design (Programmatic)
        
        // Background - Cream/Off-white
        doc.setFillColor(253, 250, 245); 
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Elegant Border
        doc.setDrawColor(60, 60, 60); // Dark Grey
        doc.setLineWidth(1);
        doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2), 'S');
        
        doc.setLineWidth(3);
        doc.rect(margin + 5, margin + 5, pageWidth - (margin * 2) - 10, pageHeight - (margin * 2) - 10, 'S');
        
        // Title Section
        const centerY = pageHeight / 2;
        
        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'bold');
        doc.setFontSize(50);
        const showTitle = (pbbData.showName || 'Pattern Book').toUpperCase();
        doc.text(showTitle, pageWidth / 2, centerY - 80, { align: 'center', maxWidth: pageWidth - 140 });
        
        // Decorative Line
        doc.setLineWidth(1);
        doc.line(pageWidth / 2 - 100, centerY - 40, pageWidth / 2 + 100, centerY - 40);
        
        // Date & Location
        doc.setFont('times', 'italic');
        doc.setFontSize(24);
        
        if (pbbData.startDate && pbbData.endDate) {
            const dateText = `${format(parseLocalDate(pbbData.startDate), 'MMMM d')} – ${format(parseLocalDate(pbbData.endDate), 'd, yyyy')}`;
            doc.text(dateText, pageWidth / 2, centerY + 20, { align: 'center' });
        }
        
        if (pbbData.venueAddress) {
            doc.setFontSize(18);
            doc.setFont('times', 'normal');
            doc.text(pbbData.venueAddress, pageWidth / 2, centerY + 60, { align: 'center' });
        }
        
        // Associations at bottom
        const associations = Array.isArray(pbbData.associations) ? pbbData.associations : [];
        if (associations.length > 0) {
            doc.setFontSize(14);
            doc.setFont('times', 'bold');
            const assocText = associations.map(a => formatAssociationName(a.id)).join(' • ');
            doc.text(assocText, pageWidth / 2, pageHeight - margin - 40, { align: 'center' });
        }
    } else if (pbbData.coverPageOption !== 'none') {
        // Default Layout A Cover Page (existing logic)
        if (pbbData.coverPageOption === 'upload' && coverImageBase64) {
             await addImageToPage(coverImageBase64, 0, 0, pageWidth, pageHeight);
        } else {
            // White background
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Decorative border (black for white background)
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(3);
            doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2), 'S');
            
            // Title
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(42);
            doc.setFont('helvetica', 'bold');
            const showTitle = (pbbData.showName || 'Pattern Book').toUpperCase();
            doc.text(showTitle, pageWidth / 2, pageHeight / 2 - 100, { align: 'center', maxWidth: pageWidth - 100 });
            
            // Associations
            const associations = Array.isArray(pbbData.associations) ? pbbData.associations : [];
            if (associations.length > 0) {
                doc.setFontSize(20);
                doc.setFont('helvetica', 'normal');
                const assocText = associations.map(a => formatAssociationName(a.id)).join(' • ');
                doc.text(assocText, pageWidth / 2, pageHeight / 2 - 40, { align: 'center', maxWidth: pageWidth - 100 });
            }
            
            // Dates
            doc.setFontSize(16);
            doc.setFont('helvetica', 'normal');
            if (pbbData.startDate && pbbData.endDate) {
                const dateText = `${format(parseLocalDate(pbbData.startDate), 'MMMM d')} – ${format(parseLocalDate(pbbData.endDate), 'd, yyyy')}`;
                doc.text(dateText, pageWidth / 2, pageHeight / 2, { align: 'center' });
            }
            
            // Venue
            if (pbbData.venueAddress) {
                doc.setFontSize(14);
                doc.text(pbbData.venueAddress, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
            }
        }
    }


    // --- Table of Contents ---
    addNewPage();
    
    if (selectedLayout === 'layout-b') {
        // LAYOUT B: Specific TOC Style
        
        // Header
        doc.setFont('times', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('TABLE OF CONTENTS', margin, margin + 20);
        
        // Underline header
        doc.setLineWidth(1);
        doc.line(margin, margin + 25, pageWidth - margin, margin + 25);
        
        // Note: Actual TOC entries are filled at the end of the function
        
    } else {
        // LAYOUT A: Default TOC Style
        // Header is added in the finalize step to include Show Name
    }

    // --- Pattern List (Layout B Only) ---
    if (selectedLayout === 'layout-b') {
        addNewPage();
        
        // Header
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text('(Patterns located in the Rule Book)', pageWidth / 2, margin + 20, { align: 'center' });
        
        yPos = margin + 50;
        
        for (const [discIndex, discipline] of (pbbData.disciplines || []).entries()) {
            // Check if discipline has any valid groups
            const hasValidGroups = (discipline.patternGroups || []).some(g => g.divisions && g.divisions.length > 0);
            if (!hasValidGroups) continue;

            if (yPos > pageHeight - margin - 50) {
                addNewPage();
                yPos = margin + 30;
            }
            
            // Discipline Header
            doc.setFont('times', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text(discipline.name, margin, yPos);
            yPos += 15;
            
            // Column Headers
            doc.setFontSize(10);
            doc.text('Class', margin, yPos);
            doc.text('Pattern #', pageWidth - margin, yPos, { align: 'right' });
            
            // Line under headers
            doc.setLineWidth(1);
            doc.line(margin, yPos + 5, pageWidth - margin, yPos + 5);
            yPos += 20;
            
            // List Classes
            doc.setFont('times', 'normal');
            doc.setFontSize(10);
            
            for (const [groupIndex, group] of (discipline.patternGroups || []).entries()) {
                if (!group.divisions || group.divisions.length === 0) continue;

                if (yPos > pageHeight - margin) {
                    addNewPage();
                    yPos = margin + 30;
                }
                
                const divisions = group.divisions?.map(d => removeFirstWord(d.division || '')).join(', ');
                // Extract pattern ID - handle both object format and direct ID
                const patternSelection = pbbData.patternSelections?.[discIndex]?.[groupIndex];
                let patternId = null;
                if (patternSelection) {
                    if (typeof patternSelection === 'object' && patternSelection !== null) {
                        patternId = patternSelection.patternId || patternSelection.id || patternSelection;
                    } else {
                        patternId = patternSelection;
                    }
                }
                // Use patternId or a placeholder if not found. 
                // Ideally we would look up the pattern number/name from a patterns list.
                // For now, we'll display the ID or "TBD" if missing. 
                // If ID is a long UUID, we might want to truncate or handle differently.
                // Assuming for now it might be a simple ID or we just show it.
                const patternDisplay = patternId ? patternId.toString().substring(0, 8) : 'TBD'; 
                
                // Class Name
                doc.text(divisions, margin, yPos);
                
                // Pattern #
                doc.text(patternDisplay, pageWidth - margin, yPos, { align: 'right' });
                
                // Dotted Leader
                const nameWidth = doc.getTextWidth(divisions);
                const numWidth = doc.getTextWidth(patternDisplay);
                const leaderStart = margin + nameWidth + 5;
                const leaderEnd = pageWidth - margin - numWidth - 5;
                
                if (leaderEnd > leaderStart) {
                    let currentX = leaderStart;
                    while (currentX < leaderEnd) {
                        doc.text('.', currentX, yPos);
                        currentX += 3;
                    }
                }
                
                yPos += 15;
            }
            yPos += 20; // Space between disciplines
        }
    }

    // --- Pattern Pages ---
    let sequentialClassNumber = 0;
    for (const [discIndex, discipline] of (pbbData.disciplines || []).entries()) {
        for (const [groupIndex, group] of (discipline.patternGroups || []).entries()) {
            if (!group.divisions || group.divisions.length === 0) continue;

            // Extract pattern ID - try ID-based keys first, then fallback to index-based
            const disciplineId = discipline.id;
            const groupId = group.id;
            let patternSelection = null;
            let patternId = null;
            
            // Try ID-based keys first (preferred)
            if (disciplineId && groupId) {
                patternSelection = pbbData.patternSelections?.[disciplineId]?.[groupId];
            }
            
            // Fallback to index-based keys (legacy)
            if (!patternSelection) {
                patternSelection = pbbData.patternSelections?.[discIndex]?.[groupIndex];
            }
            
            if (patternSelection) {
                if (typeof patternSelection === 'object' && patternSelection !== null) {
                    patternId = patternSelection.patternId || patternSelection.id;
                    // If still an object, try to extract from nested structure
                    if (!patternId || (typeof patternId === 'object' && patternId !== null)) {
                        patternId = patternSelection;
                    }
                } else {
                    patternId = patternSelection;
                }
            }
            console.log(`Extracted patternId for discipline ${disciplineId || discIndex}, group ${groupId || groupIndex}:`, patternSelection, '->', patternId);
            
            // Get competition date - first try divisionDates from divisions in the group, then groupDueDates, then startDate
            let competitionDate = pbbData.startDate;
            
            // Try to get date from divisionDates (set in Step 3, tab 2)
            if (group.divisions && group.divisions.length > 0) {
                // Get the first division's date, or find a common date if all divisions have the same date
                const divisionDates = group.divisions
                    .map(div => {
                        const divId = div.id || div;
                        return discipline.divisionDates?.[divId];
                    })
                    .filter(Boolean);
                
                if (divisionDates.length > 0) {
                    // Use the first division's date (or could use most common date)
                    competitionDate = divisionDates[0];
                }
            }
            
            // Fallback to groupDueDates if no divisionDates found
            if (!competitionDate || competitionDate === pbbData.startDate) {
                competitionDate = pbbData.groupDueDates?.[discIndex]?.[groupIndex] || pbbData.startDate;
            }
            
            // Get association info from discipline
            const assocId = discipline.association_id || Object.keys(pbbData.associations || {})[0];
            const assocName = formatAssociationName(assocId);
            
            addNewPage();
            
            // Add to TOC with sequential numbering
            sequentialClassNumber++;
            const className = `${discipline.name} - ${group.divisions.map(d => removeFirstWord(d.division || '')).join('/')}`;
            toc.push({ 
                title: className,
                page: doc.internal.getNumberOfPages() - 1,
                date: competitionDate,
                classNumber: sequentialClassNumber.toString()
            });
            
            // Start from top margin
            yPos = margin;
            
            // Render pattern page based on selected layout
            if (selectedLayout === 'layout-a') {
            // Format like the example: Header info, then large image
            
            // Top left: Association name
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(assocName.toUpperCase(), margin, yPos);
            
            yPos += 18;
            
            // Discipline name and date (left side) - wrap if needed
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const dateStr = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';
            const disciplineText = `${discipline.name.toUpperCase()} - ${dateStr}`;
            const disciplineMaxWidth = pageWidth - margin * 2;
            const disciplineLines = doc.splitTextToSize(disciplineText, disciplineMaxWidth);
            doc.text(disciplineLines, margin, yPos);
            
            yPos += (disciplineLines.length * 14) + 4; // Dynamic height based on lines
            
            // Division names (left side) - wrap to multiple lines if needed (max 2 lines)
            const divisions = group.divisions?.map(d => removeFirstWord(d.division || '')).join(' / ') || '';
            if (divisions) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const maxWidth = pageWidth - margin * 2; // Available width for text
                const divisionLines = doc.splitTextToSize(divisions, maxWidth);
                
                // Limit to 2 lines maximum
                const linesToDisplay = divisionLines.slice(0, 2);
                doc.text(linesToDisplay, margin, yPos);
                
                // Calculate height based on number of lines displayed
                const lineHeight = 12;
                yPos += (linesToDisplay.length * lineHeight) + 15; // Space before image
            } else {
                yPos += 15; // Space before image if no divisions
            }
            
            // Add real pattern image - centered and large
            const numericPatternId = patternId ? (typeof patternId === 'number' ? patternId : parseInt(patternId)) : null;
            const patternImageBase64 = numericPatternId && !isNaN(numericPatternId) && patternImagesMap.has(numericPatternId) 
                ? patternImagesMap.get(numericPatternId) 
                : dummyPatternBase64;
            
            if (patternImageBase64) {
                try {
                    const imgProps = doc.getImageProperties(patternImageBase64);
                    const aspect = imgProps.height / imgProps.width;
                    // Calculate image size - use most of the page
                    const availableHeight = pageHeight - yPos - 40; // Space for footer
                    const imgWidth = pageWidth - margin * 2;
                    const imgHeight = imgWidth * aspect;
                    
                    let finalWidth = imgWidth;
                    let finalHeight = imgHeight;
                    
                    if (imgHeight > availableHeight) {
                        finalHeight = availableHeight;
                        finalWidth = finalHeight / aspect;
                    }
                    
                    // Center the image
                    const xOffset = (pageWidth - finalWidth) / 2;
                    
                    await addImageToPage(patternImageBase64, xOffset, yPos, finalWidth, finalHeight);
                    yPos += finalHeight + 20;
                } catch (e) {
                    console.error('Failed to add pattern image:', e);
                    const graphHeight = 400;
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(1);
                    doc.rect(margin, yPos, pageWidth - (margin * 2), graphHeight);
                    yPos += graphHeight + 20;
                }
            } else {
                const graphHeight = 400;
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(1);
                doc.rect(margin, yPos, pageWidth - (margin * 2), graphHeight);
                yPos += graphHeight + 20;
            }
            
            } else if (selectedLayout === 'layout-b') {
                // LAYOUT B: Same format as Layout A
                
                // Top left: Association name
                doc.setTextColor(0, 0, 0);
                doc.setFont('times', 'bold');
                doc.setFontSize(12);
                doc.text(assocName.toUpperCase(), margin, yPos);
                
                yPos += 18;
                
                // Discipline name and date (left side) - wrap if needed
                doc.setFontSize(11);
                doc.setFont('times', 'normal');
                const dateStr = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';
                const disciplineText = `${discipline.name.toUpperCase()} - ${dateStr}`;
                const disciplineMaxWidth = pageWidth - margin * 2;
                const disciplineLines = doc.splitTextToSize(disciplineText, disciplineMaxWidth);
                doc.text(disciplineLines, margin, yPos);
                
                yPos += (disciplineLines.length * 14) + 4; // Dynamic height based on lines
                
                // Division names (left side) - wrap to multiple lines if needed (max 2 lines)
                const divisions = group.divisions?.map(d => removeFirstWord(d.division || '')).join(' / ') || '';
                if (divisions) {
                    doc.setFontSize(10);
                    doc.setFont('times', 'normal');
                    const maxWidth = pageWidth - margin * 2; // Available width for text
                    const divisionLines = doc.splitTextToSize(divisions, maxWidth);
                    
                    // Limit to 2 lines maximum
                    const linesToDisplay = divisionLines.slice(0, 2);
                    doc.text(linesToDisplay, margin, yPos);
                    
                    // Calculate height based on number of lines displayed
                    const lineHeight = 12;
                    yPos += (linesToDisplay.length * lineHeight) + 15; // Space before image
                } else {
                    yPos += 15; // Space before image if no divisions
                }
                
                // Add real pattern image - centered and large
                const numericPatternId = patternId ? (typeof patternId === 'number' ? patternId : parseInt(patternId)) : null;
                const patternImageBase64 = numericPatternId && !isNaN(numericPatternId) && patternImagesMap.has(numericPatternId) 
                    ? patternImagesMap.get(numericPatternId) 
                    : dummyPatternBase64;
                
                if (patternImageBase64) {
                    try {
                        const imgProps = doc.getImageProperties(patternImageBase64);
                        const aspect = imgProps.height / imgProps.width;
                        // Calculate image size - use most of the page
                        const availableHeight = pageHeight - yPos - 40; // Space for footer
                        const imgWidth = pageWidth - margin * 2;
                        const imgHeight = imgWidth * aspect;
                        
                        let finalWidth = imgWidth;
                        let finalHeight = imgHeight;
                        
                        if (imgHeight > availableHeight) {
                            finalHeight = availableHeight;
                            finalWidth = finalHeight / aspect;
                        }
                        
                        // Center the image
                        const xOffset = (pageWidth - finalWidth) / 2;
                        
                        await addImageToPage(patternImageBase64, xOffset, yPos, finalWidth, finalHeight);
                        yPos += finalHeight + 20;
                    } catch (e) {
                        console.error('Failed to add pattern image:', e);
                        const graphHeight = 400;
                        doc.setDrawColor(200, 200, 200);
                        doc.setLineWidth(1);
                        doc.rect(margin, yPos, pageWidth - (margin * 2), graphHeight);
                        yPos += graphHeight + 20;
                    }
                } else {
                    const graphHeight = 400;
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(1);
                    doc.rect(margin, yPos, pageWidth - (margin * 2), graphHeight);
                    yPos += graphHeight + 20;
                }
            }
        }
    }
    
    // --- Sponsor Page ---
    if(sponsorLogosBase64.length > 0) {
        addNewPage();
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('Thank You to Our Sponsors!', pageWidth / 2, yPos, { align: 'center' });
        yPos += 40;
        
        const logoSize = 100;
        const logosPerRow = 3;
        const xStart = (pageWidth - (logosPerRow * logoSize + (logosPerRow - 1) * 30)) / 2;
        let currentX = xStart;
        
        for (let index = 0; index < sponsorLogosBase64.length; index++) {
            const logoBase64 = sponsorLogosBase64[index];
            if(index > 0 && index % logosPerRow === 0) {
                yPos += logoSize + 30;
                currentX = xStart;
            }
            if (yPos > pageHeight - logoSize - margin) {
                addNewPage();
                yPos = margin + 30;
                currentX = xStart;
            }
            
            await addImageToPage(logoBase64, currentX, yPos, logoSize, logoSize);
            currentX += logoSize + 30;
        }
    }

    // --- Finalize: Generate TOC with correct page numbers ---
    // TOC starts on page 2, but may span multiple pages
    // We need to:
    // 1. First calculate how many pages TOC will need
    // 2. Adjust all page references accordingly
    // 3. Then render the TOC
    
    const tocStartPage = 2;
    let tocPagesNeeded = 1; // Start with 1 page for TOC
    
    if (selectedLayout === 'layout-b') {
        // LAYOUT B: Calculate TOC pages needed
        const tocByDiscipline = {};
        toc.forEach(item => {
            const disciplineName = item.title.split(' - ')[0];
            if (!tocByDiscipline[disciplineName]) {
                tocByDiscipline[disciplineName] = { startPage: item.page, endPage: item.page };
            } else {
                tocByDiscipline[disciplineName].endPage = Math.max(tocByDiscipline[disciplineName].endPage, item.page);
            }
        });
        
        // Estimate lines needed for TOC
        const disciplineCount = Object.keys(tocByDiscipline).length;
        const linesPerPage = Math.floor((pageHeight - margin * 2 - 50) / 15);
        tocPagesNeeded = Math.ceil(disciplineCount / linesPerPage);
        
    } else {
        // LAYOUT A: Calculate TOC pages needed
        const tocByDate = {};
        toc.forEach(item => {
            if (!item.date) return;
            if (!tocByDate[item.date]) tocByDate[item.date] = [];
            tocByDate[item.date].push(item);
        });
        
        // Estimate space needed: header (80) + each date section (header 30 + table rows ~25 each + spacing 25)
        let estimatedHeight = 80; // Title
        Object.keys(tocByDate).forEach(dateStr => {
            estimatedHeight += 30; // Date header
            estimatedHeight += 30; // Table header
            estimatedHeight += tocByDate[dateStr].length * 25; // Table rows
            estimatedHeight += 25; // Spacing
        });
        
        const availableHeightPerPage = pageHeight - margin * 2;
        tocPagesNeeded = Math.ceil(estimatedHeight / availableHeightPerPage);
    }
    
    console.log(`TOC needs ${tocPagesNeeded} page(s)`);
    
    // Calculate page offset: if TOC takes 2 pages, content starts on page 3 (displayed as page 2)
    // Original page numbers stored in toc[] were based on page 2 being TOC
    // Now we need to adjust for additional TOC pages
    const tocPageOffset = tocPagesNeeded - 1; // Extra pages beyond the first TOC page
    
    // Adjust all TOC page references
    toc.forEach(item => {
        item.page = item.page + tocPageOffset;
    });
    
    // Now render the TOC
    doc.setPage(2);
    
    if (selectedLayout === 'layout-b') {
        // LAYOUT B: Specific TOC Population
        yPos = margin + 50;
        
        // Group by discipline for Layout B style
        const tocByDiscipline = {};
        toc.forEach(item => {
            // Extract discipline name from title (format: "Discipline - Divisions")
            const disciplineName = item.title.split(' - ')[0];
            if (!tocByDiscipline[disciplineName]) {
                tocByDiscipline[disciplineName] = {
                    startPage: item.page,
                    endPage: item.page
                };
            } else {
                // Update end page
                tocByDiscipline[disciplineName].endPage = Math.max(tocByDiscipline[disciplineName].endPage, item.page);
            }
        });
        
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        // Sort disciplines by startPage (Sequential)
        const sortedDisciplines = Object.keys(tocByDiscipline).sort((a, b) => {
            return tocByDiscipline[a].startPage - tocByDiscipline[b].startPage;
        });
        
        for (const discipline of sortedDisciplines) {
            if (yPos > pageHeight - margin) {
                doc.addPage();
                yPos = margin + 30;
            }
            
            const range = tocByDiscipline[discipline];
            const pageText = range.startPage === range.endPage 
                ? range.startPage.toString() 
                : `${range.startPage}-${range.endPage}`;
            
            // Draw discipline name
            doc.text(discipline, margin, yPos);
            
            // Draw page number aligned right
            doc.text(pageText, pageWidth - margin, yPos, { align: 'right' });
            
            // Draw dotted leader
            const nameWidth = doc.getTextWidth(discipline);
            const pageNumberWidth = doc.getTextWidth(pageText);
            const leaderStart = margin + nameWidth + 5;
            const leaderEnd = pageWidth - margin - pageNumberWidth - 5;
            
            if (leaderEnd > leaderStart) {
                doc.setFont('times', 'normal');
                let currentX = leaderStart;
                while (currentX < leaderEnd) {
                    doc.text('.', currentX, yPos);
                    currentX += 3;
                }
                doc.setFont('times', 'bold'); // Reset to bold for next line
            }
            
            yPos += 15;
        }
        
    } else {
        // LAYOUT A: Default TOC Population (Existing Logic)
        yPos = margin + 30;
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(`${pbbData.showName || 'Pattern Book'} – Table of Contents`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 50;
    
        const tocByDate = {};
        toc.forEach(item => {
            if (!item.date) return;
            if (!tocByDate[item.date]) tocByDate[item.date] = [];
            tocByDate[item.date].push(item);
        });
    
        const sortedDates = Object.keys(tocByDate).sort();
        let tocCurrentPage = tocStartPage;
        
        sortedDates.forEach(dateStr => {
            // Check if we need a new page - if so, track it
            if (yPos > pageHeight - 150) {
                // Insert a new page after the current TOC page
                const currentPageCount = doc.internal.getNumberOfPages();
                if (tocCurrentPage < tocStartPage + tocPagesNeeded - 1) {
                    // We're still within estimated TOC pages, just move to next page
                    tocCurrentPage++;
                    doc.setPage(tocCurrentPage);
                    yPos = margin + 30;
                }
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            const dateFormatted = format(parseLocalDate(dateStr), 'EEEE, MMMM d, yyyy');
            doc.text(dateFormatted, margin, yPos);
            yPos += 30;
    
            const tableData = tocByDate[dateStr].map(item => [
                item.classNumber || '',
                item.title || '',
                item.page.toString()
            ]);
    
            doc.autoTable({
                startY: yPos,
                head: [['#', 'Class', 'Pg']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 5, lineColor: [200, 200, 200], lineWidth: 0.5 },
                headStyles: { fontStyle: 'bold', fillColor: [52, 73, 94], textColor: [255, 255, 255] },
                columnStyles: { 
                    0: { cellWidth: 60 },
                    2: { cellWidth: 40, halign: 'center' }
                },
                margin: { left: margin, right: margin },
                // Handle page breaks within autoTable
                didDrawPage: function(data) {
                    // Track if autoTable added a new page
                    tocCurrentPage = doc.internal.getCurrentPageInfo().pageNumber;
                }
            });
            yPos = doc.autoTable.previous.finalY + 25;
        });
    }
    
    
    // Add footers to all pages (skip cover page, start numbering from TOC as page 1)
    const finalPageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= finalPageCount; i++) {
        doc.setPage(i);
        if (i === 1) continue; // Skip footer on cover page
        const pageNum = i - 1; // TOC becomes page 1, first pattern page becomes page 2, etc.
        addPageFooter(pageNum);
    }

    return doc.output('datauristring');
};
