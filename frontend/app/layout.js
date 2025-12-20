import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { getTenantContext } from '@/lib/tenant';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import { Montserrat, Source_Sans_Pro } from 'next/font/google';
import '@/styles/globals.css';
import '@/styles/theme.css';
import '@/styles/mobile-optimizations.css';

// Configure Montserrat font for headings
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  preload: true,
  variable: '--font-montserrat',
});

// Configure Source Sans Pro font for body text
const sourceSansPro = Source_Sans_Pro({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  preload: true,
  variable: '--font-source-sans-pro',
});

export const metadata = {
  title: 'MicroSite Empire AI',
  description: 'Multi-tenant micro-site CMS platform',
};

export default async function RootLayout({ children }) {
  // Get tenant context (includes Site DNA)
  const context = await getTenantContext();
  const tenant = context.tenant;
  const navigation = context.siteDNA?.nav || [];
  const categories = context.siteDNA?.categories || [];

  return (
    <html lang="en">
      <head>
        {/* Favicon */}
        {tenant?.favicon && (() => {
          // Extract base URL and tenant ID from favicon URL
          // Format: https://bucket.s3.amazonaws.com/favicons/{tenantId}/favicon-32x32.png
          const faviconBaseUrl = tenant.favicon.substring(0, tenant.favicon.lastIndexOf('/') + 1);
          return (
            <>
              <link rel="icon" type="image/png" sizes="32x32" href={tenant.favicon} />
              <link rel="icon" type="image/png" sizes="16x16" href={`${faviconBaseUrl}favicon-16x16.png`} />
              <link rel="icon" type="image/png" sizes="48x48" href={`${faviconBaseUrl}favicon-48x48.png`} />
              <link rel="icon" type="image/png" sizes="64x64" href={`${faviconBaseUrl}favicon-64x64.png`} />
              <link rel="icon" type="image/png" sizes="128x128" href={`${faviconBaseUrl}favicon-128x128.png`} />
              <link rel="apple-touch-icon" sizes="180x180" href={`${faviconBaseUrl}apple-touch-icon.png`} />
              <link rel="icon" type="image/png" sizes="192x192" href={`${faviconBaseUrl}android-chrome-192x192.png`} />
              <link rel="icon" type="image/png" sizes="512x512" href={`${faviconBaseUrl}android-chrome-512x512.png`} />
            </>
          );
        })()}
        {tenant?.googleAnalyticsId && (
          <GoogleAnalytics 
            gaId={tenant.googleAnalyticsId} 
            tenantDomain={tenant.domain}
          />
        )}
        {tenant?.adsenseId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${tenant.adsenseId}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className={`${montserrat.variable} ${sourceSansPro.variable}`}>
        <ThemeProvider theme={tenant}>
          <Header navigation={navigation} tenant={tenant} />
          <main>{children}</main>
          <Footer 
            navigation={navigation} 
            tenant={tenant} 
            categories={categories}
            popularPosts={[]}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

