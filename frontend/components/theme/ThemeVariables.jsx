'use client';

/**
 * ThemeVariables component
 * Injects CSS variables from backend theme settings
 * Maps backend theme structure to CSS variables with contrast checking
 */

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

export default function ThemeVariables({ theme }) {
  if (!theme) {
    return null;
  }

  // Backend theme structure: { theme: { colors: {...}, typography: {...} } }
  const themeColors = theme.theme?.colors || theme.colors || {};
  const themeTypography = theme.theme?.typography || theme.typography || {};

  // Default colors (professional editorial palette)
  const defaults = {
    bg: '#ffffff',
    surface: '#ffffff',
    text: '#334155', // Body text color
    muted: '#64748b', // Muted/secondary text
    border: '#e2e8f0', // Borders/dividers
    primary: '#1d4ed8', // Professional editorial blue
    accent: '#f59e0b',
    link: '#1d4ed8', // Default link color
    linkHover: '#1e40af', // Link hover (never black)
    linkVisited: '#4338ca', // Visited links
  };

  // Get tenant colors
  let primary = themeColors.primary || defaults.primary;
  let accent = themeColors.accent || defaults.accent;
  let text = themeColors.text || defaults.text;
  let bg = themeColors.background || defaults.bg;

  // Check contrast and adjust if needed
  const textContrast = getContrast(text, bg);
  if (textContrast < 4.5) {
    // Text doesn't meet WCAG AA standard, use default
    text = defaults.text;
  }

  const primaryContrast = getContrast(primary, bg);
  if (primaryContrast < 3) {
    // Primary color too low contrast, use default
    primary = defaults.primary;
  }

  // Use proper link colors (never derive from primary if it would make links black)
  const link = themeColors.link || defaults.link;
  const linkHover = themeColors.linkHover || defaults.linkHover;
  const linkVisited = themeColors.linkVisited || defaults.linkVisited;

  const cssVariables = {
    // New enhanced color system
    '--primary': primary,
    '--accent': accent,
    '--bg': bg,
    '--surface': bg,
    '--text': text,
    '--muted': themeColors.secondary || defaults.muted,
    '--border': defaults.border,
    '--link': link,
    '--link-hover': linkHover,
    '--link-visited': linkVisited,
    '--linkHover': linkHover, // Legacy compatibility
    // Legacy compatibility
    '--secondary': themeColors.secondary || defaults.muted,
    '--background': bg,
    '--primary-hover': linkHover,
    '--text-secondary': themeColors.secondary || defaults.muted,
    '--text-muted': '#64748b',
    '--border-light': '#f1f5f9',
    // Typography
    '--heading-font': themeTypography.headingFont || themeTypography.fontFamily || '"Montserrat", sans-serif',
    '--body-font': themeTypography.fontFamily || '"Source Sans Pro", sans-serif',
    '--font-size': themeTypography.fontSize || '16px',
  };

  const cssString = Object.entries(cssVariables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n    ');

  return (
    <style dangerouslySetInnerHTML={{
      __html: `:root { ${cssString} }`
    }} />
  );
}

