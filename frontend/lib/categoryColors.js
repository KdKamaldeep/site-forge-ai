/**
 * Category badge color mapping
 * Returns a color based on category key
 */

const categoryColors = {
  'world': '#2563eb',      // Blue
  'business': '#2563eb',   // Blue
  'fashion': '#9333ea',    // Purple
  'lifestyle': '#22c55e',  // Green
  'mining': '#f97316',     // Orange
  'investment': '#dc2626', // Red
  'technology': '#0ea5e9', // Sky blue
  'default': '#6b7280',    // Gray
};

export function getCategoryColor(categoryKey) {
  if (!categoryKey) return categoryColors.default;
  
  const key = categoryKey.toLowerCase().trim();
  
  // Direct match
  if (categoryColors[key]) {
    return categoryColors[key];
  }
  
  // Partial match
  for (const [category, color] of Object.entries(categoryColors)) {
    if (key.includes(category) || category.includes(key)) {
      return color;
    }
  }
  
  return categoryColors.default;
}

export default getCategoryColor;

