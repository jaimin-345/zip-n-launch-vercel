import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fetchImageAsBase64, fetchPatternAndScoresheetAssets } from './pdfHelpers';
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
    
    // Load dummy pattern graph image
    const dummyPatternBase64 = await fetchImageAsBase64(patternDiagram);
    
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
            const dateText = `${format(new Date(pbbData.startDate), 'MMMM d')} – ${format(new Date(pbbData.endDate), 'd, yyyy')}`;
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
            // Dark blue background
            doc.setFillColor(52, 73, 94);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Decorative border
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(3);
            doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2), 'S');
            
            // Title
            doc.setTextColor(255, 255, 255);
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
                const dateText = `${format(new Date(pbbData.startDate), 'MMMM d')} – ${format(new Date(pbbData.endDate), 'd, yyyy')}`;
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
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Table of Contents', margin, margin + 40);
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
                if (yPos > pageHeight - margin) {
                    addNewPage();
                    yPos = margin + 30;
                }
                
                const divisions = group.divisions?.map(d => d.division).join(', ');
                const patternId = pbbData.patternSelections?.[discIndex]?.[groupIndex];
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
            const patternId = pbbData.patternSelections?.[discIndex]?.[groupIndex];
            
            // Get competition date from groupDueDates
            const competitionDate = pbbData.groupDueDates?.[discIndex]?.[groupIndex] || pbbData.startDate;
            
            // Get association info from discipline
            const assocId = discipline.association_id || Object.keys(pbbData.associations || {})[0];
            const assocName = formatAssociationName(assocId);
            
            addNewPage();
            
            // Add to TOC with sequential numbering
            sequentialClassNumber++;
            const className = `${discipline.name} - ${group.divisions.map(d => d.division).join('/')}`;
            toc.push({ 
                title: className,
                page: doc.internal.getNumberOfPages(),
                date: competitionDate,
                classNumber: sequentialClassNumber.toString()
            });
            
            // Page header with date and association
            const dateHeader = competitionDate ? format(new Date(competitionDate), 'MM-dd-yyyy') : '';
            addPageHeader(`${assocName}, ${pbbData.showName || 'Horse Show'}`, `${discipline.name.toUpperCase()} - ${dateHeader}`);
            
            yPos = margin + 30;
            
            // Render pattern page based on selected layout
            if (selectedLayout === 'layout-a') {
            // Association name header (no yellow background) - same position as first page
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(assocName, pageWidth / 2, yPos + 10, { align: 'center' });
            
            yPos += 35; // Increased spacing after association name
            
            // Discipline and group info
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const dateStr = competitionDate ? format(new Date(competitionDate), 'MM-dd-yyyy') : '';
            doc.text(`${discipline.name.toUpperCase()} - ${dateStr}`, margin, yPos);
            yPos += 15;
            
            // Get division names from the group
            const divisions = group.divisions?.map(d => d.division).join('/') || '';
            doc.text(divisions, margin, yPos);
            yPos += 15;
            
            // Horizontal line separator
            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(2);
            doc.line(margin, yPos + 10, pageWidth - margin, yPos + 10);
            yPos += 30;
            
            // Add dummy pattern graph image
            if (dummyPatternBase64) {
                try {
                    const imgProps = doc.getImageProperties(dummyPatternBase64);
                    const aspect = imgProps.height / imgProps.width;
                    const imgWidth = pageWidth - margin * 2;
                    const imgHeight = imgWidth * aspect;
                    const maxHeight = 400;
                    
                    if (imgHeight > maxHeight) {
                        const scaledHeight = maxHeight;
                        const scaledWidth = scaledHeight / aspect;
                        const xOffset = (pageWidth - scaledWidth) / 2;
                        await addImageToPage(dummyPatternBase64, xOffset, yPos, scaledWidth, scaledHeight);
                        yPos += scaledHeight + 20;
                    } else {
                        await addImageToPage(dummyPatternBase64, margin, yPos, imgWidth, imgHeight);
                        yPos += imgHeight + 20;
                    }
                } catch (e) {
                    console.error('Failed to add dummy pattern image:', e);
                    // Fallback to empty box
                    const graphHeight = 400;
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(1);
                    doc.rect(margin, yPos, pageWidth - (margin * 2), graphHeight);
                    yPos += graphHeight + 20;
                }
            } else {
                // Fallback if image not loaded
                const graphHeight = 400;
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(1);
                doc.rect(margin, yPos, pageWidth - (margin * 2), graphHeight);
                yPos += graphHeight + 20;
            }
            
            // Horizontal line separator
            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(2);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 20;
            
            // Pattern instructions below the graph
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            
            const patternInstructions = [
                '1  Jog serpentine over poles, Jog over poles',
                '2  Walk over poles, stop at gate',
                '3  Work gate with left hand, close gate',
                '4  Back past gate into box',
                '5  Jog over poles, stop in box',
                '6  360° turn right, walk out',
                '7  Jog over poles',
                '8  Walk over poles and bridge'
            ];
            
            // Display instructions in single column
            for (const instruction of patternInstructions) {
                doc.text(instruction, margin, yPos);
                yPos += 12;
            }
            
            // Add "Pattern Complete" text
            yPos += 5;
            doc.setFont('helvetica', 'bold');
            doc.text('Pattern Complete', margin, yPos);
            
            } else if (selectedLayout === 'layout-b') {
                // LAYOUT B: Classic Design (Placeholder/Alternative)
                
                // Header with serif font
                doc.setTextColor(0, 0, 0);
                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                doc.text(assocName, pageWidth / 2, yPos + 10, { align: 'center' });
                
                yPos += 25;
                
                // Centered Discipline Info
                doc.setFontSize(12);
                doc.setFont('times', 'italic');
                const dateStr = competitionDate ? format(new Date(competitionDate), 'MMMM d, yyyy') : '';
                doc.text(`${discipline.name} - ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
                yPos += 20;
                
                // Centered Divisions
                doc.setFontSize(10);
                doc.setFont('times', 'normal');
                const divisions = group.divisions?.map(d => d.division).join(' / ');
                doc.text(divisions, pageWidth / 2, yPos, { align: 'center' });
                yPos += 20;
                
                // Double line separator
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.5);
                doc.line(margin + 20, yPos, pageWidth - margin - 20, yPos);
                doc.line(margin + 20, yPos + 3, pageWidth - margin - 20, yPos + 3);
                yPos += 30;
                
                // Graph Area (Boxed)
                if (dummyPatternBase64) {
                    try {
                        const imgProps = doc.getImageProperties(dummyPatternBase64);
                        const aspect = imgProps.height / imgProps.width;
                        const imgWidth = pageWidth - margin * 3; // Narrower
                        const imgHeight = imgWidth * aspect;
                        const maxHeight = 380;
                        
                        let finalWidth = imgWidth;
                        let finalHeight = imgHeight;
                        
                        if (imgHeight > maxHeight) {
                            finalHeight = maxHeight;
                            finalWidth = finalHeight / aspect;
                        }
                        
                        const xOffset = (pageWidth - finalWidth) / 2;
                        
                        // Draw box around image
                        doc.setDrawColor(0, 0, 0);
                        doc.setLineWidth(1);
                        doc.rect(xOffset - 5, yPos - 5, finalWidth + 10, finalHeight + 10);
                        
                        await addImageToPage(dummyPatternBase64, xOffset, yPos, finalWidth, finalHeight);
                        yPos += finalHeight + 30;
                    } catch (e) {
                         // Fallback
                        doc.rect(margin + 20, yPos, pageWidth - (margin * 2) - 40, 350);
                        doc.text("Pattern Image Placeholder", pageWidth/2, yPos + 175, {align: 'center'});
                        yPos += 370;
                    }
                } else {
                    doc.rect(margin + 20, yPos, pageWidth - (margin * 2) - 40, 350);
                    yPos += 370;
                }
                
                // Instructions (Centered)
                doc.setFont('times', 'normal');
                doc.setFontSize(10);
                doc.text("Pattern Instructions (Layout B)", pageWidth / 2, yPos, { align: 'center' });
                yPos += 15;
                
                const patternInstructions = [
                    '1. Jog serpentine over poles, Jog over poles',
                    '2. Walk over poles, stop at gate',
                    '3. Work gate with left hand, close gate',
                    '4. Back past gate into box',
                    '5. Jog over poles, stop in box',
                    '6. 360° turn right, walk out',
                    '7. Jog over poles',
                    '8. Walk over poles and bridge'
                ];
                
                for (const instruction of patternInstructions) {
                    doc.text(instruction, pageWidth / 2, yPos, { align: 'center' });
                    yPos += 12;
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
    // Insert TOC on page 2
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
        sortedDates.forEach(dateStr => {
            if (yPos > pageHeight - 150) {
                doc.addPage();
                yPos = margin + 30;
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            const dateFormatted = format(new Date(dateStr), 'EEEE, MMMM d, yyyy');
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
                headStyles: { fontStyle: 'bold', fillColor: [52, 73, 94], textColor: [255, 255, 255] }, // Dark header with white text
                columnStyles: { 
                    0: { cellWidth: 60 },
                    2: { cellWidth: 40, halign: 'center' }
                },
            margin: { left: margin, right: margin }
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
