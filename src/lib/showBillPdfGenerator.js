import jsPDF from 'jspdf';
import 'jspdf-autotable';

export async function generateShowBillPdf(showBill, allClassItems, associationsData) {
  if (!showBill) throw new Error('No show bill data available');

  const doc = new jsPDF('p', 'pt', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const footerHeight = 30;
  let y = margin;

  // --- Helpers ---
  const checkPageBreak = (needed) => {
    if (y + needed > pageHeight - margin - footerHeight) {
      doc.addPage();
      y = margin;
    }
  };

  const drawHorizontalRule = (weight = 0.5) => {
    doc.setLineWidth(weight);
    doc.setDrawColor(0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;
  };

  const getAssocString = (classIds) => {
    const uniqueAssocs = new Set();
    (classIds || []).forEach(cid => {
      const cls = allClassItems.find(c => c.id === cid);
      if (cls) {
        const assoc = associationsData?.find(a => a.id === cls.assocId);
        uniqueAssocs.add(assoc?.abbreviation || cls.assocId);
      }
    });
    return Array.from(uniqueAssocs).join(' & ');
  };

  // ============================================================
  // SHOW HEADER — centered, professional
  // ============================================================
  const header = showBill.header || {};

  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text(header.showName || 'Show Bill', pageWidth / 2, y, { align: 'center' });
  y += 22;

  if (header.venue) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(header.venue, pageWidth / 2, y, { align: 'center' });
    y += 14;
  }

  if (header.dates) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(header.dates, pageWidth / 2, y, { align: 'center' });
    y += 14;
  }

  if (header.judges?.length > 0) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(header.judges.join(', '), pageWidth / 2, y, { align: 'center', maxWidth: contentWidth - 40 });
    y += 14;
  }

  if (header.customText) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.text(header.customText, pageWidth / 2, y, { align: 'center', maxWidth: contentWidth - 40 });
    y += 14;
  }

  y += 4;
  drawHorizontalRule(1.5);
  y += 8;

  // ============================================================
  // DAYS & ARENAS
  // ============================================================
  for (const day of showBill.days || []) {
    // --- Day Header: boxed, centered, bold ---
    checkPageBreak(50);
    y += 6;

    // Draw boxed day header
    const dayHeaderHeight = 24;
    doc.setFillColor(240, 240, 240);
    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.rect(margin + 60, y, contentWidth - 120, dayHeaderHeight, 'FD');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(day.label || day.date, pageWidth / 2, y + 16, { align: 'center' });
    y += dayHeaderHeight + 12;

    for (const arena of day.arenas || []) {
      checkPageBreak(40);

      // --- Arena Header: "ArenaName – X Judges" style ---
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      const judgeInfo = header.judges?.length > 0 ? ` \u2013 ${header.judges.length} Judges` : '';
      doc.text(`${arena.name}${judgeInfo}`, pageWidth / 2, y, { align: 'center' });
      y += 4;
      drawHorizontalRule(0.75);
      y += 8;

      for (const item of arena.items || []) {
        // --- Section Header ---
        if (item.type === 'sectionHeader') {
          checkPageBreak(28);
          y += 6;
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text(item.title, pageWidth / 2, y, { align: 'center' });
          y += 4;
          doc.setLineWidth(0.3);
          doc.line(margin + 80, y, pageWidth - margin - 80, y);
          y += 10;
          continue;
        }

        // --- Break ---
        if (item.type === 'break') {
          checkPageBreak(20);
          y += 4;
          doc.setFontSize(10);
          doc.setFont(undefined, 'bolditalic');
          const breakText = item.duration ? `${item.title} \u2013 ${item.duration}` : item.title;
          doc.text(breakText, pageWidth / 2, y, { align: 'center' });
          y += 14;
          continue;
        }

        // --- Arena Drag ---
        if (item.type === 'drag') {
          checkPageBreak(20);
          y += 4;
          doc.setFontSize(10);
          doc.setFont(undefined, 'bolditalic');
          doc.text(item.title, pageWidth / 2, y, { align: 'center' });
          y += 14;
          continue;
        }

        // --- Custom Event ---
        if (item.type === 'custom') {
          checkPageBreak(20);
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          const customText = item.content ? `${item.title}: ${item.content}` : item.title;
          doc.text(customText, margin + 10, y, { maxWidth: contentWidth - 20 });
          y += 14;
          continue;
        }

        // --- Class Box: "number.  ClassName & ASSOC" ---
        if (item.type === 'classBox') {
          const classDetails = (item.classes || []).map(cid => allClassItems.find(c => c.id === cid)).filter(Boolean);
          const assocStr = getAssocString(item.classes);

          if (classDetails.length <= 1) {
            // Single class — one line like "1.  Amateur Western Pleasure & APHA"
            checkPageBreak(16);
            doc.setFontSize(10);

            // Number
            const numStr = item.number ? `${item.number}.` : '';
            doc.setFont(undefined, 'bold');
            doc.text(numStr, margin, y);

            // Class name + association
            const titleText = item.title || classDetails[0]?.name || 'Untitled';
            const fullLine = assocStr ? `${titleText} & ${assocStr}` : titleText;
            doc.setFont(undefined, 'normal');
            doc.text(fullLine, margin + 32, y, { maxWidth: contentWidth - 40 });
            y += 14;
          } else {
            // Multiple classes in one box — list each
            checkPageBreak(16 + classDetails.length * 13);
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');

            // Box number and title
            const numStr = item.number ? `${item.number}.` : '';
            doc.text(numStr, margin, y);
            doc.text(item.title || 'Grouped Classes', margin + 32, y);
            y += 14;

            // Individual classes
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            classDetails.forEach(cls => {
              checkPageBreak(13);
              const assoc = associationsData?.find(a => a.id === cls.assocId);
              const assocTag = assoc ? ` & ${assoc.abbreviation}` : '';
              doc.text(`     ${cls.name}${assocTag}`, margin + 36, y);
              y += 13;
            });
          }
        }
      }

      y += 10;
    }

    y += 6;
  }

  // ============================================================
  // PAGE FOOTERS
  // ============================================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 16,
      { align: 'center' }
    );
    doc.text(
      header.showName || 'Show Bill',
      margin,
      pageHeight - 16
    );
    doc.setTextColor(0);
  }

  doc.save(`${(header.showName || 'Show-Bill').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.pdf`);
}
