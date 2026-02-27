import { jsPDF } from 'jspdf';

/**
 * Draws a generic Trail-style scoresheet page onto an existing jsPDF document.
 * Includes show metadata and 15 empty numbered boxes (3x5 grid).
 * Does NOT insert maneuvers.
 *
 * @param {jsPDF} doc - The jsPDF document instance (page should already be set/added)
 * @param {object} info - Metadata to display on the scoresheet
 * @param {string} info.association - Association name
 * @param {string} info.showName - Show name
 * @param {string} info.discipline - Discipline/class name
 * @param {string} info.division - Division name(s)
 * @param {string} info.date - Competition date string
 * @param {string} info.judge - Judge name
 */
export function drawGenericScoreSheetPage(doc, info) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // -- Title --
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('SCORE SHEET', pageWidth / 2, y, { align: 'center' });
  y += 24;

  // -- Association --
  if (info.association) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(info.association.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 18;
  }

  // -- Show Name --
  if (info.showName) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(info.showName, pageWidth / 2, y, { align: 'center' });
    y += 16;
  }

  // -- Metadata rows --
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const leftX = margin;
  const rightX = pageWidth - margin;

  // Class / Discipline
  if (info.discipline) {
    doc.setFont('helvetica', 'bold');
    doc.text('Class:', leftX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(info.discipline, leftX + 40, y);
  }
  // Date
  if (info.date) {
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', rightX - 120, y);
    doc.setFont('helvetica', 'normal');
    doc.text(info.date, rightX - 85, y);
  }
  y += 16;

  // Division
  if (info.division) {
    doc.setFont('helvetica', 'bold');
    doc.text('Division:', leftX, y);
    doc.setFont('helvetica', 'normal');
    const divLines = doc.splitTextToSize(info.division, pageWidth - margin * 2 - 60);
    doc.text(divLines, leftX + 55, y);
    y += divLines.length * 14;
  } else {
    y += 14;
  }

  // Judge
  if (info.judge) {
    doc.setFont('helvetica', 'bold');
    doc.text('Judge:', leftX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(info.judge, leftX + 42, y);
  }
  y += 24;

  // -- Separator line --
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // -- Label --
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('Obstacle / Maneuver Scores', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 20;

  // -- 15-box grid (3 cols x 5 rows) --
  const cols = 3;
  const rows = 5;
  const gridWidth = pageWidth - margin * 2;
  const boxWidth = (gridWidth - (cols - 1) * 12) / cols;
  const boxHeight = 56;
  const gapX = 12;
  const gapY = 10;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const boxNum = i * cols + j + 1;
      const bx = margin + j * (boxWidth + gapX);
      const by = y + i * (boxHeight + gapY);

      // Box outline
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.75);
      doc.rect(bx, by, boxWidth, boxHeight);

      // Box number
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(String(boxNum), bx + 4, by + 12);

      // Score line at bottom of box
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      const lineY = by + boxHeight - 10;
      doc.line(bx + boxWidth * 0.55, lineY, bx + boxWidth - 6, lineY);

      doc.setTextColor(0, 0, 0);
    }
  }

  // Move y past the grid
  y += rows * (boxHeight + gapY) + 10;

  // -- Penalty / Total area --
  if (y + 50 < pageHeight - margin) {
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.75);

    // Penalty box
    const penaltyWidth = gridWidth / 2 - 6;
    doc.rect(margin, y, penaltyWidth, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Penalties:', margin + 6, y + 18);

    // Total box
    const totalX = margin + penaltyWidth + 12;
    doc.rect(totalX, y, penaltyWidth, 30);
    doc.text('Total Score:', totalX + 6, y + 18);
  }
}

/**
 * Creates a standalone generic scoresheet PDF blob.
 * Used by the ZIP downloader.
 */
export function createGenericScoreSheetPdf(info) {
  const doc = new jsPDF('p', 'pt', 'a4');
  drawGenericScoreSheetPage(doc, info);
  return doc.output('blob');
}
