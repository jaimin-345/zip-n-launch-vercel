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
    const addPageHeader = (text) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text(text, margin, margin / 2);
    };

    const addPageFooter = (pageNumber) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - margin / 2, { align: 'center' });
    };
    
    const addNewPage = (headerText) => {
        doc.addPage();
        yPos = margin;
        if (headerText) addPageHeader(headerText);
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
            doc.setFillColor(41, 128, 185);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(36);
            doc.setFont('helvetica', 'bold');
            doc.text(pbbData.showName || 'Pattern Book', pageWidth / 2, pageHeight / 2 - 60, { align: 'center' });
            doc.setFontSize(18);
            doc.setFont('helvetica', 'normal');
            doc.text(pbbData.venueAddress || 'Event Location', pageWidth / 2, pageHeight / 2 - 30, { align: 'center' });
            if (pbbData.startDate) {
                const dateText = pbbData.endDate 
                    ? `${format(new Date(pbbData.startDate), 'MMMM d')} - ${format(new Date(pbbData.endDate), 'MMMM d, yyyy')}`
                    : format(new Date(pbbData.startDate), 'MMMM d, yyyy');
                doc.text(dateText, pageWidth / 2, pageHeight / 2, { align: 'center' });
            }
        }
    }

    // --- Table of Contents ---
    const generateToc = () => {
        addNewPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text('Table of Contents', margin, yPos);
        yPos += 40;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);

        toc.forEach(item => {
            const titleWidth = doc.getStringUnitWidth(item.title) * doc.getFontSize() / doc.internal.scaleFactor;
            const pageNumStr = `${item.page}`;
            const pageNumWidth = doc.getStringUnitWidth(pageNumStr) * doc.getFontSize() / doc.internal.scaleFactor;
            const dotsWidth = pageWidth - margin * 2 - titleWidth - pageNumWidth;
            const dots = '.'.repeat(Math.floor(dotsWidth / (doc.getStringUnitWidth('.') * doc.getFontSize() / doc.internal.scaleFactor)));
            
            doc.text(item.title, margin, yPos);
            doc.text(dots, margin + titleWidth, yPos);
            doc.text(pageNumStr, pageWidth - margin - pageNumWidth, yPos);
            yPos += 20;
        });
    };

    // --- Show Information Page ---
    addNewPage();
    toc.push({ title: 'Show Information', page: doc.internal.getNumberOfPages() });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Show Information', margin, yPos);
    yPos += 30;

    const info = [
        ['Show Name', pbbData.showName],
        ['Venue', pbbData.venueAddress],
        ['Start Date', pbbData.startDate ? format(new Date(pbbData.startDate), 'PPP') : 'N/A'],
        ['End Date', pbbData.endDate ? format(new Date(pbbData.endDate), 'PPP') : 'N/A']
    ];
    doc.autoTable({
        startY: yPos,
        body: info,
        theme: 'striped',
        styles: { fontSize: 11, cellPadding: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    yPos = doc.autoTable.previous.finalY + 20;

    if (pbbData.officials?.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Judges & Staff', margin, yPos);
        yPos += 20;
        doc.autoTable({
            startY: yPos,
            head: [['Name', 'Role', 'Association']],
            body: pbbData.officials.map(o => [o.name, o.role, o.association || 'N/A']),
            theme: 'grid',
        });
        yPos = doc.autoTable.previous.finalY + 20;
    }

    // --- Daily Schedule ---
    addNewPage();
    toc.push({ title: 'Schedule', page: doc.internal.getNumberOfPages() });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Daily Schedule', margin, yPos);
    yPos += 30;

    const scheduleData = pbbData.disciplines?.flatMap(disc => 
        disc.patternGroups?.map(pg => ({
            date: pg.competitionDate ? format(new Date(pg.competitionDate), 'yyyy-MM-dd') : 'Unscheduled',
            discipline: disc.name,
            group: pg.name,
            divisions: pg.divisions.map(d => d.division).join(', ')
        }))
    ).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));

    if (scheduleData?.length > 0) {
        const groupedByDate = scheduleData.reduce((acc, curr) => {
            (acc[curr.date] = acc[curr.date] || []).push(curr);
            return acc;
        }, {});

        Object.entries(groupedByDate).forEach(([date, events]) => {
            if (yPos > pageHeight - 100) addNewPage('Daily Schedule');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(date === 'Unscheduled' ? 'Unscheduled' : format(new Date(date), 'EEEE, MMMM d, yyyy'), margin, yPos);
            yPos += 20;

            doc.autoTable({
                startY: yPos,
                head: [['Discipline', 'Pattern Group', 'Divisions']],
                body: events.map(e => [e.discipline, e.group, e.divisions]),
                theme: 'striped'
            });
            yPos = doc.autoTable.previous.finalY + 20;
        });
    } else {
        doc.setFontSize(12);
        doc.text('No schedule has been configured.', margin, yPos);
    }
    yPos = doc.autoTable.previous.finalY + 20;

    // --- Patterns & Scoresheets ---
    (pbbData.disciplines || []).forEach((discipline, discIndex) => {
        (discipline.patternGroups || []).forEach((group, groupIndex) => {
            const patternId = pbbData.patternSelections?.[discIndex]?.[groupIndex];
            const scoresheetId = pbbData.scoresheetSelections?.[discIndex]?.[groupIndex];
            
            const groupTitle = `${discipline.name} - ${group.name}`;

            if (patternId && assets.patterns[patternId]) {
                addNewPage(groupTitle);
                toc.push({ title: groupTitle + ' (Pattern)', page: doc.internal.getNumberOfPages() });
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                doc.text(groupTitle, margin, yPos);
                yPos += 20;
                doc.setFontSize(11);
                doc.text(`Divisions: ${group.divisions.map(d => d.division).join(', ')}`, margin, yPos);
                yPos += 20;
                
                const imgBase64 = assets.patterns[patternId];
                if (imgBase64) {
                    const imgProps = doc.getImageProperties(imgBase64);
                    const aspect = imgProps.height / imgProps.width;
                    const imgWidth = pageWidth - margin * 2;
                    const imgHeight = imgWidth * aspect;
                    if (yPos + imgHeight > pageHeight - margin) {
                        addNewPage(groupTitle);
                        yPos = margin;
                    }
                    addImageToPage(imgBase64, margin, yPos, imgWidth, imgHeight);
                    yPos += imgHeight + 20;
                }
            }

            if (scoresheetId && assets.scoresheets[scoresheetId]) {
                addNewPage(groupTitle);
                toc.push({ title: groupTitle + ' (Scoresheet)', page: doc.internal.getNumberOfPages() });
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                doc.text(groupTitle, margin, yPos);
                yPos += 20;

                const imgBase64 = assets.scoresheets[scoresheetId];
                if (imgBase64) {
                    const imgProps = doc.getImageProperties(imgBase64);
                    const aspect = imgProps.height / imgProps.width;
                    const imgWidth = pageWidth - margin * 2;
                    const imgHeight = imgWidth * aspect;
                    if (yPos + imgHeight > pageHeight - margin) {
                        addNewPage(groupTitle);
                        yPos = margin;
                    }
                    addImageToPage(imgBase64, margin, yPos, imgWidth, imgHeight);
                    yPos += imgHeight + 20;
                }
            }
        });
    });
    
    // --- Sponsor Page ---
    if(sponsorLogosBase64.length > 0) {
        addNewPage();
        toc.push({ title: 'Our Sponsors', page: doc.internal.getNumberOfPages() });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text('Thank You to Our Sponsors!', pageWidth / 2, yPos, { align: 'center' });
        yPos += 40;
        
        const logoSize = 120;
        const logosPerRow = 3;
        const xStart = (pageWidth - (logosPerRow * logoSize + (logosPerRow - 1) * 20)) / 2;
        let currentX = xStart;
        
        sponsorLogosBase64.forEach((logoBase64, index) => {
            if(index > 0 && index % logosPerRow === 0) {
                yPos += logoSize + 20;
                currentX = xStart;
            }
             if (yPos > pageHeight - logoSize - margin) {
                addNewPage('Our Sponsors');
                yPos = margin;
            }
            
            addImageToPage(logoBase64, currentX, yPos, logoSize, logoSize);
            currentX += logoSize + 20;
        });
    }

    // --- Finalize: Add page numbers and TOC ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addPageFooter(i);
    }

    doc.setPage(2);
    generateToc();
    for (let i = 1; i <= pageCount; i++) { // re-add footers after TOC insertion
        doc.setPage(i);
        addPageFooter(i);
    }

    return doc.output('datauristring');
};