import { supabase } from '@/lib/supabaseClient';

/**
 * Cache for field positions by scoresheet template (keyed by image URL hash)
 * Using version suffix to invalidate cache when AI prompt changes
 */
const CACHE_VERSION = 'v10';
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
 * Helpers
 */
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const refineFieldBox = (ctx, img, rawField, scaleX, scaleY) => {
  // AI returns x,y as TOP-LEFT of the input box, width/height as box dimensions
  const rawX = (rawField?.x ?? 0) * scaleX;
  const rawY = (rawField?.y ?? 0) * scaleY;
  const rawH = Math.max(14, ((rawField?.height || 20) * scaleY));
  const rawW = Math.max(40, ((rawField?.width || 150) * scaleX));

  // Simply use the AI coordinates directly - they should be correct after proper prompting
  // Just clamp to ensure we stay within image bounds
  const x = clamp(rawX, 0, img.width - rawW - 1);
  const yTop = clamp(rawY, 0, img.height - rawH - 1);
  const w = Math.min(rawW, img.width - x);
  const h = rawH;

  return {
    x: x,
    yCenter: yTop + h / 2,
    width: w,
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
    console.log('=== APPLYING TEXT OVERLAY ===');
    console.log('Image URL:', imageUrl);
    console.log('Overlay Data:', overlayData);
    console.log('Show Name:', overlayData?.showName);
    console.log('Class Name:', overlayData?.className);
    console.log('Date:', overlayData?.date);
    console.log('Judge Name:', overlayData?.judgeName);

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
      // Calculate scale factors.
      // If the detector returns normalized (0..1) coordinates, we scale by the image dimensions.
      const isNormalized = fieldPositions.units === 'normalized' ||
        ((fieldPositions.imageWidth ?? 0) > 0 && (fieldPositions.imageWidth ?? 0) <= 2 &&
         (fieldPositions.imageHeight ?? 0) > 0 && (fieldPositions.imageHeight ?? 0) <= 2);

      const scaleX = isNormalized
        ? img.width
        : (fieldPositions.imageWidth ? img.width / fieldPositions.imageWidth : 1);
      const scaleY = isNormalized
        ? img.height
        : (fieldPositions.imageHeight ? img.height / fieldPositions.imageHeight : 1);

      const fields = fieldPositions.fields;

      const drawField = (rawField, text, key) => {
        if (!rawField?.found) {
          console.warn(`Field ${key} not found by AI`);
          return;
        }
        
        if (!text) {
          console.warn(`No text data for field ${key}`);
          return;
        }

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

        console.log(`=== Drawing Field: ${key} ===`);
        console.log(`Text: "${text}"`);
        console.log(`Raw field from AI:`, rawField);
        console.log(`Refined box:`, { x, y, width: w, height: h, yCenter: y });
        console.log(`Image dimensions:`, { width: img.width, height: img.height });
        console.log(`Scale factors:`, { scaleX, scaleY });
        console.log(`Field position:`, { 
          top: refined.yCenter - refined.height / 2,
          bottom: refined.yCenter + refined.height / 2,
          left: x,
          right: x + w
        });
        
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
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to draw
 * @param {number} x - X position (left edge of input box)
 * @param {number} y - Y position (VERTICAL CENTER of input box)
 * @param {number} fieldWidth - Width of the input box
 * @param {number} fieldHeight - Height of the input box
 */
const drawFittedText = (ctx, text, x, y, fieldWidth, fieldHeight = 20) => {
  if (!text) {
    console.warn('drawFittedText: No text provided');
    return;
  }

  // Minimal padding - text should start close to the left edge of the field
  const horizontalPadding = clamp(Math.round(fieldHeight * 0.05), 2, 8);
  const verticalPadding = 1;
  const availableWidth = Math.max(0, fieldWidth - horizontalPadding * 2);
  const availableHeight = Math.max(0, fieldHeight - verticalPadding * 2);

  // Start with font size based on field height - make it larger for visibility
  let fontSize = Math.min(Math.floor(availableHeight * 0.75), 24);
  const minFontSize = 12; // Increased minimum for better visibility

  // Use black color with full opacity for maximum visibility
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left'; // Left align text

  // Find the right font size to fit the text within field width
  let finalFontSize = fontSize;
  while (finalFontSize >= minFontSize) {
    ctx.font = `bold ${finalFontSize}px Arial, sans-serif`; // Use bold for better visibility
    const metrics = ctx.measureText(text);

    if (metrics.width <= availableWidth) {
      break;
    }
    finalFontSize -= 0.5;
  }

  // Calculate text position
  const fieldTop = y - fieldHeight / 2;
  const fieldCenterY = y;
  const fieldBottom = y + fieldHeight / 2;
  
  // Calculate text metrics with final font size
  ctx.font = `bold ${finalFontSize}px Arial, sans-serif`;
  const textMetrics = ctx.measureText(text);
  
  // Position text - minimal left padding
  const textX = x + horizontalPadding;
  
  // Calculate proper Y position to align text with underline
  // The underline is typically at the bottom 1/3 of the field
  // We'll use alphabetic baseline and position it so the text sits on the underline
  const underlineY = fieldTop + (fieldHeight * 0.75); // Underline at 75% from top
  
  // Use alphabetic baseline - this aligns the bottom of letters with the baseline
  // Position the baseline at the underline position
  ctx.textBaseline = 'alphabetic';
  const textY = underlineY;
  
  // Alternative: Try middle baseline with adjustment if alphabetic doesn't work well
  // Calculate if we should use middle baseline instead
  const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
  const middleBaselineY = fieldCenterY;
  
  console.log(`--- Text Drawing Details ---`);
  console.log(`Text: "${text}"`);
  console.log(`Field dimensions: ${fieldWidth} x ${fieldHeight}`);
  console.log(`Available space: ${availableWidth} x ${availableHeight}`);
  console.log(`Horizontal padding: ${horizontalPadding}`);
  console.log(`Font size: ${finalFontSize}px`);
  console.log(`Text width: ${textMetrics.width}px`);
  console.log(`Text height: ${textHeight}px`);
  console.log(`Text metrics:`, {
    width: textMetrics.width,
    actualBoundingBoxAscent: textMetrics.actualBoundingBoxAscent,
    actualBoundingBoxDescent: textMetrics.actualBoundingBoxDescent,
    actualBoundingBoxLeft: textMetrics.actualBoundingBoxLeft,
    actualBoundingBoxRight: textMetrics.actualBoundingBoxRight
  });
  console.log(`Field bounds:`, {
    left: x,
    right: x + fieldWidth,
    top: fieldTop,
    bottom: fieldBottom,
    centerY: fieldCenterY,
    underlineY: underlineY
  });
  console.log(`Text position (alphabetic baseline): (${textX}, ${textY})`);
  console.log(`Text baseline: alphabetic (aligns with underline)`);
  console.log(`Text align: left`);
  console.log(`Font weight: bold`);
  console.log(`Text color: #000000 (black)`);

  // Draw the text using alphabetic baseline to align with underline
  ctx.fillText(text, textX, textY);
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
  
  // Get judge name - PRIORITY: scoresheet-specific judges first, then fallback to project-level
  let judgeName = '';
  
  // FIRST: Check scoresheet-specific judges (already resolved per group)
  if (scoresheet?.judgeNames) {
    // judgeNames is a comma-separated string of judge names
    judgeName = scoresheet.judgeNames;
  } else if (scoresheet?.judges?.length > 0) {
    // judges is an array of judge names
    judgeName = scoresheet.judges.join(', ');
  }
  
  // FALLBACK: Check groupJudges for this specific discipline/group
  if (!judgeName && projectData.groupJudges && scoresheet?.disciplineIndex !== undefined) {
    const disciplineIndex = scoresheet.disciplineIndex;
    const groupIndex = scoresheet.groupIndex ?? 0;
    const groupJudges = projectData.groupJudges?.[disciplineIndex] || projectData.groupJudges?.[`${disciplineIndex}`] || {};
    const judgesForGroup = groupJudges[groupIndex] || groupJudges[`${groupIndex}`];
    if (Array.isArray(judgesForGroup) && judgesForGroup.length > 0) {
      judgeName = judgesForGroup.join(', ');
    } else if (judgesForGroup) {
      judgeName = String(judgesForGroup);
    }
  }
  
  // FALLBACK: Check associationJudges (has nested structure with judges array)
  if (!judgeName && projectData.associationJudges && Object.keys(projectData.associationJudges).length > 0) {
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
  
  // FALLBACK: Check first available groupJudges (any discipline)
  if (!judgeName && projectData.groupJudges && Object.keys(projectData.groupJudges).length > 0) {
    const firstGroupJudge = Object.values(projectData.groupJudges)[0];
    if (typeof firstGroupJudge === 'object' && firstGroupJudge !== null) {
      const firstJudgeValue = Object.values(firstGroupJudge)[0];
      if (Array.isArray(firstJudgeValue) && firstJudgeValue.length > 0) {
        judgeName = firstJudgeValue.join(', ');
      } else if (firstJudgeValue?.name || firstJudgeValue?.full_name) {
        judgeName = firstJudgeValue.name || firstJudgeValue.full_name || '';
      }
    }
  }
  
  // FALLBACK: Check officials array
  if (!judgeName && projectData.officials?.length > 0) {
    const judge = projectData.officials.find(o => o.role === 'judge' || o.type === 'judge');
    judgeName = judge?.name || judge?.full_name || projectData.officials[0]?.name || '';
  }
  
  // FALLBACK: Check staff array
  if (!judgeName && projectData.staff?.length > 0) {
    const judge = projectData.staff.find(s => s.role === 'judge' || s.type === 'judge');
    judgeName = judge?.name || judge?.full_name || '';
  }
  
  // FALLBACK: Check officialsAndStaff.judges
  if (!judgeName && projectData.officialsAndStaff?.judges?.length > 0) {
    judgeName = projectData.officialsAndStaff.judges[0].name || projectData.officialsAndStaff.judges[0].full_name || '';
  }
  
  console.log('=== OVERLAY DATA EXTRACTION ===');
  console.log('Project:', project?.project_name || 'N/A');
  console.log('Project Data:', projectData);
  console.log('Scoresheet:', scoresheet);
  console.log('Extracted Data:', { 
    showName, 
    className, 
    date, 
    judgeName 
  });
  console.log('Show Name Source:', {
    project_name: project?.project_name,
    showName: projectData.showName,
    final: showName
  });
  console.log('Class Name Source:', {
    groupName: scoresheet?.groupName,
    disciplineName: scoresheet?.disciplineName,
    final: className
  });
  console.log('Date Source:', {
    startDate: projectData.startDate,
    endDate: projectData.endDate,
    showDates: projectData.showDates,
    final: date
  });
  console.log('Judge Name Source:', {
    associationJudges: projectData.associationJudges,
    groupJudges: projectData.groupJudges,
    officials: projectData.officials,
    final: judgeName
  });

  return {
    showName,
    className,
    date,
    judgeName
  };
};
