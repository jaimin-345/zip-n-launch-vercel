import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { renumberShowBill } from './showBillUtils';

const DEFAULT_LAYOUT = {
  showNumbers: true,
  numberingMode: 'global',
  showAssociations: true,
  showDayHeaders: true,
  showArenaHeaders: true,
  daySeparatorStyle: 'boxed',
  arenaSeparatorStyle: 'line',
  lineSpacing: 'normal',
  fontSize: 'medium',
  showHeader: true,
  showVenue: true,
  showJudges: true,
  showFooter: true,
  customFooterText: '',
};

// Font size maps: [body, subhead, heading]
const FONT_SIZES = {
  small:  { body: 8, sub: 9, head: 18, day: 11, arena: 10 },
  medium: { body: 10, sub: 11, head: 22, day: 14, arena: 12 },
  large:  { body: 12, sub: 13, head: 26, day: 16, arena: 14 },
};

// Line spacing (y-increment per body line)
const LINE_HEIGHTS = { compact: 11, normal: 14, relaxed: 18 };

export async function generateShowBillPdf(showBill, allClassItems, associationsData, layoutSettings) {
  if (!showBill) throw new Error('No show bill data available');

  const ls = { ...DEFAULT_LAYOUT, ...layoutSettings };
  const fonts = FONT_SIZES[ls.fontSize] || FONT_SIZES.medium;
  const lineH = LINE_HEIGHTS[ls.lineSpacing] || LINE_HEIGHTS.normal;

  // Renumber with the layout's numbering mode
  const sb = JSON.parse(JSON.stringify(showBill));
  sb.settings = { ...sb.settings, numberingMode: ls.numberingMode };
  const numberedBill = renumberShowBill(sb);

  const doc = new jsPDF('p', 'pt', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const footerHeight = ls.showFooter ? 30 : 10;
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
    if (!ls.showAssociations) return '';
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
  // SHOW HEADER
  // ============================================================
  const header = numberedBill.header || {};

  if (ls.showHeader) {
    doc.setFontSize(fonts.head);
    doc.setFont(undefined, 'bold');
    doc.text(header.showName || 'Show Bill', pageWidth / 2, y, { align: 'center' });
    y += fonts.head;

    if (ls.showVenue && header.venue) {
      doc.setFontSize(fonts.sub);
      doc.setFont(undefined, 'normal');
      doc.text(header.venue, pageWidth / 2, y, { align: 'center' });
      y += lineH;
    }

    if (header.dates) {
      doc.setFontSize(fonts.sub);
      doc.setFont(undefined, 'normal');
      doc.text(header.dates, pageWidth / 2, y, { align: 'center' });
      y += lineH;
    }

    if (ls.showJudges && header.judges?.length > 0) {
      doc.setFontSize(fonts.body);
      doc.setFont(undefined, 'normal');
      doc.text(header.judges.join(', '), pageWidth / 2, y, { align: 'center', maxWidth: contentWidth - 40 });
      y += lineH;
    }

    if (header.customText) {
      doc.setFontSize(fonts.body - 1);
      doc.setFont(undefined, 'italic');
      doc.text(header.customText, pageWidth / 2, y, { align: 'center', maxWidth: contentWidth - 40 });
      y += lineH;
    }

    y += 4;
    drawHorizontalRule(1.5);
    y += 8;
  }

  // ============================================================
  // DAYS & ARENAS
  // ============================================================
  for (const day of numberedBill.days || []) {
    // --- Day Header ---
    if (ls.showDayHeaders) {
      checkPageBreak(50);
      y += 6;

      if (ls.daySeparatorStyle === 'boxed') {
        const dayHeaderHeight = Math.round(fonts.day * 1.7);
        doc.setFillColor(240, 240, 240);
        doc.setDrawColor(0);
        doc.setLineWidth(1);
        doc.rect(margin + 60, y, contentWidth - 120, dayHeaderHeight, 'FD');
        doc.setFontSize(fonts.day);
        doc.setFont(undefined, 'bold');
        doc.text(day.label || day.date, pageWidth / 2, y + dayHeaderHeight * 0.65, { align: 'center' });
        y += dayHeaderHeight + 12;
      } else if (ls.daySeparatorStyle === 'line') {
        drawHorizontalRule(0.75);
        y += 4;
        doc.setFontSize(fonts.day);
        doc.setFont(undefined, 'bold');
        doc.text(day.label || day.date, pageWidth / 2, y, { align: 'center' });
        y += fonts.day + 2;
        drawHorizontalRule(0.75);
        y += 8;
      } else {
        // 'none' — just text
        doc.setFontSize(fonts.day);
        doc.setFont(undefined, 'bold');
        doc.text(day.label || day.date, pageWidth / 2, y, { align: 'center' });
        y += fonts.day + 8;
      }
    }

    for (const arena of day.arenas || []) {
      // Skip closed arenas
      if ((numberedBill.closedArenas || {})[`${day.id}::${arena.id}`]) continue;

      // --- Arena Header ---
      if (ls.showArenaHeaders) {
        checkPageBreak(40);

        if (ls.arenaSeparatorStyle === 'bold-line') {
          drawHorizontalRule(1.5);
          y += 4;
        } else if (ls.arenaSeparatorStyle === 'line') {
          drawHorizontalRule(0.75);
          y += 4;
        }

        doc.setFontSize(fonts.arena);
        doc.setFont(undefined, 'bold');
        const judgeInfo = header.judges?.length > 0 ? ` \u2013 ${header.judges.length} Judges` : '';
        doc.text(`${arena.name}${judgeInfo}`, pageWidth / 2, y, { align: 'center' });
        y += 4;

        if (ls.arenaSeparatorStyle !== 'none') {
          drawHorizontalRule(ls.arenaSeparatorStyle === 'bold-line' ? 1.5 : 0.75);
        }
        y += 8;
      }

      for (const item of arena.items || []) {
        // --- Section Header ---
        if (item.type === 'sectionHeader') {
          checkPageBreak(28);
          y += 6;
          doc.setFontSize(fonts.sub);
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
          doc.setFontSize(fonts.body);
          doc.setFont(undefined, 'bolditalic');
          const breakText = item.duration ? `${item.title} \u2013 ${item.duration}` : item.title;
          doc.text(breakText, pageWidth / 2, y, { align: 'center' });
          y += lineH;
          continue;
        }

        // --- Arena Drag ---
        if (item.type === 'drag') {
          checkPageBreak(20);
          y += 4;
          doc.setFontSize(fonts.body);
          doc.setFont(undefined, 'bolditalic');
          doc.text(item.title, pageWidth / 2, y, { align: 'center' });
          y += lineH;
          continue;
        }

        // --- Custom Event ---
        if (item.type === 'custom') {
          checkPageBreak(20);
          doc.setFontSize(fonts.body);
          doc.setFont(undefined, 'normal');
          const customText = item.content ? `${item.title}: ${item.content}` : item.title;
          doc.text(customText, margin + 10, y, { maxWidth: contentWidth - 20 });
          y += lineH;
          continue;
        }

        // --- Class Box ---
        if (item.type === 'classBox') {
          const classDetails = (item.classes || []).map(cid => allClassItems.find(c => c.id === cid)).filter(Boolean);
          const assocStr = getAssocString(item.classes);

          if (classDetails.length <= 1) {
            checkPageBreak(16);
            doc.setFontSize(fonts.body);

            const numStr = ls.showNumbers && item.number ? `${item.number}.` : '';
            if (numStr) {
              doc.setFont(undefined, 'bold');
              doc.text(numStr, margin, y);
            }

            const titleText = item.title || classDetails[0]?.name || 'Untitled';
            const fullLine = assocStr ? `${titleText} & ${assocStr}` : titleText;
            doc.setFont(undefined, 'normal');
            doc.text(fullLine, margin + 32, y, { maxWidth: contentWidth - 40 });
            y += lineH;
          } else {
            checkPageBreak(16 + classDetails.length * (lineH - 1));
            doc.setFontSize(fonts.body);
            doc.setFont(undefined, 'bold');

            const numStr = ls.showNumbers && item.number ? `${item.number}.` : '';
            if (numStr) doc.text(numStr, margin, y);
            doc.text(item.title || 'Grouped Classes', margin + 32, y);
            y += lineH;

            doc.setFont(undefined, 'normal');
            doc.setFontSize(fonts.body - 1);
            classDetails.forEach(cls => {
              checkPageBreak(lineH - 1);
              const assoc = associationsData?.find(a => a.id === cls.assocId);
              const assocTag = ls.showAssociations && assoc ? ` & ${assoc.abbreviation}` : '';
              doc.text(`     ${cls.name}${assocTag}`, margin + 36, y);
              y += lineH - 1;
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
  if (ls.showFooter) {
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
      if (ls.customFooterText) {
        doc.text(
          ls.customFooterText,
          pageWidth - margin,
          pageHeight - 16,
          { align: 'right' }
        );
      }
      doc.setTextColor(0);
    }
  }

  doc.save(`${(header.showName || 'Show-Bill').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.pdf`);
}
