import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fetchImageAsBase64, fetchPatternAndScoresheetAssets, compressImage, cropPatternImageSmart } from './pdfHelpers';
import { supabase } from '@/lib/supabaseClient';
import { parseLocalDate } from '@/lib/utils';
import patternDiagram from '@/assets/pattern-diagram-sample.png';
import { drawGenericScoreSheetPage, SCORESHEET_LAYOUT } from './genericScoreSheet';

export const generatePatternBookPdf = async (pbbData, options = {}) => {
    console.log('Generating PDF for', pbbData);

    // Hub mode: skip cover page, TOC, and pattern list — only output patterns + scoresheets
    const skipCoverAndToc = options.skipCoverAndToc || false;

    // Get selected layout (default to 'layout-a' if not specified)
    const selectedLayout = pbbData.layoutSelection || 'layout-a';
    console.log('Selected layout:', selectedLayout);

    // Feature flag: class number display (set to false to hide auto-generated numbers)
    const showClassNumbers = pbbData.showClassNumbers || false;
    
    const doc = new jsPDF('p', 'pt', 'letter');
    const pageHeight = doc.internal.pageSize.getHeight(); // 792 pt (11 in)
    const pageWidth = doc.internal.pageSize.getWidth();   // 612 pt (8.5 in)
    const margin = 36;
    // Pattern images use a tighter margin to maximize readable size.
    // Headers/footers still use `margin` for safe white space.
    const PATTERN_IMAGE_MARGIN = 12;
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
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        const footerText = `${pbbData.showName || 'Pattern Book'} – Page ${pageNumber}`;
        doc.text(footerText, margin, pageHeight - 18);
        // Branding — always bottom-right
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('equipatterns.com', pageWidth - margin, pageHeight - 18, { align: 'right' });
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

    // Resolve the judge name for a given discipline/group.
    // Priority:
    //   1. patternSelections[discId][groupId].judgeName (per-group assignment in Step 6)
    //   2. groupJudges[discIndex][groupIndex]          (per-group assignment in Step 5)
    //   3. discipline.assignedJudge / judgeName
    //   4. showDetails.judges[association_id]          (Step 4 Number-of-Judges UI)
    //   5. associationJudges[association_id]
    //   6. any judge anywhere
    const resolveJudgeName = (discipline, group, discIndex, groupIndex) => {
        const sel = pbbData.patternSelections?.[discipline?.id]?.[group?.id];
        if (sel && typeof sel === 'object' && sel.judgeName) return sel.judgeName;

        // Step 5 assigns judges via groupJudges: { [discIndex]: { [groupIndex]: name } }
        const gj = pbbData.groupJudges;
        if (gj && discIndex != null && groupIndex != null) {
            const byIndex = gj?.[discIndex]?.[groupIndex] || gj?.[String(discIndex)]?.[String(groupIndex)];
            if (byIndex && typeof byIndex === 'string' && byIndex.trim()) return byIndex.trim();
            // Fall back to the first judge on this discipline if the specific group has none
            const discBucket = gj?.[discIndex] || gj?.[String(discIndex)];
            if (discBucket && typeof discBucket === 'object') {
                const firstName = Object.values(discBucket).find(v => typeof v === 'string' && v.trim());
                if (firstName) return firstName.trim();
            }
        }

        const discAssigned = discipline?.assignedJudge || discipline?.judgeName;
        if (discAssigned) return discAssigned;

        const assocId = discipline?.association_id;
        const showDetailsJudges = pbbData.showDetails?.judges?.[assocId] || [];
        const showFirst = showDetailsJudges.find(j => j?.name);
        if (showFirst) return showFirst.name;

        const assocJudges = pbbData.associationJudges?.[assocId];
        const first = assocJudges?.judges?.find(j => j?.name);
        if (first) return first.name;

        const anyShowJudge = Object.values(pbbData.showDetails?.judges || {})
            .flat()
            .find(j => j?.name);
        if (anyShowJudge) return anyShowJudge.name;

        const anyJudge = Object.values(pbbData.associationJudges || {})
            .flatMap(a => (a.judges || []))
            .find(j => j?.name);
        return anyJudge?.name || '';
    };

    // Draw a labeled banner at the top of a scoresheet page with the judge
    // name, class/discipline, division, and date. The client asked for the
    // score sheet to be identified at the top instead of just showing the
    // raw image.
    const drawScoreSheetHeader = ({ judgeName, disciplineName, division, assocName, dateStr }) => {
        const bannerH = 34;
        // Light grey band across the page top so the labels are visible even
        // when the scoresheet image starts near the top margin.
        doc.setFillColor(244, 247, 252);
        doc.rect(0, 0, pageWidth, bannerH, 'F');
        doc.setDrawColor(180, 190, 210);
        doc.setLineWidth(0.5);
        doc.line(0, bannerH, pageWidth, bannerH);

        // Line 1 (left): Association • Discipline
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        const line1Left = [assocName, (disciplineName || '').toUpperCase()]
            .filter(Boolean)
            .join('  •  ');
        doc.text(line1Left || '', margin, 14, { maxWidth: pageWidth - margin * 2 - 120 });

        // Line 1 (right): Date
        if (dateStr) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(dateStr, pageWidth - margin, 14, { align: 'right' });
        }

        // Line 2 (left): Division
        if (division) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            doc.text(division, margin, 27, { maxWidth: pageWidth - margin * 2 - 160 });
        }

        // Line 2 (right): Judge
        if (judgeName) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Judge: ${judgeName}`, pageWidth - margin, 27, { align: 'right' });
        }
    };

    // Auto-fit a line of text inside a bounding box by shrinking the font
    // until the text fits on at most `maxLines` lines. Returns the effective
    // font size used and the wrapped lines array so the caller can advance
    // yPos correctly instead of letting long titles overlap later content.
    const fitTextLines = (text, { maxWidth, maxLines = 2, startSize, minSize = 10, font = 'helvetica', style = 'bold' }) => {
        if (!text) return { size: startSize, lines: [''] };
        doc.setFont(font, style);
        let size = startSize;
        let lines = [];
        while (size >= minSize) {
            doc.setFontSize(size);
            lines = doc.splitTextToSize(text, maxWidth);
            if (lines.length <= maxLines) break;
            size -= 2;
        }
        // Final clamp in case even minSize still overflows — truncate extras.
        if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
        }
        return { size, lines };
    };

    // Legacy alias — still used by other layout code paths.
    const drawJudgeOverlay = (judgeName) => {
        if (!judgeName) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Judge: ${judgeName}`, margin, margin);
    };

    // Alias for the shared smart-crop utility (removes baked-in header/footer
    // text from pattern images, keeping only the diagram).
    const cropPatternImage = (base64) => cropPatternImageSmart(base64);

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
    // Map of pattern_id -> association_name (e.g. "AQHA", "APHA") used to label
    // the correct breed/association per class when generating pattern pages.
    const patternAssociationMap = new Map();
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
            // Fetch association_name for every selected pattern so the PDF can
            // label each class with its real breed (AQHA/APHA/...), instead of
            // defaulting to the discipline's first association.
            try {
                const { data: assocRows } = await supabase
                    .from('tbl_patterns')
                    .select('id, association_name')
                    .in('id', Array.from(patternIds));
                if (assocRows) {
                    assocRows.forEach(r => {
                        if (r?.id && r.association_name) {
                            patternAssociationMap.set(r.id, r.association_name);
                        }
                    });
                }
            } catch (e) {
                console.error('Error fetching pattern associations:', e);
            }

            // First, try to fetch from tbl_pattern_media (priority)
            const { data: mediaData, error: mediaError } = await supabase
                .from('tbl_pattern_media')
                .select('pattern_id, image_url')
                .in('pattern_id', Array.from(patternIds));
            
            if (!mediaError && mediaData) {
                console.log(`Found ${mediaData.length} pattern media records`);
                // Fetch all pattern images in parallel for better performance
                const mediaFetches = mediaData
                    .filter(media => media.image_url && !patternImagesMap.has(media.pattern_id))
                    .map(async (media) => {
                        const base64 = await fetchImageAsBase64(media.image_url);
                        if (base64) {
                            patternImagesMap.set(media.pattern_id, base64);
                        }
                    });
                await Promise.all(mediaFetches);
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
                    const fallbackFetches = patternsData
                        .filter(p => (p.image_url || p.url) && !patternImagesMap.has(p.id))
                        .map(async (pattern) => {
                            const imageUrl = pattern.image_url || pattern.url;
                            const base64 = await fetchImageAsBase64(imageUrl);
                            if (base64) {
                                patternImagesMap.set(pattern.id, base64);
                            }
                        });
                    await Promise.all(fallbackFetches);
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

    // Fetch scoresheet images from tbl_scoresheet by pattern_id
    const scoresheetImagesMap = new Map(); // pattern_id -> base64
    // Breed-specific fallback: association_abbrev -> base64 (used when no pattern-linked scoresheet)
    const scoresheetByAssocMap = new Map();
    const includeScoresheet = pbbData.downloadIncludes?.scoresheet !== false; // default true
    const includePattern = pbbData.downloadIncludes?.pattern !== false; // default true

    if (includeScoresheet && patternIds.size > 0) {
        try {
            // Step 1: Fetch scoresheets linked to specific patterns
            const { data: scoresheetData, error: scoresheetError } = await supabase
                .from('tbl_scoresheet')
                .select('id, pattern_id, image_url, storage_path, association_abbrev, discipline')
                .in('pattern_id', Array.from(patternIds));

            if (!scoresheetError && scoresheetData) {
                console.log(`Found ${scoresheetData.length} scoresheet records`);
                const ssFetches = scoresheetData
                    .filter(ss => ss.image_url && !scoresheetImagesMap.has(ss.pattern_id))
                    .map(async (ss) => {
                        const base64 = await fetchImageAsBase64(ss.image_url);
                        if (base64) {
                            scoresheetImagesMap.set(ss.pattern_id, base64);
                        }
                    });
                await Promise.all(ssFetches);
            } else if (scoresheetError) {
                console.error('Error fetching scoresheets:', scoresheetError);
            }

            // Step 2: Fetch breed-specific fallback scoresheets by association + discipline
            // This ensures AQHA patterns get AQHA scoresheets, APHA gets APHA, etc.
            const disciplineNames = [...new Set((pbbData.disciplines || []).map(d => d.name).filter(Boolean))];
            const assocAbbrevs = [...new Set(
                (pbbData.disciplines || []).map(d => {
                    const assocId = d.association_id;
                    return assocId?.toUpperCase();
                }).filter(Boolean)
            )];

            if (disciplineNames.length > 0 && assocAbbrevs.length > 0) {
                try {
                    const { data: fallbackSheets } = await supabase
                        .from('tbl_scoresheet')
                        .select('id, image_url, storage_path, association_abbrev, discipline')
                        .in('association_abbrev', assocAbbrevs)
                        .in('discipline', disciplineNames)
                        .is('pattern_id', null);

                    if (fallbackSheets?.length > 0) {
                        const fallbackFetches = fallbackSheets
                            .filter(ss => ss.image_url)
                            .map(async (ss) => {
                                const key = `${ss.association_abbrev}-${ss.discipline}`;
                                if (!scoresheetByAssocMap.has(key)) {
                                    const base64 = await fetchImageAsBase64(ss.image_url);
                                    if (base64) {
                                        scoresheetByAssocMap.set(key, base64);
                                    }
                                }
                            });
                        await Promise.all(fallbackFetches);
                        console.log(`Loaded ${scoresheetByAssocMap.size} breed-specific fallback scoresheets`);
                    }
                } catch (e) {
                    console.error('Error fetching breed-specific fallback scoresheets:', e);
                }
            }
        } catch (err) {
            console.error('Error fetching scoresheet images:', err);
        }
    }
    console.log(`Total scoresheet images loaded: ${scoresheetImagesMap.size} (+ ${scoresheetByAssocMap.size} breed fallbacks)`);

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
        const showTitle = (pbbData.showName || 'Pattern Book').toUpperCase();
        // Auto-fit the title so long show names (e.g. "California Paint Horse
        // Association APHA-AQHA-Open Show") don't overflow or overlap the date.
        const titleFit = fitTextLines(showTitle, {
            maxWidth: pageWidth - 140,
            maxLines: 3,
            startSize: 50,
            minSize: 22,
            font: 'times',
            style: 'bold',
        });
        doc.setFont('times', 'bold');
        doc.setFontSize(titleFit.size);
        const titleTopY = centerY - 80 + logoOffset;
        doc.text(titleFit.lines, pageWidth / 2, titleTopY, { align: 'center' });
        const titleBottomY = titleTopY + (titleFit.lines.length - 1) * titleFit.size * 1.15;

        // Decorative Line — placed just below the (possibly wrapped) title.
        const lineY = titleBottomY + 28;
        doc.setLineWidth(1);
        doc.line(pageWidth / 2 - 100, lineY, pageWidth / 2 + 100, lineY);

        // Date & Location — positioned relative to the decorative line so
        // they never collide with a wrapped title.
        doc.setFont('times', 'italic');
        doc.setFontSize(24);

        let infoY = lineY + 34;
        if (pbbData.startDate && pbbData.endDate) {
            const dateText = `${format(parseLocalDate(pbbData.startDate), 'MMMM d')} – ${format(parseLocalDate(pbbData.endDate), 'd, yyyy')}`;
            doc.text(dateText, pageWidth / 2, infoY, { align: 'center' });
            infoY += 34;
        }

        if (pbbData.venueAddress) {
            doc.setFontSize(18);
            doc.setFont('times', 'normal');
            doc.text(pbbData.venueAddress, pageWidth / 2, infoY, { align: 'center', maxWidth: pageWidth - 120 });
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

            // Title — auto-fit so long show names don't overlap the metadata
            doc.setTextColor(0, 0, 0);
            const showTitle = (pbbData.showName || 'Pattern Book').toUpperCase();
            const titleFitA = fitTextLines(showTitle, {
                maxWidth: pageWidth - 100,
                maxLines: 3,
                startSize: 42,
                minSize: 20,
                font: 'helvetica',
                style: 'bold',
            });
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(titleFitA.size);
            const titleTopYA = pageHeight / 2 - 100 + logoOffsetA;
            doc.text(titleFitA.lines, pageWidth / 2, titleTopYA, { align: 'center' });
            const titleBottomYA = titleTopYA + (titleFitA.lines.length - 1) * titleFitA.size * 1.15;
            // Lay out each metadata row below the wrapped title so nothing collides.
            let metaY = titleBottomYA + 40;

            // Associations
            const associations = Array.isArray(pbbData.associations) ? pbbData.associations : [];
            if (associations.length > 0) {
                doc.setFontSize(20);
                doc.setFont('helvetica', 'normal');
                const assocText = associations.map(a => formatAssociationName(a.id)).join(' • ');
                doc.text(assocText, pageWidth / 2, metaY, { align: 'center', maxWidth: pageWidth - 100 });
                metaY += 36;
            }

            // Dates
            doc.setFontSize(16);
            doc.setFont('helvetica', 'normal');
            if (pbbData.startDate && pbbData.endDate) {
                const dateText = `${format(parseLocalDate(pbbData.startDate), 'MMMM d')} – ${format(parseLocalDate(pbbData.endDate), 'd, yyyy')}`;
                doc.text(dateText, pageWidth / 2, metaY, { align: 'center' });
                metaY += 28;
            }

            // Venue
            if (pbbData.venueAddress) {
                doc.setFontSize(14);
                doc.text(pbbData.venueAddress, pageWidth / 2, metaY, { align: 'center', maxWidth: pageWidth - 120 });
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
                // Single-group fallback: use first available selection for the discipline
                if (!patternSelection && discipline.patternGroups?.length === 1 && disciplineId) {
                    const discSels = pbbData.patternSelections?.[disciplineId];
                    if (discSels) { const fk = Object.keys(discSels)[0]; if (fk) patternSelection = discSels[fk]; }
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
            // Skip empty groups (no divisions assigned) — prevents phantom pages in downloads
            const hasDivisions = group.divisions && group.divisions.length > 0;
            if (!hasDivisions && !skipCoverAndToc) continue;
            // Even in hub mode, skip if no pattern is selected for this group
            if (!hasDivisions) {
                const disciplineId = discipline.id;
                const groupId = group.id;
                const sel = pbbData.patternSelections?.[disciplineId]?.[groupId] || pbbData.patternSelections?.[discIndex]?.[groupIndex];
                if (!sel) continue;
            }

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

            // Single-group fallback: use first available selection for the discipline
            if (!patternSelection && discipline.patternGroups?.length === 1 && disciplineId) {
                const discSels = pbbData.patternSelections?.[disciplineId];
                if (discSels) { const fk = Object.keys(discSels)[0]; if (fk) patternSelection = discSels[fk]; }
            }
            
            // Check for special selection types (judge-assigned, custom-request)
            // Note: the "judgeAssigned" type in Step 6 assigns a judge name to
            // the class but should NOT hide an already-selected pattern. The
            // placeholder "Pattern to be selected by Judge" page should only
            // render when no real patternId has been picked.
            const rawJudgeAssigned = patternSelection?.type === 'judgeAssigned';
            const isCustomRequest = patternSelection?.type === 'customRequest';

            if (patternSelection && !isCustomRequest) {
                // Always try to pull a patternId from the selection — even when
                // type === 'judgeAssigned' — so a pattern assigned alongside a
                // judge is still rendered.
                if (typeof patternSelection === 'object' && patternSelection !== null) {
                    patternId = patternSelection.patternId || patternSelection.id;
                    if (!patternId || (typeof patternId === 'object' && patternId !== null)) {
                        patternId = null;
                    }
                } else {
                    patternId = patternSelection;
                }
            }
            // Only treat the class as judge-assigned (placeholder page) when
            // there's no real pattern to render.
            const isJudgeAssigned = rawJudgeAssigned && !patternId;
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
            
            // Resolve association per-class: prefer the association of the
            // actually-selected pattern (so AQHA/APHA/NSBA are labeled correctly
            // even when a single discipline has classes from multiple breeds).
            const numericPidForAssoc = patternId ? (typeof patternId === 'number' ? patternId : parseInt(patternId)) : null;
            const patternAssocName = numericPidForAssoc && !isNaN(numericPidForAssoc)
                ? patternAssociationMap.get(numericPidForAssoc)
                : null;
            const selectionFilterAssoc = (patternSelection && typeof patternSelection === 'object')
                ? patternSelection.filterAssociation
                : null;
            const fallbackAssocId = discipline.association_id || Object.keys(pbbData.associations || {})[0];
            let assocName;
            if (patternAssocName) {
                // Use the raw association name from tbl_patterns (e.g. "APHA")
                assocName = patternAssocName.split(/[\s-]+/)[0].trim() || patternAssocName;
            } else if (selectionFilterAssoc && selectionFilterAssoc !== 'all') {
                assocName = selectionFilterAssoc;
            } else {
                assocName = formatAssociationName(fallbackAssocId);
            }
            
            if (includePattern) {
                addNewPage();

                // Add to TOC with sequential numbering
                sequentialClassNumber++;
                const tocLabel = group.customLabel ? ` (${group.customLabel})` : '';
                const className = `${discipline.name}${tocLabel} - ${group.divisions.map(d => formatDivisionWithGo(d)).join('/')}`;
                toc.push({
                    title: className,
                    page: doc.internal.getNumberOfPages() - 1,
                    date: competitionDate,
                    classNumber: showClassNumbers ? sequentialClassNumber.toString() : ''
                });

                // yPos is set by addNewPage() to margin + 30 (below page header).
                // Do NOT reset it back to margin — that would overlap the header.
            }

            // Render pattern page based on selected layout
            if (selectedLayout === 'layout-a') {
            if (includePattern) {

            // --- Pattern page header ---
            // Same visual language as individual download:
            //   Association (bold) + date right-aligned
            //   Discipline + divisions
            //   Pattern image fills remaining space (biggest element)
            // The page header already shows the show name, so we skip it here.

            const dateStr = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';

            if (skipCoverAndToc) {
                // Hub mode: compact single-line header
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                const headerLine = `${assocName.toUpperCase()}  •  ${discipline.name.toUpperCase()}  •  ${dateStr}`;
                doc.text(headerLine, margin, yPos, { maxWidth: pageWidth - margin * 2 });
                yPos += 18;
            } else {
            // Line 1: Association (bold) + date (right-aligned)
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(assocName.toUpperCase(), margin, yPos);
            if (dateStr) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(dateStr, pageWidth - margin, yPos, { align: 'right' });
                doc.setTextColor(0, 0, 0);
            }
            yPos += 15;

            // Line 2: Discipline name
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            const disciplineText = discipline.name.toUpperCase();
            const disciplineMaxWidth = pageWidth - margin * 2;
            const disciplineLines = doc.splitTextToSize(disciplineText, disciplineMaxWidth);
            doc.text(disciplineLines, margin, yPos);
            yPos += (disciplineLines.length * 13) + 2;

            // Custom label (e.g., "Monday Practice")
            const customLabel = group.customLabel;
            if (customLabel) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(80, 80, 80);
                doc.text(customLabel, margin, yPos);
                doc.setTextColor(0, 0, 0);
                yPos += 11;
            }

            // Line 3: Division names (compact)
            const divisions = group.divisions?.map(d => formatDivisionWithGo(d)).join(' / ') || '';
            if (divisions) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                const maxWidth = pageWidth - margin * 2;
                const divisionLines = doc.splitTextToSize(divisions, maxWidth);
                const linesToDisplay = divisionLines.slice(0, 2);
                doc.text(linesToDisplay, margin, yPos);
                yPos += (linesToDisplay.length * 11) + 4;
            } else {
                yPos += 4;
            }

            } // end full header (non-hub)
            
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
                            const availH = pageHeight - yPos - 44;
                            const imgW = pageWidth - PATTERN_IMAGE_MARGIN * 2;
                            let finalW = imgW;
                            let finalH = imgW * aspect;
                            if (finalH > availH) { finalH = availH; finalW = finalH / aspect; }
                            const xOff = (pageWidth - finalW) / 2;
                            await addImageToPage(uploadedBase64, xOff, yPos, finalW, finalH);
                            yPos += finalH + 6;
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

                // Add generic scoresheet page (no maneuvers) — only if scoresheets are included
                if (includeScoresheet) {
                    addNewPage();
                    const resolvedJudgeCustomA = skipCoverAndToc ? resolveJudgeName(discipline, group, discIndex, groupIndex) : '';
                    const dateStr = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';
                    drawGenericScoreSheetPage(doc, {
                        association: assocName,
                        showName: pbbData.showName || '',
                        discipline: discipline.name || '',
                        division: group.divisions?.map(d => formatDivisionWithGo(d)).join(' / ') || '',
                        date: dateStr,
                        judge: resolvedJudgeCustomA,
                    });
                }
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
                    // In hub mode, use full image; in book mode, crop bottom summary box
                    const imageBase64 = skipCoverAndToc
                        ? patternImageBase64
                        : await cropPatternImage(patternImageBase64);
                    const imgProps = doc.getImageProperties(imageBase64);
                    const aspect = imgProps.height / imgProps.width;
                    // Reserve space for footer + branding
                    const bottomReserve = 30;
                    const availableHeight = pageHeight - yPos - bottomReserve;
                    const imgWidth = pageWidth - PATTERN_IMAGE_MARGIN * 2;
                    const imgHeight = imgWidth * aspect;

                    let finalWidth = imgWidth;
                    let finalHeight = imgHeight;

                    // Scale down if image exceeds available height
                    if (finalHeight > availableHeight) {
                        finalHeight = availableHeight;
                        finalWidth = finalHeight / aspect;
                    }

                    // Center image horizontally
                    const xOffset = (pageWidth - finalWidth) / 2;

                    await addImageToPage(imageBase64, xOffset, yPos, finalWidth, finalHeight);
                    yPos += finalHeight + 6;
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
            } // end if (includePattern) for layout-a

            // Add scoresheet page after pattern (layout-a) if scoresheet inclusion is enabled
            if (includeScoresheet && !isCustomRequest) {
                const numericPidForSs = patternId ? (typeof patternId === 'number' ? patternId : parseInt(patternId)) : null;
                // Try pattern-linked scoresheet first, then breed-specific fallback by association + discipline
                let ssBase64 = numericPidForSs && !isNaN(numericPidForSs) && scoresheetImagesMap.has(numericPidForSs)
                    ? scoresheetImagesMap.get(numericPidForSs) : null;
                if (!ssBase64) {
                    // Breed-specific fallback: match by association abbreviation + discipline name
                    const breedKey = `${assocName}-${discipline.name}`;
                    ssBase64 = scoresheetByAssocMap.get(breedKey) || null;
                }
                // In full-book mode, omit judge name from scoresheet header
                const resolvedJudgeSsA = skipCoverAndToc ? resolveJudgeName(discipline, group, discIndex, groupIndex) : '';
                const divisionLabelA = group.divisions?.map(d => formatDivisionWithGo(d)).join(' / ') || '';
                const ssDateStrA = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';
                if (ssBase64) {
                    addNewPage();
                    const ssMargin = SCORESHEET_LAYOUT.margin;
                    const topReserve = 40;
                    try {
                        const ssProps = doc.getImageProperties(ssBase64);
                        const ssAspect = ssProps.height / ssProps.width;
                        const ssAvailH = pageHeight - ssMargin - topReserve;
                        const ssImgW = pageWidth - ssMargin * 2;
                        let ssFinalW = ssImgW;
                        let ssFinalH = ssImgW * ssAspect;
                        if (ssFinalH > ssAvailH) { ssFinalH = ssAvailH; ssFinalW = ssFinalH / ssAspect; }
                        const ssXOff = (pageWidth - ssFinalW) / 2;
                        const ssYOff = topReserve + 4;
                        drawScoreSheetHeader({
                            judgeName: resolvedJudgeSsA,
                            disciplineName: discipline.name,
                            division: divisionLabelA,
                            assocName,
                            dateStr: ssDateStrA,
                        });
                        await addImageToPage(ssBase64, ssXOff, ssYOff, ssFinalW, ssFinalH);
                        // (label overlay is applied via canvas in the download path)
                    } catch (ssErr) {
                        console.error('Failed to add scoresheet image:', ssErr);
                    }
                } else if (!hasNoPattern) {
                    addNewPage();
                    drawGenericScoreSheetPage(doc, {
                        association: assocName,
                        showName: pbbData.showName || '',
                        discipline: discipline.name || '',
                        division: divisionLabelA,
                        date: ssDateStrA,
                        judge: resolvedJudgeSsA,
                    });
                }
            }

            } else if (selectedLayout === 'layout-b') {
                if (includePattern) {

                // --- Pattern page header (Layout B) ---
                // Same visual language as Layout A but with serif fonts

                const dateStrB = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';

                if (skipCoverAndToc) {
                    // Hub mode: compact single-line header
                    doc.setTextColor(0, 0, 0);
                    doc.setFont('times', 'bold');
                    doc.setFontSize(10);
                    const headerLine = `${assocName.toUpperCase()}  •  ${discipline.name.toUpperCase()}  •  ${dateStrB}`;
                    doc.text(headerLine, margin, yPos, { maxWidth: pageWidth - margin * 2 });
                    yPos += 18;
                } else {
                // Line 1: Association (bold) + date (right-aligned)
                doc.setTextColor(0, 0, 0);
                doc.setFont('times', 'bold');
                doc.setFontSize(11);
                doc.text(assocName.toUpperCase(), margin, yPos);
                if (dateStrB) {
                    doc.setFont('times', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(100, 100, 100);
                    doc.text(dateStrB, pageWidth - margin, yPos, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                }
                yPos += 15;

                // Line 2: Discipline name
                doc.setFontSize(10);
                doc.setFont('times', 'bold');
                const disciplineTextB = discipline.name.toUpperCase();
                const disciplineMaxWidthB = pageWidth - margin * 2;
                const disciplineLinesB = doc.splitTextToSize(disciplineTextB, disciplineMaxWidthB);
                doc.text(disciplineLinesB, margin, yPos);
                yPos += (disciplineLinesB.length * 13) + 2;

                // Custom label
                const customLabelB = group.customLabel;
                if (customLabelB) {
                    doc.setFontSize(9);
                    doc.setFont('times', 'italic');
                    doc.setTextColor(80, 80, 80);
                    doc.text(customLabelB, margin, yPos);
                    doc.setTextColor(0, 0, 0);
                    yPos += 11;
                }

                // Line 3: Division names (compact)
                const divisionsB = group.divisions?.map(d => formatDivisionWithGo(d)).join(' / ') || '';
                if (divisionsB) {
                    doc.setFontSize(9);
                    doc.setFont('times', 'normal');
                    const maxWidthB = pageWidth - margin * 2;
                    const divisionLinesB = doc.splitTextToSize(divisionsB, maxWidthB);
                    const linesToDisplayB = divisionLinesB.slice(0, 2);
                    doc.text(linesToDisplayB, margin, yPos);
                    yPos += (linesToDisplayB.length * 11) + 4;
                } else {
                    yPos += 4;
                }

                } // end full header (non-hub)
                
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
                                const availH = pageHeight - yPos - 44;
                                const imgW = pageWidth - PATTERN_IMAGE_MARGIN * 2;
                                let finalW = imgW;
                                let finalH = imgW * aspect;
                                if (finalH > availH) { finalH = availH; finalW = finalH / aspect; }
                                const xOff = (pageWidth - finalW) / 2;
                                await addImageToPage(uploadedBase64, xOff, yPos, finalW, finalH);
                                yPos += finalH + 6;
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

                    // Add generic scoresheet page (no maneuvers) — only if scoresheets are included
                    if (includeScoresheet) {
                        addNewPage();
                        const resolvedJudgeCustomB = skipCoverAndToc ? resolveJudgeName(discipline, group, discIndex, groupIndex) : '';
                        const dateStrB = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';
                        drawGenericScoreSheetPage(doc, {
                            association: assocName,
                            showName: pbbData.showName || '',
                            discipline: discipline.name || '',
                            division: group.divisions?.map(d => formatDivisionWithGo(d)).join(' / ') || '',
                            date: dateStrB,
                            judge: resolvedJudgeCustomB,
                        });
                    }
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
                        // In hub mode, use full image; in book mode, crop bottom summary box
                        const imageBase64 = skipCoverAndToc
                            ? patternImageBase64
                            : await cropPatternImage(patternImageBase64);
                        const imgProps = doc.getImageProperties(imageBase64);
                        const aspect = imgProps.height / imgProps.width;
                        // Reserve space for footer + branding
                        const bottomReserveB = 30;
                        const availableHeight = pageHeight - yPos - bottomReserveB;
                        const imgWidth = pageWidth - PATTERN_IMAGE_MARGIN * 2;
                        const imgHeight = imgWidth * aspect;

                        let finalWidth = imgWidth;
                        let finalHeight = imgHeight;

                        if (finalHeight > availableHeight) {
                            finalHeight = availableHeight;
                            finalWidth = finalHeight / aspect;
                        }

                        const xOffset = (pageWidth - finalWidth) / 2;

                        await addImageToPage(imageBase64, xOffset, yPos, finalWidth, finalHeight);
                        yPos += finalHeight + 6;
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
                } // end if (includePattern) for layout-b

                // Add scoresheet page after pattern (layout-b) if scoresheet inclusion is enabled
                if (includeScoresheet && !isCustomRequest) {
                    const numericPidForSsB = patternId ? (typeof patternId === 'number' ? patternId : parseInt(patternId)) : null;
                    // Try pattern-linked scoresheet first, then breed-specific fallback
                    let ssBase64B = numericPidForSsB && !isNaN(numericPidForSsB) && scoresheetImagesMap.has(numericPidForSsB)
                        ? scoresheetImagesMap.get(numericPidForSsB) : null;
                    if (!ssBase64B) {
                        const breedKeyB = `${assocName}-${discipline.name}`;
                        ssBase64B = scoresheetByAssocMap.get(breedKeyB) || null;
                    }
                    // In full-book mode, omit judge name from scoresheet header
                    const resolvedJudgeSsB = skipCoverAndToc ? resolveJudgeName(discipline, group, discIndex, groupIndex) : '';
                    const divisionLabelB = group.divisions?.map(d => formatDivisionWithGo(d)).join(' / ') || '';
                    const dateStrSsB = competitionDate ? format(parseLocalDate(competitionDate), 'MM-dd-yyyy') : '';
                    if (ssBase64B) {
                        addNewPage();
                        const ssMarginB = SCORESHEET_LAYOUT.margin;
                        const topReserveB = 40;
                        try {
                            const ssProps = doc.getImageProperties(ssBase64B);
                            const ssAspect = ssProps.height / ssProps.width;
                            const ssAvailH = pageHeight - ssMarginB - topReserveB;
                            const ssImgW = pageWidth - ssMarginB * 2;
                            let ssFinalW = ssImgW;
                            let ssFinalH = ssImgW * ssAspect;
                            if (ssFinalH > ssAvailH) { ssFinalH = ssAvailH; ssFinalW = ssFinalH / ssAspect; }
                            const ssXOff = (pageWidth - ssFinalW) / 2;
                            const ssYOff = topReserveB + 4;
                            drawScoreSheetHeader({
                                judgeName: resolvedJudgeSsB,
                                disciplineName: discipline.name,
                                division: divisionLabelB,
                                assocName,
                                dateStr: dateStrSsB,
                            });
                            await addImageToPage(ssBase64B, ssXOff, ssYOff, ssFinalW, ssFinalH);
                            // (label overlay is applied via canvas in the download path)
                        } catch (ssErr) {
                            console.error('Failed to add scoresheet image (layout-b):', ssErr);
                        }
                    } else if (!hasNoPattern) {
                        addNewPage();
                        drawGenericScoreSheetPage(doc, {
                            association: assocName,
                            showName: pbbData.showName || '',
                            discipline: discipline.name || '',
                            division: divisionLabelB,
                            date: dateStrSsB,
                            judge: resolvedJudgeSsB,
                        });
                    }
                }
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
        // Auto-fit the TOC header so long show names don't get cut off on
        // the left/right edges of the page (e.g. "California Paint Horse
        // Association APHA-AQHA-Open Show – Table of Contents").
        const tocTitle = `${pbbData.showName || 'Pattern Book'} – Table of Contents`;
        const tocTitleFit = fitTextLines(tocTitle, {
            maxWidth: pageWidth - margin * 2,
            maxLines: 2,
            startSize: 20,
            minSize: 12,
            font: 'helvetica',
            style: 'bold',
        });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(tocTitleFit.size);
        doc.text(tocTitleFit.lines, pageWidth / 2, yPos, { align: 'center' });
        yPos += 30 + (tocTitleFit.lines.length - 1) * (tocTitleFit.size + 4);
    
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
