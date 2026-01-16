import { supabase } from '@/lib/supabaseClient';

/**
 * Cache for field positions by scoresheet template (keyed by image URL hash)
 * Using version suffix to invalidate cache when AI prompt changes
 */
const CACHE_VERSION = 'v5';
const fieldPositionCache = new Map();

/**
 * Generate a simple hash for caching
 */
const hashUrl = (url) => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${hash.toString()}_${CACHE_VERSION}`;
};

/**
 * Clear the field position cache (useful for debugging)
 */
export const clearFieldPositionCache = () => {
  fieldPositionCache.clear();
  console.log('Field position cache cleared');
};

/**
 * Detect field positions on a scoresheet image using AI
 * @param {string} imageUrl - URL of the scoresheet image
 * @returns {Promise<Object>} - Field positions
 */
export const detectFieldPositions = async (imageUrl) => {
  const cacheKey = hashUrl(imageUrl);
  
  // Check cache first
  if (fieldPositionCache.has(cacheKey)) {
    console.log('Using cached field positions');
    return fieldPositionCache.get(cacheKey);
  }

  try {
    console.log('Calling AI to detect field positions...');
    
    const { data, error } = await supabase.functions.invoke('detect-scoresheet-fields', {
      body: { imageUrl }
    });

    if (error) {
      console.error('Error detecting fields:', error);
      throw error;
    }

    if (data && data.fields) {
      // Cache the result
      fieldPositionCache.set(cacheKey, data);
      console.log('Field positions detected:', data);
      return data;
    }

    return null;
  } catch (error) {
    console.error('Failed to detect field positions:', error);
    return null;
  }
};

/**
 * Load an image from URL and return as HTMLImageElement
 * @param {string} url - Image URL
 * @returns {Promise<HTMLImageElement>}
 */
const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Small helpers to refine AI boxes into the actual blank input area.
 * We scan the row pixels to find where the label text stops and the empty box starts.
 */
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const findInputStartX = (ctx, imgWidth, yTop, fieldHeight, rightBoundary) => {
  const safeRight = clamp(Math.floor(rightBoundary), 1, imgWidth);
  const bandY = Math.floor(yTop + fieldHeight * 0.25);
  const bandH = Math.max(1, Math.floor(fieldHeight * 0.5));

  if (bandY < 0 || bandY + bandH > ctx.canvas.height) return null;

  let imageData;
  try {
    imageData = ctx.getImageData(0, bandY, safeRight, bandH);
  } catch {
    return null;
  }

  const data = imageData.data;
  const w = safeRight;
  const h = bandH;

  // Heuristics tuned for black text on white paper with horizontal rules.
  const sampleStepY = 2;
  const samplesPerCol = Math.ceil(h / sampleStepY);
  const darkLumThreshold = 200;
  const darkRatioThreshold = 0.12;
  const consecutiveWhiteCols = 16;

  let run = 0;
  for (let x = 0; x < w; x++) {
    let darkCount = 0;

    for (let yy = 0; yy < h; yy += sampleStepY) {
      const idx = (yy * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum < darkLumThreshold) darkCount++;
    }

    const darkRatio = darkCount / samplesPerCol;
    if (darkRatio <= darkRatioThreshold) run += 1;
    else run = 0;

    if (run >= consecutiveWhiteCols) {
      return x - consecutiveWhiteCols + 1;
    }
  }

  return null;
};

const refineFieldBox = (ctx, img, rawField, scaleX, scaleY) => {
  const rawX = (rawField?.x ?? 0) * scaleX;
  const rawY = (rawField?.y ?? 0) * scaleY;

  // Defaults keep behavior reasonable even if AI returns 0s
  const h = Math.max(14, ((rawField?.height || 20) * scaleY));
  const w = Math.max(40, ((rawField?.width || 150) * scaleX));

  const right = clamp(rawX + w, 0, img.width - 2);

  // Some detector prompts used y as TOP; some older cached results may be CENTER.
  // Try both and pick the one where we can find a clear blank input area.
  const yTopCandidates = [rawY, rawY - h / 2];

  let best = {
    x: clamp(rawX, 0, right - 1),
    yTop: clamp(rawY, 0, img.height - h - 1),
  };

  for (const yTopCandidate of yTopCandidates) {
    const yTop = clamp(yTopCandidate, 0, img.height - h - 1);
    const scannedX = findInputStartX(ctx, img.width, yTop, h, right);

    // Valid scan must leave space to write text
    if (scannedX != null && scannedX < right - 30) {
      // Prefer the *later* start (further right) because it usually means "after the label"
      if (scannedX > best.x + 4) {
        best = { x: scannedX, yTop };
      }
    }
  }

  return {
    x: best.x,
    yCenter: best.yTop + h / 2,
    width: Math.max(20, right - best.x),
    height: h,
  };
};

/**
 * Apply text overlays to a scoresheet image at detected field positions
 * @param {string} imageUrl - URL of the scoresheet image
 * @param {Object} overlayData - Data to overlay
 * @param {string} overlayData.showName - Show/Project name
 * @param {string} overlayData.className - Class name
 * @param {string} overlayData.date - Date string
 * @param {string} overlayData.judgeName - Judge name
 * @returns {Promise<Blob>} - Modified image as blob
 */
export const applyTextOverlay = async (imageUrl, overlayData) => {
  try {
    console.log('Applying text overlay with data:', overlayData);

    // Load the image
    const img = await loadImage(imageUrl);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');

    // Draw the original image
    ctx.drawImage(img, 0, 0);

    // Detect field positions using AI
    const fieldPositions = await detectFieldPositions(imageUrl);

    if (fieldPositions?.fields) {
      // Calculate scale factor if image was resized by AI analysis
      const scaleX = fieldPositions.imageWidth ? img.width / fieldPositions.imageWidth : 1;
      const scaleY = fieldPositions.imageHeight ? img.height / fieldPositions.imageHeight : 1;

      const fields = fieldPositions.fields;

      const drawField = (rawField, text, key) => {
        if (!rawField?.found || !text) return;

        const refined = refineFieldBox(ctx, img, rawField, scaleX, scaleY);

        if (refined.width < 40 || refined.height < 12) {
          console.warn(`Skipping ${key}: refined box too small`, refined);
          return;
        }

        // Optional: small safety padding so text doesn't touch the border
        const x = refined.x;
        const y = refined.yCenter;
        const w = refined.width;
        const h = refined.height;

        console.log(`Overlay ${key}:`, { rawField, refined, scaleX, scaleY, img: { w: img.width, h: img.height } });
        drawFittedText(ctx, text, x, y, w, h);
      };

      drawField(fields.show, overlayData.showName, 'show');
      drawField(fields.class, overlayData.className, 'class');
      drawField(fields.date, overlayData.date, 'date');
      drawField(fields.judge, overlayData.judgeName, 'judge');
    } else {
      console.warn('No field positions detected, skipping text overlay');
    }

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png', 1.0);
    });
  } catch (error) {
    console.error('Error applying text overlay:', error);
    // If overlay fails, return the original image
    const response = await fetch(imageUrl);
    return await response.blob();
  }
};

/**
 * Draw text fitted to field dimensions - scales font size to fit width and height
 *
 * IMPORTANT: The AI detector returns `y` as the vertical CENTER of the input area.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to draw
 * @param {number} x - X position (left edge of input box)
 * @param {number} y - Y position (VERTICAL CENTER of input box)
 * @param {number} fieldWidth - Width of the input box
 * @param {number} fieldHeight - Height of the input box
 */
const drawFittedText = (ctx, text, x, y, fieldWidth, fieldHeight = 20) => {
  if (!text) return;

  const horizontalPadding = 4;
  const availableWidth = Math.max(0, fieldWidth - horizontalPadding * 2);
  const availableHeight = Math.max(0, fieldHeight - 2);

  // Start with font size based on field height, clamp to sensible range
  let fontSize = Math.min(Math.floor(availableHeight * 0.9), 18);
  const minFontSize = 8;

  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';

  // Find the right font size to fit the text within field width
  while (fontSize >= minFontSize) {
    ctx.font = `${fontSize}px Arial, sans-serif`;
    const metrics = ctx.measureText(text);

    if (metrics.width <= availableWidth) break;
    fontSize -= 1;
  }

  ctx.fillText(text, x + horizontalPadding, y);
  console.log(
    `Drew "${text}" at (${x + horizontalPadding}, ${y}) with font ${fontSize}px, field: ${fieldWidth}x${fieldHeight}`
  );
};

/**
 * Get overlay data from project and scoresheet context
 * @param {Object} project - Project data
 * @param {Object} scoresheet - Scoresheet info
 * @returns {Object} - Overlay data
 */
export const getOverlayDataFromContext = (project, scoresheet) => {
  const projectData = project?.project_data || {};
  
  // Get show name
  const showName = project?.project_name || projectData.showName || '';
  
  // Get class/group name
  const className = scoresheet?.groupName || scoresheet?.disciplineName || '';
  
  // Get date - check multiple possible locations
  let date = '';
  if (projectData.startDate && projectData.endDate) {
    date = `${projectData.startDate} - ${projectData.endDate}`;
  } else if (projectData.startDate) {
    date = projectData.startDate;
  } else if (projectData.showDates?.startDate) {
    date = projectData.showDates.startDate;
    if (projectData.showDates.endDate) {
      date = `${date} - ${projectData.showDates.endDate}`;
    }
  }
  // Check divisionDates from disciplines if no main date found
  if (!date && projectData.disciplines?.length > 0) {
    for (const discipline of projectData.disciplines) {
      if (discipline.divisionDates && Object.keys(discipline.divisionDates).length > 0) {
        const firstDate = Object.values(discipline.divisionDates)[0];
        if (firstDate) {
          date = firstDate;
          break;
        }
      }
    }
  }
  
  // Get judge name - check multiple possible locations
  let judgeName = '';
  
  // Check associationJudges first (has nested structure with judges array)
  if (projectData.associationJudges && Object.keys(projectData.associationJudges).length > 0) {
    for (const assocKey of Object.keys(projectData.associationJudges)) {
      const assocData = projectData.associationJudges[assocKey];
      // Check if it has judges array
      if (assocData?.judges?.length > 0) {
        judgeName = assocData.judges[0].name || assocData.judges[0].full_name || '';
        break;
      }
      // Direct name property
      if (assocData?.name) {
        judgeName = assocData.name;
        break;
      }
    }
  }
  
  // Check groupJudges
  if (!judgeName && projectData.groupJudges && Object.keys(projectData.groupJudges).length > 0) {
    const firstGroupJudge = Object.values(projectData.groupJudges)[0];
    judgeName = firstGroupJudge?.name || firstGroupJudge?.full_name || '';
  }
  
  // Check officials array
  if (!judgeName && projectData.officials?.length > 0) {
    const judge = projectData.officials.find(o => o.role === 'judge' || o.type === 'judge');
    judgeName = judge?.name || judge?.full_name || projectData.officials[0]?.name || '';
  }
  
  // Check staff array
  if (!judgeName && projectData.staff?.length > 0) {
    const judge = projectData.staff.find(s => s.role === 'judge' || s.type === 'judge');
    judgeName = judge?.name || judge?.full_name || '';
  }
  
  // Check officialsAndStaff.judges
  if (!judgeName && projectData.officialsAndStaff?.judges?.length > 0) {
    judgeName = projectData.officialsAndStaff.judges[0].name || projectData.officialsAndStaff.judges[0].full_name || '';
  }
  
  console.log('Overlay data extracted:', { showName, className, date, judgeName });
  
  return {
    showName,
    className,
    date,
    judgeName
  };
};
