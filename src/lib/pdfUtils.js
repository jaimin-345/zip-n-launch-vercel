import { pdfjs } from 'react-pdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const extractPatternSteps = async (pdfFile) => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
    }

    const startIndex = fullText.indexOf('1.');
    const endIndex = fullText.toLowerCase().indexOf('pattern complete');

    if (startIndex === -1) {
        throw new Error('Could not find pattern start marker ("1.") in the PDF.');
    }
    
    const effectiveEndIndex = endIndex === -1 ? fullText.length : endIndex;

    const patternText = fullText.substring(startIndex, effectiveEndIndex).trim();
    
    const steps = patternText
      .split(/\s+(?=\d+\.)/g)
      .map(step => step.trim())
      .filter(Boolean);

    const stepMap = {};
    steps.forEach(step => {
        const match = step.match(/^(\d+)\.\s*(.*)/);
        if (match) {
            const stepNumber = parseInt(match[1], 10);
            let description = match[2].trim();
            stepMap[stepNumber] = description;
        }
    });

    return stepMap;
};

export const generateScoreSheetPdf = async (templatePath, steps, patternInfo) => {
    const templateBytes = await fetch(templatePath).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText(patternInfo.className || '', {
        x: width / 2,
        y: height - 60,
        font: helveticaBoldFont,
        size: 24,
        color: rgb(0, 0, 0),
        maxWidth: width - 100,
        lineHeight: 28,
        xAlign: 'center',
    });

    page.drawText(patternInfo.patternName || '', {
        x: width / 2,
        y: height - 85,
        font: helveticaFont,
        size: 18,
        color: rgb(0, 0, 0),
        maxWidth: width - 100,
        lineHeight: 22,
        xAlign: 'center',
    });

    const boxWidth = 160;
    const boxHeight = 60;
    const startX = 65;
    const startY = height - 180;
    const gapX = 20;
    const gapY = 25;
    const cols = 3;

    for (const stepNumberStr in steps) {
        const stepNumber = parseInt(stepNumberStr, 10);
        const text = steps[stepNumber];
        if (stepNumber > 15) continue;

        const col = (stepNumber - 1) % cols;
        const row = Math.floor((stepNumber - 1) / cols);

        const x = startX + col * (boxWidth + gapX);
        const y = startY - row * (boxHeight + gapY);

        let fontSize = 10;
        let textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
        while (textWidth > boxWidth - 10 && fontSize > 6) {
            fontSize -= 0.5;
            textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
        }
        
        const textLines = [];
        let currentLine = '';
        const words = text.split(' ');
        for(const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (helveticaFont.widthOfTextAtSize(testLine, fontSize) < boxWidth - 10) {
                currentLine = testLine;
            } else {
                textLines.push(currentLine);
                currentLine = word;
            }
        }
        textLines.push(currentLine);

        page.drawText(textLines.join('\n'), {
            x: x + boxWidth / 2,
            y: y - 5,
            font: helveticaFont,
            size: fontSize,
            color: rgb(0, 0, 0),
            lineHeight: fontSize + 2,
            xAlign: 'center',
            yAlign: 'top',
        });
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
};