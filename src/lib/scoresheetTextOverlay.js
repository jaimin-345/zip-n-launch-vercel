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
      
      // Set text style
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.textBaseline = 'middle';
      
      const fields = fieldPositions.fields;
      
      // Draw SHOW value
      if (fields.show?.found && overlayData.showName) {
        const x = fields.show.x * scaleX;
        const y = fields.show.y * scaleY;
        const maxWidth = (fields.show.width || 150) * scaleX;
        drawTextWithWrap(ctx, overlayData.showName, x, y, maxWidth);
        console.log(`Drew SHOW at (${x}, ${y}): ${overlayData.showName}`);
      }
      
      // Draw CLASS value
      if (fields.class?.found && overlayData.className) {
        const x = fields.class.x * scaleX;
        const y = fields.class.y * scaleY;
        const maxWidth = (fields.class.width || 150) * scaleX;
        drawTextWithWrap(ctx, overlayData.className, x, y, maxWidth);
        console.log(`Drew CLASS at (${x}, ${y}): ${overlayData.className}`);
      }
      
      // Draw DATE value
      if (fields.date?.found && overlayData.date) {
        const x = fields.date.x * scaleX;
        const y = fields.date.y * scaleY;
        const maxWidth = (fields.date.width || 150) * scaleX;
        drawTextWithWrap(ctx, overlayData.date, x, y, maxWidth);
        console.log(`Drew DATE at (${x}, ${y}): ${overlayData.date}`);
      }
      
      // Draw JUDGE value
      if (fields.judge?.found && overlayData.judgeName) {
        const x = fields.judge.x * scaleX;
        const y = fields.judge.y * scaleY;
        const maxWidth = (fields.judge.width || 150) * scaleX;
        drawTextWithWrap(ctx, overlayData.judgeName, x, y, maxWidth);
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
 * Draw text with word wrapping
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to draw
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} maxWidth - Maximum width before wrapping
 */
const drawTextWithWrap = (ctx, text, x, y, maxWidth) => {
  const words = text.split(' ');
  let line = '';
  const lineHeight = 16;
  let currentY = y;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
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
  const showName = project?.project_name || '';
  
  // Get class/group name
  const className = scoresheet?.groupName || scoresheet?.disciplineName || '';
  
  // Get date
  let date = '';
  if (projectData.showDates) {
    if (projectData.showDates.startDate && projectData.showDates.endDate) {
      date = `${projectData.showDates.startDate} - ${projectData.showDates.endDate}`;
    } else if (projectData.showDates.startDate) {
      date = projectData.showDates.startDate;
    }
  }
  
  // Get judge name for this discipline
  let judgeName = '';
  const judges = projectData.officialsAndStaff?.judges || [];
  const disciplineName = scoresheet?.disciplineName;
  
  if (disciplineName && judges.length > 0) {
    // Find judge assigned to this discipline
    const assignedJudge = judges.find(j => 
      j.assignedDisciplines?.includes(disciplineName) ||
      j.disciplines?.includes(disciplineName)
    );
    if (assignedJudge) {
      judgeName = assignedJudge.name || assignedJudge.full_name || '';
    }
  }
  
  // If no specific judge found, use first judge
  if (!judgeName && judges.length > 0) {
    judgeName = judges[0].name || judges[0].full_name || '';
  }
  
  return {
    showName,
    className,
    date,
    judgeName
  };
};
