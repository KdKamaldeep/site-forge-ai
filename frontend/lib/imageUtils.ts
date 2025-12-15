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
