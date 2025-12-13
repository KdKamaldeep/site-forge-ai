import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { getTenantContext } from '@/lib/tenant';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import '@/styles/globals.css';
import '@/styles/theme.css';
import '@/styles/mobile-optimizations.css';

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
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Source+Sans+Pro:wght@400;600&display=swap" rel="stylesheet" />
        {tenant?.googleAnalyticsId && (
          <GoogleAnalytics 
            gaId={tenant.googleAnalyticsId} 
            tenantDomain={tenant.domain}
          />
        )}
      </head>
      <body>
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

