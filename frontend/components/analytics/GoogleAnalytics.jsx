/**
 * Google Analytics Component
 * Integrates Google Analytics 4 (GA4) and Google Search Console
 */

'use client';

import Script from 'next/script';

export default function GoogleAnalytics({ gaId, tenantDomain }) {
  if (!gaId) {
    return null;
  }

  return (
    <>
      {/* Google Analytics 4 */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              custom_map: {
                'custom_parameter_1': 'tenant_domain'
              }
            });
            gtag('set', 'tenant_domain', '${tenantDomain || ''}');
          `,
        }}
      />

      {/* Google Search Console Verification */}
      {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
        <meta
          name="google-site-verification"
          content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}
        />
      )}
    </>
  );
}

