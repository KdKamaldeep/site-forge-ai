/**
 * Image URL normalization utility
 * Converts relative paths and old full URLs to proper API URLs
 */

const API_BASE_URL = process.env.API_IMAGE_BASE_URL || 'http://localhost:5000';

/**
 * Normalize image URL
 * - If URL is relative (starts with /), prepend API_BASE_URL
 * - If URL contains old localhost:5000, replace with API_BASE_URL
 * - If URL is already a full URL (http/https), return as-is
 * - If URL is empty/null/undefined, return null
 */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  // If already a full URL (http/https), check if it's the old localhost URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Replace old localhost:5000 URLs with API_BASE_URL
    if (url.includes('localhost:5000')) {
      return url.replace(/https?:\/\/localhost:5000/, API_BASE_URL);
    }
    // Return other full URLs as-is
    return url;
  }

  // If relative path (starts with /), prepend API_BASE_URL
  if (url.startsWith('/')) {
    // Remove trailing slash from API_BASE_URL if present
    const baseUrl = API_BASE_URL.replace(/\/+$/, '');
    return `${baseUrl}${url}`;
  }

  // If it doesn't start with /, assume it's relative and add /
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  return `${baseUrl}/${url}`;
}

/**
 * Normalize thumbnail object
 * Returns a new object with normalized URL
 */
export function normalizeThumbnail(
  thumbnail: { url?: string | null; width?: number; height?: number } | null | undefined
): { url: string; width?: number; height?: number } | null {
  if (!thumbnail || !thumbnail.url) {
    return null;
  }

  const normalizedUrl = normalizeImageUrl(thumbnail.url);
  if (!normalizedUrl) {
    return null;
  }

  return {
    url: normalizedUrl,
    width: thumbnail.width,
    height: thumbnail.height,
  };
}

/**
 * Normalize a simple image URL string
 * Returns normalized URL or null
 */
export function getImageUrl(url: string | null | undefined): string | null {
  return normalizeImageUrl(url);
}

/**
 * Check if URL is a YouTube URL and extract video ID
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * Returns video ID if YouTube URL, null otherwise
 */
export function getYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Match youtube.com/watch?v=VIDEO_ID or youtube.com/embed/VIDEO_ID
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch && youtubeMatch[1]) {
    return youtubeMatch[1];
  }
  
  return null;
}

/**
 * Get YouTube thumbnail URL from video ID
 * Uses hqdefault.jpg (480x360) as it's more widely available than maxresdefault.jpg
 * Falls back to maxresdefault.jpg if needed, but hqdefault is more reliable
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}