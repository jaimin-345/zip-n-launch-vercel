import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fetchImageAsBase64, fetchPatternAndScoresheetAssets } from './pdfHelpers';

export const generatePatternBookPdf = async (pbbData) => {
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
        return assocNames[assocId?.toLowerCase()] || assocId?.toUpperCase() || 'HORSE ASSOCIATION';
    };
    
    // --- Fetch Assets ---
    const assets = await fetchPatternAndScoresheetAssets(pbbData);
    let coverImageBase64 = null;
    if (pbbData.coverPageOption === 'upload' && pbbData.marketing?.coverImage?.fileUrl) {
        coverImageBase64 = await fetchImageAsBase64(pbbData.marketing.coverImage.fileUrl);
    }
    const sponsorLogosBase64 = [];
    if (pbbData.marketing?.sponsorLogos?.length > 0) {
        for(const logo of pbbData.marketing.sponsorLogos) {
            const base64 = await fetchImageAsBase64(logo.fileUrl);
            if(base64) sponsorLogosBase64.push(base64);
        }
    }


    // --- Cover Page ---
    if (pbbData.coverPageOption !== 'none') {
        toc.push({ title: 'Cover Page', page: doc.internal.getNumberOfPages() });
        if (pbbData.coverPageOption === 'upload' && coverImageBase64) {
             await addImageToPage(coverImageBase64, 0, 0, pageWidth, pageHeight);
        } else {
            doc.setFillColor(245, 245, 250);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            doc.setTextColor(40, 40, 40);
            doc.setFontSize(42);
            doc.setFont('helvetica', 'bold');
            const showTitle = (pbbData.showName || 'Pattern Book').toUpperCase();
            doc.text(showTitle, pageWidth / 2, pageHeight / 2 - 100, { align: 'center', maxWidth: pageWidth - 80 });
            
            const associations = Array.isArray(pbbData.associations) ? pbbData.associations : [];
            if (associations.length > 0) {
                doc.setFontSize(20);
                doc.setFont('helvetica', 'normal');
                const assocText = associations.map(a => formatAssociationName(a.id)).join(' • ');
                doc.text(assocText, pageWidth / 2, pageHeight / 2 - 40, { align: 'center', maxWidth: pageWidth - 80 });
            }
            
            doc.setFontSize(16);
            doc.setFont('helvetica', 'normal');
            if (pbbData.startDate && pbbData.endDate) {
                const dateText = `${format(new Date(pbbData.startDate), 'MMMM d')} – ${format(new Date(pbbData.endDate), 'd, yyyy')}`;
                doc.text(dateText, pageWidth / 2, pageHeight / 2, { align: 'center' });
            }
            
            if (pbbData.venueAddress) {
                doc.setFontSize(14);
                doc.text(pbbData.venueAddress, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
            }
        }
    }

    // --- Table of Contents ---
    const generateToc = () => {
        addNewPage();
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(`${pbbData.showName || 'Pattern Book'} – Table of Contents`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 40;

        // Group TOC by date
        const tocByDate = {};
        toc.forEach(item => {
            if (!item.date) return;
            if (!tocByDate[item.date]) tocByDate[item.date] = [];
            tocByDate[item.date].push(item);
        });

        const sortedDates = Object.keys(tocByDate).sort();
        sortedDates.forEach(dateStr => {
            if (yPos > pageHeight - 100) addNewPage();
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            const dateFormatted = format(new Date(dateStr), 'EEEE, MMMM d, yyyy');
            doc.text(dateFormatted, margin, yPos);
            yPos += 25;

            const tableData = tocByDate[dateStr].map(item => [
                item.classNumber || '',
                item.title || '',
                item.page.toString()
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['#', 'Class', 'Pg']],
                body: tableData,
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 5 },
                headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [40, 40, 40] },
                columnStyles: { 
                    0: { cellWidth: 60 },
                    2: { cellWidth: 40, halign: 'center' }
                },
                margin: { left: margin, right: margin }
            });
            yPos = doc.autoTable.previous.finalY + 20;
        });
    };


    // --- Pattern Pages ---
    (pbbData.disciplines || []).forEach((discipline, discIndex) => {
        (discipline.patternGroups || []).forEach((group, groupIndex) => {
            const patternId = pbbData.patternSelections?.[discIndex]?.[groupIndex];
            const competitionDate = group.competitionDate || pbbData.startDate;
            
            // Get association info
            const assocId = discipline.associationId || (pbbData.associations?.[0]?.id);
            const assocName = formatAssociationName(assocId);
            
            addNewPage();
            
            // Add to TOC
            const classNumber = `${discIndex + 1}${groupIndex + 1}`;
            const className = `${discipline.name} - ${group.divisions.map(d => d.division).join('/')}`;
            toc.push({ 
                title: className,
                page: doc.internal.getNumberOfPages(),
                date: competitionDate,
                classNumber: classNumber
            });
            
            // Page header with date and association
            const dateHeader = competitionDate ? format(new Date(competitionDate), 'MM-dd-yyyy') : '';
            addPageHeader(`${assocName}, ${pbbData.showName || 'Horse Show'}`, `${discipline.name.toUpperCase()} - ${dateHeader}`);
            
            yPos = margin + 30;
            
            // Association name - centered, large
            doc.setTextColor(40, 40, 40);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(assocName, pageWidth / 2, yPos, { align: 'center' });
            yPos += 25;
            
            // Class info
            doc.setFontSize(14);
            doc.text(`${classNumber} ${className}`, pageWidth / 2, yPos, { align: 'center', maxWidth: pageWidth - 100 });
            yPos += 20;
            
            // Show info
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(pbbData.showName?.toUpperCase() || 'HORSE SHOW', pageWidth / 2, yPos, { align: 'center' });
            yPos += 18;
            
            // Venue and dates
            doc.setFontSize(10);
            const venueText = pbbData.venueAddress?.toUpperCase() || '';
            doc.text(venueText, pageWidth / 2, yPos, { align: 'center' });
            yPos += 40;
            
            // Pattern diagram area - show loading or empty space
            const diagramHeight = 280;
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(1);
            doc.rect(margin, yPos, pageWidth - margin * 2, diagramHeight);
            
            // Add "Pattern Diagram" text in center
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(14);
            doc.setTextColor(150, 150, 150);
            doc.text('[Pattern Diagram]', pageWidth / 2, yPos + diagramHeight / 2, { align: 'center' });
            
            yPos += diagramHeight + 30;
            
            // Pattern steps table
            doc.setTextColor(40, 40, 40);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Pattern', margin, yPos);
            yPos += 5;
            
            // Create sample pattern steps (can be customized based on actual data)
            const patternSteps = [];
            for (let i = 1; i <= 8; i++) {
                patternSteps.push([i.toString(), `[Step ${i} description]`]);
            }
            
            doc.autoTable({
                startY: yPos,
                body: patternSteps,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 4 },
                columnStyles: { 
                    0: { cellWidth: 30, fontStyle: 'bold' },
                    1: { cellWidth: pageWidth - margin * 2 - 30 }
                },
                margin: { left: margin, right: margin }
            });
            
            yPos = doc.autoTable.previous.finalY + 10;
            
            // Pattern complete footer
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.text('Pattern Complete', margin, yPos);
        });
    });
    
    // --- Sponsor Page ---
    if(sponsorLogosBase64.length > 0) {
        addNewPage();
        const sponsorDate = pbbData.startDate || new Date().toISOString();
        toc.push({ title: 'Our Sponsors', page: doc.internal.getNumberOfPages(), date: sponsorDate });
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

    // --- Finalize: Generate TOC and add page numbers ---
    // First, generate TOC to know how many pages it takes
    const tocPagesBefore = doc.internal.getNumberOfPages();
    doc.setPage(2);
    const tocStartPage = 2;
    generateToc();
    const tocPagesAfter = doc.internal.getNumberOfPages();
    const tocPageCount = tocPagesAfter - tocPagesBefore;
    
    // Adjust page numbers in TOC since TOC pages shift everything
    if (tocPageCount > 0) {
        toc.forEach(item => {
            if (item.page > 1) {
                item.page += tocPageCount;
            }
        });
        
        // Regenerate TOC with adjusted page numbers
        doc.setPage(tocStartPage);
        yPos = margin + 30;
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(`${pbbData.showName || 'Pattern Book'} – Table of Contents`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 40;

        const tocByDate = {};
        toc.forEach(item => {
            if (!item.date) return;
            if (!tocByDate[item.date]) tocByDate[item.date] = [];
            tocByDate[item.date].push(item);
        });

        const sortedDates = Object.keys(tocByDate).sort();
        sortedDates.forEach(dateStr => {
            if (yPos > pageHeight - 100) {
                doc.addPage();
                yPos = margin + 30;
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            const dateFormatted = format(new Date(dateStr), 'EEEE, MMMM d, yyyy');
            doc.text(dateFormatted, margin, yPos);
            yPos += 25;

            const tableData = tocByDate[dateStr].map(item => [
                item.classNumber || '',
                item.title || '',
                item.page.toString()
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['#', 'Class', 'Pg']],
                body: tableData,
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 5 },
                headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [40, 40, 40] },
                columnStyles: { 
                    0: { cellWidth: 60 },
                    2: { cellWidth: 40, halign: 'center' }
                },
                margin: { left: margin, right: margin }
            });
            yPos = doc.autoTable.previous.finalY + 20;
        });
    }
    
    // Add footers to all pages
    const finalPageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= finalPageCount; i++) {
        doc.setPage(i);
        addPageFooter(i);
    }

    return doc.output('datauristring');
};