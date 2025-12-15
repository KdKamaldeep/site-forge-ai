'use client';

/**
 * AdSlot Component
 * Renders AdSense ad slot placeholder
 * Can be empty until AdSense script is added
 */

interface AdSlotProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  adsenseId?: string;
}

export default function AdSlot({ slot, format = 'auto', style, adsenseId }: AdSlotProps) {
  // For now, render as placeholder
  // In production, you would inject AdSense script and render actual ads
  const isProduction = process.env.NODE_ENV === 'production';
  // Use prop adsenseId if provided, otherwise fallback to env variable for backward compatibility
  const adClientId = adsenseId || process.env.NEXT_PUBLIC_ADSENSE_ID;

  if (!isProduction || !adsenseId) {
    // Development placeholder - minimal, clean
    return (
      <div
        style={{
          minHeight: '250px',
          backgroundColor: 'var(--border-light, #f9fafb)',
          border: '1px solid var(--border, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted, #9ca3af)',
          fontSize: '0.875rem',
          margin: 'var(--spacing-xl, 3rem) 0',
          ...style,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div>Advertisement</div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Ad Slot: {slot}
          </div>
        </div>
      </div>
    );
  }

  // Production: Render actual AdSense ad
  return (
    <div 
      style={{ 
        margin: 'var(--spacing-xl, 3rem) 0',
        textAlign: 'center',
        ...style 
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adClientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (adsbygoogle = window.adsbygoogle || []).push({});
          `,
        }}
      />
    </div>
  );
}

