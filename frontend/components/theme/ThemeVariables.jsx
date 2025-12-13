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

  // Default colors (lively but trustworthy)
  const defaults = {
    bg: '#ffffff',
    surface: '#ffffff',
    text: '#0f172a',
    muted: '#475569',
    border: '#e2e8f0',
    primary: '#2563eb',
    accent: '#f59e0b',
    link: '#1d4ed8',
    linkHover: '#1e40af',
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

  // Derive link colors from primary
  const link = themeColors.secondary || primary;
  const linkHover = link === primary ? defaults.linkHover : link;

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
    '--link-visited': '#4338ca',
    '--linkHover': linkHover, // Legacy compatibility
    // Legacy compatibility
    '--secondary': themeColors.secondary || defaults.muted,
    '--background': bg,
    '--primary-hover': linkHover,
    '--text-secondary': themeColors.secondary || defaults.muted,
    '--text-muted': '#64748b',
    '--border-light': '#f1f5f9',
    // Typography
    '--heading-font': themeTypography.headingFont || themeTypography.fontFamily || 'Arial, sans-serif',
    '--body-font': themeTypography.fontFamily || 'Arial, sans-serif',
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

