import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fetchImageAsBase64, fetchPatternAndScoresheetAssets, compressImage } from './pdfHelpers';
import { supabase } from '@/lib/supabaseClient';
import { parseLocalDate } from '@/lib/utils';
import patternDiagram from '@/assets/pattern-diagram-sample.png';
import { drawGenericScoreSheetPage } from './genericScoreSheet';

export const generatePatternBookPdf = async (pbbData, options = {}) => {
    console.log('Generating PDF for', pbbData);

    // Hub mode: skip cover page, TOC, and pattern list — only output patterns + scoresheets
    const skipCoverAndToc = options.skipCoverAndToc || false;

    // Get selected layout (default to 'layout-a' if not specified)
    const selectedLayout = pbbData.layoutSelection || 'layout-a';
    console.log('Selected layout:', selectedLayout);

    // Feature flag: class number display (set to false to hide auto-generated numbers)
    const showClassNumbers = pbbData.showClassNumbers || false;
    
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let yPos = margin;
    let toc = [];

    // --- Helper Functions ---
    const addPageHeader = (text, rightText = null, logoBase64 = null) => {
        const logoSize = 24;
        const textX = logoBase64 ? margin + logoSize + 6 : margin;
        if (logoBase64) {
            try {
                const imgType = logoBase64.substring(logoBase64.indexOf('/') + 1, logoBase64.indexOf(';'));
                doc.addImage(logoBase64, imgType.toUpperCase(), margin, margin / 2 + 1, logoSize, logoSize);
            } catch (e) { /* ignore logo errors */ }
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(text, textX, margin / 2 + 10);
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

    // Helper function to format division name with Go label if applicable
    const formatDivisionWithGo = (division) => {
        const baseName = removeFirstWord(division.division || '');
        // Only add Go label if this division has a goNumber (meaning it's part of a two-go class)
        if (division.goNumber === 1 || division.goNumber === 2) {
            return `${baseName} (Go ${division.goNumber})`;
        }
        return baseName;
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
        return assocId?.toUpperCase() || 'HORSE ASSOCIATION';
    };

    // Draw social media icons on cover page (colored circles with letters, clickable)
    const drawSocialIcons = (yPosition) => {
        const socials = [
            { url: pbbData.marketing?.facebook, color: [24, 119, 242], label: 'f' },
            { url: pbbData.marketing?.instagram, color: [228, 64, 95], label: 'ig' },
            { url: pbbData.marketing?.youtube, color: [255, 0, 0], label: 'yt' },
        ].filter(s => s.url && s.url.trim());

        if (socials.length === 0) return;

        const radius = 8;
        const spacing = 30;
        const totalWidth = socials.length * (radius * 2) + (socials.length - 1) * (spacing - radius * 2);
        let cx = (pageWidth - totalWidth) / 2 + radius;

        for (const social of socials) {
            // Colored circle
            doc.setFillColor(social.color[0], social.color[1], social.color[2]);
            doc.circle(cx, yPosition, radius, 'F');
            // White letter
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(social.label.length > 1 ? 7 : 10);
            doc.text(social.label, cx, yPosition + (social.label.length > 1 ? 2.5 : 3.5), { align: 'center' });
            // Clickable link area
            doc.link(cx - radius, yPosition - radius, radius * 2, radius * 2, { url: social.url });
            cx += spacing;
        }
        // Reset text color
        doc.setTextColor(0, 0, 0);
    };

    // Helper: Check if discipline should have pattern pages in the PDF
    const isPatternDiscipline = (discipline) => {
        if (!discipline.pattern) return false;
        if (discipline.pattern_type === 'scoresheet_only') return false;
        return true;
    };

    // Helper: Extract pattern number from pdf_file_name (e.g., "WesternRiding0001.L1" -> 1)
    const extractPatternNumber = (fileName) => {
        if (!fileName) return null;
        const nameWithoutExt = fileName.replace(/\.(pdf|PDF)$/, '');
        const match = nameWithoutExt.match(/(\d+)(?:\.|$)/);
        if (match) return parseInt(match[1], 10) || null;
        const fallback = nameWithoutExt.match(/(\d+)$/);
        return fallback ? (parseInt(fallback[1], 10) || null) : null;
    };

    // Helper: Format human-readable pattern display name from patternSelection object
    const getPatternDisplayName = (patternSelection) => {
        if (!patternSelection) return null;
        const num = extractPatternNumber(patternSelection.patternName);
        let display = num !== null ? `Pattern ${num}` : (patternSelection.patternName || null);
        if (display && patternSelection.version && patternSelection.version !== 'ALL') {
            display = `${display} - ${patternSelection.version}`;
        }
        return display;
    };

    // --- Fetch Assets ---
    const assets = await fetchPatternAndScoresheetAssets(pbbData);
    let coverImageBase64 = null;
    if (pbbData.coverPageOption === 'upload' && pbbData.marketing?.coverImage?.fileUrl) {
        coverImageBase64 = await fetchImageAsBase64(pbbData.marketing.coverImage.fileUrl);
    }
    
    // Load show logo (for cover page and header)
    let showLogoCoverBase64 = null;
    let showLogoHeaderBase64 = null;
    if (pbbData.showLogoUrl) {
        const rawLogo = await fetchImageAsBase64(pbbData.showLogoUrl);
        if (rawLogo) {
            showLogoCoverBase64 = await compressImage(rawLogo, 200, 200, 0.8);
            showLogoHeaderBase64 = await compressImage(rawLogo, 80, 80, 0.7);
        }
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
            if (base64) {
                const compressed = await compressImage(base64, 200, 200, 0.8);
                sponsorLogosBase64.push(compressed || base64);
            }
        }
    }


    // --- Cover Page ---
    if (skipCoverAndToc) {
        // Hub mode: no cover page, no TOC, no pattern list — jump straight to patterns
    } else if (selectedLayout === 'layout-b') {
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
        const logoOffset = showLogoCoverBase64 ? 50 : 0;

        // Show Logo (centered above title)
        if (showLogoCoverBase64) {
            const logoSize = 80;
            await addImageToPage(showLogoCoverBase64, (pageWidth - logoSize) / 2, centerY - 80 - logoSize - 10, logoSize, logoSize);
        }

        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'bold');
        doc.setFontSize(50);
        const showTitle = (pbbData.showName || 'Pattern Book').toUpperCase();
        doc.text(showTitle, pageWidth / 2, centerY - 80 + logoOffset, { align: 'center', maxWidth: pageWidth - 140 });

        // Decorative Line
        doc.setLineWidth(1);
        doc.line(pageWidth / 2 - 100, centerY - 40 + logoOffset, pageWidth / 2 + 100, centerY - 40 + logoOffset);

        // Date & Location
        doc.setFont('times', 'italic');
        doc.setFontSize(24);

        if (pbbData.startDate && pbbData.endDate) {
            const dateText = `${format(parseLocalDate(pbbData.startDate), 'MMMM d')} – ${format(parseLocalDate(pbbData.endDate), 'd, yyyy')}`;
            doc.text(dateText, pageWidth / 2, centerY + 20 + logoOffset, { align: 'center' });
        }

        if (pbbData.venueAddress) {
            doc.setFontSize(18);
            doc.setFont('times', 'normal');
            doc.text(pbbData.venueAddress, pageWidth / 2, centerY + 60 + logoOffset, { align: 'center' });
        }
        
        // Associations at bottom
        const associations = Array.isArray(pbbData.associations) ? pbbData.associations : [];
        if (associations.length > 0) {
            doc.setFontSize(14);
            doc.setFont('times', 'bold');
            const assocText = associations.map(a => formatAssociationName(a.id)).join(' • ');
            doc.text(assocText, pageWidth / 2, pageHeight - margin - 55, { align: 'center' });
        }
        // Social media icons
        drawSocialIcons(pageHeight - margin - 20);
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
            
            const logoOffsetA = showLogoCoverBase64 ? 50 : 0;

            // Show Logo (centered above title)
            if (showLogoCoverBase64) {
                const logoSize = 80;
                await addImageToPage(showLogoCoverBase64, (pageWidth - logoSize) / 2, pageHeight / 2 - 100 - logoSize - 10, logoSize, logoSize);
            }

            // Title
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(42);
            doc.setFont('helvetica', 'bold');
            const showTitle = (pbbData.showName || 'Pattern Book').toUpperCase();
            doc.text(showTitle, pageWidth / 2, pageHeight / 2 - 100 + logoOffsetA, { align: 'center', maxWidth: pageWidth - 100 });

            // Associations
            const associations = Array.isArray(pbbData.associations) ? pbbData.associations : [];
            if (associations.length > 0) {
                doc.setFontSize(20);
                doc.setFont('helvetica', 'normal');
                const assocText = associations.map(a => formatAssociationName(a.id)).join(' • ');
                doc.text(assocText, pageWidth / 2, pageHeight / 2 - 40 + logoOffsetA, { align: 'center', maxWidth: pageWidth - 100 });
            }

            // Dates
            doc.setFontSize(16);
            doc.setFont('helvetica', 'normal');
            if (pbbData.startDate && pbbData.endDate) {
                const dateText = `${format(parseLocalDate(pbbData.startDate), 'MMMM d')} – ${format(parseLocalDate(pbbData.endDate), 'd, yyyy')}`;
                doc.text(dateText, pageWidth / 2, pageHeight / 2 + logoOffsetA, { align: 'center' });
            }

            // Venue
            if (pbbData.venueAddress) {
                doc.setFontSize(14);
                doc.text(pbbData.venueAddress, pageWidth / 2, pageHeight / 2 + 30 + logoOffsetA, { align: 'center' });
            }

            // Social media icons
            drawSocialIcons(pageHeight - margin - 20);
        }
    }


    // --- Table of Contents ---
    if (!skipCoverAndToc) {
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
            if (!isPatternDiscipline(discipline)) continue;
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
                
                const divisions = group.divisions?.map(d => formatDivisionWithGo(d)).join(', ');
                // Extract pattern selection - try ID-based keys first, then fallback to index-based
                const disciplineId = discipline.id;
                const groupId = group.id;
                let patternSelection = null;
                if (disciplineId && groupId) {
                    patternSelection = pbbData.patternSelections?.[disciplineId]?.[groupId];
                }
                if (!patternSelection) {
                    patternSelection = pbbData.patternSelections?.[discIndex]?.[groupIndex];
                }
                const patternDisplay = getPatternDisplayName(patternSelection) || 'TBD';
                
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
    } // end if (!skipCoverAndToc)

    // --- Pattern Pages ---
    let sequentialClassNumber = 10000;
    for (const [discIndex, discipline] of (pbbData.disciplines || []).entries()) {
        if (!isPatternDiscipline(discipline)) continue;
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
            
            // Check for special selection types (judge-assigned, custom-request)
            const isJudgeAssigned = patternSelection?.type === 'judgeAssigned';
            const isCustomRequest = patternSelection?.type === 'customRequest';

            if (patternSelection && !isJudgeAssigned && !isCustomRequest) {
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
            const hasNoPattern = !patternId && !isJudgeAssigned && !isCustomRequest;
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
            console.log('DEBUG assocId:', assocId, 'discipline.association_id:', discipline.association_id, 'discipline:', JSON.stringify(discipline, null, 2));
            const assocName = formatAssociationName(assocId);
            
            addNewPage();
            
            // Add to TOC with sequential numbering
            sequentialClassNumber++;
            const className = `${discipline.name} - ${group.divisions.map(d => formatDivisionWithGo(d)).join('/')}`;
            toc.push({
                title: className,
                page: doc.internal.getNumberOfPages() - 1,
                date: competitionDate,
                classNumber: showClassNumbers ? sequentialClassNumber.toString() : ''
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

            // Pattern name line (e.g., "Pattern 6 - L1")
            const patternDisplayName = getPatternDisplayName(patternSelection);
            if (patternDisplayName) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(patternDisplayName, margin, yPos);
                yPos += 16;
            }

            // Division names (left side) - wrap to multiple lines if needed (max 2 lines)
            const divisions = group.divisions?.map(d => formatDivisionWithGo(d)).join(' / ') || '';
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
            
            // Render placeholder or real pattern image
            if (isJudgeAssigned) {
                // Judge-assigned placeholder
                const placeholderY = yPos + 150;
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(150, 150, 150);
                doc.text(`Pattern to be selected by Judge: ${patternSelection?.judgeName || 'TBD'}`, pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                yPos = placeholderY + 40;
            } else if (isCustomRequest) {
                // Custom pattern: show uploaded image if available, otherwise placeholder
                if (patternSelection?.uploadedFileUrl && patternSelection.uploadedFileType?.startsWith('image/')) {
                    try {
                        const uploadedBase64 = await fetchImageAsBase64(patternSelection.uploadedFileUrl);
                        if (uploadedBase64) {
                            const imgProps = doc.getImageProperties(uploadedBase64);
                            const aspect = imgProps.height / imgProps.width;
                            const availH = pageHeight - yPos - 40;
                            const imgW = pageWidth - margin * 2;
                            let finalW = imgW;
                            let finalH = imgW * aspect;
                            if (finalH > availH) { finalH = availH; finalW = finalH / aspect; }
                            const xOff = (pageWidth - finalW) / 2;
                            await addImageToPage(uploadedBase64, xOff, yPos, finalW, finalH);
                            yPos += finalH + 20;
                        } else {
                            throw new Error('fetch failed');
                        }
                    } catch (_e) {
                        const placeholderY = yPos + 150;
                        doc.setFontSize(20);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(150, 150, 150);
                        doc.text('Custom Pattern \u2014 Uploaded (PDF)', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                        yPos = placeholderY + 40;
                    }
                } else if (patternSelection?.uploadedFileUrl) {
                    // Uploaded PDF — can't embed inline, show notice
                    const placeholderY = yPos + 150;
                    doc.setFontSize(20);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(150, 150, 150);
                    doc.text('Custom Pattern \u2014 See Attached PDF', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                    yPos = placeholderY + 40;
                } else {
                    const placeholderY = yPos + 150;
                    doc.setFontSize(20);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(150, 150, 150);
                    doc.text('Custom Pattern \u2014 Awaiting Upload', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                    yPos = placeholderY + 40;
                }
                doc.setTextColor(0, 0, 0);

                // Add generic scoresheet page (no maneuvers)
                addNewPage();
                const judges = Object.values(pbbData.associationJudges || {})
                    .flatMap(a => (a.judges || []))
                    .filter(j => j?.name)
                    .map(j => j.name);
                const dateStr = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';
                drawGenericScoreSheetPage(doc, {
                    association: assocName,
                    showName: pbbData.showName || '',
                    discipline: discipline.name || '',
                    division: group.divisions?.map(d => formatDivisionWithGo(d)).join(' / ') || '',
                    date: dateStr,
                    judge: judges[0] || '',
                });
            } else if (hasNoPattern) {
                // No pattern assigned placeholder
                const placeholderY = yPos + 150;
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(150, 150, 150);
                doc.text('Pattern Coming Soon', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                yPos = placeholderY + 40;
            } else {
            // Add real pattern image - centered and large
            const numericPatternId = patternId ? (typeof patternId === 'number' ? patternId : parseInt(patternId)) : null;
            const patternImageBase64 = numericPatternId && !isNaN(numericPatternId) && patternImagesMap.has(numericPatternId)
                ? patternImagesMap.get(numericPatternId)
                : null;

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
                    const placeholderY = yPos + 150;
                    doc.setFontSize(20);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(150, 150, 150);
                    doc.text('Pattern Coming Soon', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                    yPos = placeholderY + 40;
                }
            } else {
                // No image found for this pattern
                const placeholderY = yPos + 150;
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(150, 150, 150);
                doc.text('Pattern Coming Soon', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                yPos = placeholderY + 40;
            }
            } // end else (real pattern)

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

                // Pattern name line (e.g., "Pattern 6 - L1")
                const patternDisplayNameB = getPatternDisplayName(patternSelection);
                if (patternDisplayNameB) {
                    doc.setFontSize(11);
                    doc.setFont('times', 'bold');
                    doc.text(patternDisplayNameB, margin, yPos);
                    yPos += 16;
                }

                // Division names (left side) - wrap to multiple lines if needed (max 2 lines)
                const divisions = group.divisions?.map(d => formatDivisionWithGo(d)).join(' / ') || '';
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
                
                // Render placeholder or real pattern image (Layout B)
                if (isJudgeAssigned) {
                    const placeholderY = yPos + 150;
                    doc.setFontSize(20);
                    doc.setFont('times', 'bold');
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Pattern to be selected by Judge: ${patternSelection?.judgeName || 'TBD'}`, pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                    yPos = placeholderY + 40;
                } else if (isCustomRequest) {
                    // Custom pattern: show uploaded image if available, otherwise placeholder
                    if (patternSelection?.uploadedFileUrl && patternSelection.uploadedFileType?.startsWith('image/')) {
                        try {
                            const uploadedBase64 = await fetchImageAsBase64(patternSelection.uploadedFileUrl);
                            if (uploadedBase64) {
                                const imgProps = doc.getImageProperties(uploadedBase64);
                                const aspect = imgProps.height / imgProps.width;
                                const availH = pageHeight - yPos - 40;
                                const imgW = pageWidth - margin * 2;
                                let finalW = imgW;
                                let finalH = imgW * aspect;
                                if (finalH > availH) { finalH = availH; finalW = finalH / aspect; }
                                const xOff = (pageWidth - finalW) / 2;
                                await addImageToPage(uploadedBase64, xOff, yPos, finalW, finalH);
                                yPos += finalH + 20;
                            } else {
                                throw new Error('fetch failed');
                            }
                        } catch (_e) {
                            const placeholderY = yPos + 150;
                            doc.setFontSize(20);
                            doc.setFont('times', 'bold');
                            doc.setTextColor(150, 150, 150);
                            doc.text('Custom Pattern \u2014 Uploaded (PDF)', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                            yPos = placeholderY + 40;
                        }
                    } else if (patternSelection?.uploadedFileUrl) {
                        const placeholderY = yPos + 150;
                        doc.setFontSize(20);
                        doc.setFont('times', 'bold');
                        doc.setTextColor(150, 150, 150);
                        doc.text('Custom Pattern \u2014 See Attached PDF', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                        yPos = placeholderY + 40;
                    } else {
                        const placeholderY = yPos + 150;
                        doc.setFontSize(20);
                        doc.setFont('times', 'bold');
                        doc.setTextColor(150, 150, 150);
                        doc.text('Custom Pattern \u2014 Awaiting Upload', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                        yPos = placeholderY + 40;
                    }
                    doc.setTextColor(0, 0, 0);

                    // Add generic scoresheet page (no maneuvers)
                    addNewPage();
                    const judgesB = Object.values(pbbData.associationJudges || {})
                        .flatMap(a => (a.judges || []))
                        .filter(j => j?.name)
                        .map(j => j.name);
                    const dateStrB = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';
                    drawGenericScoreSheetPage(doc, {
                        association: assocName,
                        showName: pbbData.showName || '',
                        discipline: discipline.name || '',
                        division: group.divisions?.map(d => formatDivisionWithGo(d)).join(' / ') || '',
                        date: dateStrB,
                        judge: judgesB[0] || '',
                    });
                } else if (hasNoPattern) {
                    const placeholderY = yPos + 150;
                    doc.setFontSize(20);
                    doc.setFont('times', 'bold');
                    doc.setTextColor(150, 150, 150);
                    doc.text('Pattern Coming Soon', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                    yPos = placeholderY + 40;
                } else {
                // Add real pattern image - centered and large
                const numericPatternId = patternId ? (typeof patternId === 'number' ? patternId : parseInt(patternId)) : null;
                const patternImageBase64 = numericPatternId && !isNaN(numericPatternId) && patternImagesMap.has(numericPatternId)
                    ? patternImagesMap.get(numericPatternId)
                    : null;

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
                        const placeholderY = yPos + 150;
                        doc.setFontSize(20);
                        doc.setFont('times', 'bold');
                        doc.setTextColor(150, 150, 150);
                        doc.text('Pattern Coming Soon', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                        yPos = placeholderY + 40;
                    }
                } else {
                    // No image found for this pattern
                    const placeholderY = yPos + 150;
                    doc.setFontSize(20);
                    doc.setFont('times', 'bold');
                    doc.setTextColor(150, 150, 150);
                    doc.text('Pattern Coming Soon', pageWidth / 2, placeholderY, { align: 'center', maxWidth: pageWidth - margin * 2 });
                    yPos = placeholderY + 40;
                }
                } // end else (real pattern)
            }
        }
    }
    
    // --- Sponsor Page ---
    if(!skipCoverAndToc && sponsorLogosBase64.length > 0) {
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
    if (skipCoverAndToc) {
        // Hub mode: remove the blank first page (created by new jsPDF), then add simple headers/footers
        const totalPages = doc.internal.getNumberOfPages();
        if (totalPages > 1) {
            doc.deletePage(1);
        }
        const finalPageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= finalPageCount; i++) {
            doc.setPage(i);
            addPageHeader(pbbData.showName || 'Pattern', null, showLogoHeaderBase64);
            addPageFooter(i);
        }
        return doc.output('datauristring');
    }

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
    
    // If TOC spans multiple pages we must *insert* pages after page 2,
    // otherwise we would end up drawing TOC page 2 over the first content page.
    const tocPageOffset = Math.max(0, tocPagesNeeded - 1); // extra pages beyond the first TOC page

    // Insert extra TOC pages right after the TOC start page (page 2), shifting all content forward.
    if (tocPageOffset > 0) {
        for (let i = 0; i < tocPageOffset; i++) {
            // insert BEFORE the page that currently follows the TOC section
            doc.insertPage(tocStartPage + 1 + i);
        }
    }

    // Adjust all TOC page references (they are stored as displayed page numbers: pdfPage - 1)
    if (tocPageOffset > 0) {
        toc.forEach(item => {
            item.page = item.page + tocPageOffset;
        });
    }

    // Now render the TOC
    doc.setPage(tocStartPage);
    
    if (selectedLayout === 'layout-b') {
        // LAYOUT B: Specific TOC Population
        yPos = margin + 50;
        let tocCurrentPage = tocStartPage;
        
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
                // Move to the next pre-inserted TOC page (never addPage here)
                if (tocCurrentPage < tocStartPage + tocPagesNeeded - 1) {
                    tocCurrentPage++;
                    doc.setPage(tocCurrentPage);
                    yPos = margin + 30;
                }
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
    
            const hasAnyClassNumbers = tocByDate[dateStr].some(item => item.classNumber);
            const tableData = hasAnyClassNumbers
                ? tocByDate[dateStr].map(item => [item.classNumber || '', item.title || '', item.page.toString()])
                : tocByDate[dateStr].map(item => [item.title || '', item.page.toString()]);

            doc.autoTable({
                startY: yPos,
                head: hasAnyClassNumbers ? [['#', 'Class', 'Pg']] : [['Class', 'Pg']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 5, lineColor: [200, 200, 200], lineWidth: 0.5 },
                headStyles: { fontStyle: 'bold', fillColor: [52, 73, 94], textColor: [255, 255, 255] },
                columnStyles: hasAnyClassNumbers
                    ? { 0: { cellWidth: 60 }, 2: { cellWidth: 40, halign: 'center' } }
                    : { 1: { cellWidth: 40, halign: 'center' } },
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
    
    
    // Add headers and footers to all pages (skip cover page, start numbering from TOC as page 1)
    const finalPageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= finalPageCount; i++) {
        doc.setPage(i);
        if (i === 1) continue; // Skip cover page
        const pageNum = i - 1; // TOC becomes page 1, first pattern page becomes page 2, etc.
        addPageHeader(pbbData.showName || 'Pattern Book', null, showLogoHeaderBase64);
        addPageFooter(pageNum);
    }

    return doc.output('datauristring');
};
