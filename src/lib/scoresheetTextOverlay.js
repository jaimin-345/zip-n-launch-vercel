import { supabase } from '@/lib/supabaseClient';

/**
 * Cache for field positions by scoresheet template (keyed by image URL hash)
 */
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
  return hash.toString();
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
    
    // Draw the original image
    ctx.drawImage(img, 0, 0);
    
    // Detect field positions using AI
    const fieldPositions = await detectFieldPositions(imageUrl);
    
    if (fieldPositions && fieldPositions.fields) {
      // Calculate scale factor if image was resized by AI analysis
      const scaleX = fieldPositions.imageWidth ? img.width / fieldPositions.imageWidth : 1;
      const scaleY = fieldPositions.imageHeight ? img.height / fieldPositions.imageHeight : 1;
      
      const fields = fieldPositions.fields;
      
      // Draw SHOW value
      if (fields.show?.found && overlayData.showName) {
        const x = fields.show.x * scaleX;
        const y = fields.show.y * scaleY;
        const fieldWidth = (fields.show.width || 150) * scaleX;
        drawFittedText(ctx, overlayData.showName, x, y, fieldWidth);
        console.log(`Drew SHOW at (${x}, ${y}): ${overlayData.showName}`);
      }
      
      // Draw CLASS value
      if (fields.class?.found && overlayData.className) {
        const x = fields.class.x * scaleX;
        const y = fields.class.y * scaleY;
        const fieldWidth = (fields.class.width || 150) * scaleX;
        drawFittedText(ctx, overlayData.className, x, y, fieldWidth);
        console.log(`Drew CLASS at (${x}, ${y}): ${overlayData.className}`);
      }
      
      // Draw DATE value
      if (fields.date?.found && overlayData.date) {
        const x = fields.date.x * scaleX;
        const y = fields.date.y * scaleY;
        const fieldWidth = (fields.date.width || 150) * scaleX;
        drawFittedText(ctx, overlayData.date, x, y, fieldWidth);
        console.log(`Drew DATE at (${x}, ${y}): ${overlayData.date}`);
      }
      
      // Draw JUDGE value
      if (fields.judge?.found && overlayData.judgeName) {
        const x = fields.judge.x * scaleX;
        const y = fields.judge.y * scaleY;
        const fieldWidth = (fields.judge.width || 150) * scaleX;
        drawFittedText(ctx, overlayData.judgeName, x, y, fieldWidth);
        console.log(`Drew JUDGE at (${x}, ${y}): ${overlayData.judgeName}`);
      }
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
 * Draw text fitted to field width - scales font size to fit
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to draw
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} fieldWidth - Width of the field to fit text into
 */
const drawFittedText = (ctx, text, x, y, fieldWidth) => {
  // Start with a reasonable font size and reduce if needed
  let fontSize = 14;
  const minFontSize = 8;
  
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';
  
  // Find the right font size to fit the text
  while (fontSize >= minFontSize) {
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    const metrics = ctx.measureText(text);
    
    if (metrics.width <= fieldWidth) {
      break;
    }
    fontSize -= 1;
  }
  
  // Draw the text
  ctx.fillText(text, x, y);
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
