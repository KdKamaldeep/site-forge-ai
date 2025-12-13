/**
 * Admin Ops Page
 * Simple operations panel for pillar generation
 * Protected by env token (basic)
 */

import { headers } from 'next/headers';
import { getTenantContext, getTenantIdFromHeaders } from '@/lib/tenant';
import { getActivePillar, getKeywordCluster, listPages, triggerRunPillar } from '@/lib/api';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// No cache for admin pages
export const dynamic = 'force-dynamic';

// Basic protection (check env token)
const ADMIN_TOKEN = process.env.ADMIN_ACCESS_TOKEN || 'change-me-in-production';

async function checkAuth() {
  // In production, implement proper auth
  // For now, just check if token exists in env
  if (!ADMIN_TOKEN || ADMIN_TOKEN === 'change-me-in-production') {
    return false;
  }
  // Could check cookie/session here
  return true;
}

export default async function AdminPage() {
  const headersList = await headers();
  const tenantId = getTenantIdFromHeaders(headersList);
  const context = await getTenantContext();

  // Basic auth check
  const isAuthorized = await checkAuth();
  if (!isAuthorized) {
    redirect('/');
  }

  if (!tenantId) {
    return <div>Tenant not found</div>;
  }

  const activePillar = context.activePillar;
  const latestPages = await listPages(tenantId);
  const recentPages = latestPages?.slice(0, 10) || [];

  // Get cluster stats if pillar exists
  let clusterStats = null;
  if (activePillar) {
    const cluster = await getKeywordCluster(
      tenantId,
      activePillar.categoryKey,
      activePillar.pillarKeyword
    );
    if (cluster) {
      clusterStats = {
        total: cluster.supportingTopics?.length || 0,
        created: cluster.supportingTopics?.filter(t => t.status === 'created').length || 0,
        planned: cluster.supportingTopics?.filter(t => t.status === 'planned').length || 0,
        skipped: cluster.supportingTopics?.filter(t => t.status === 'skipped').length || 0,
      };
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Admin Operations</h1>

      {/* Active Pillar */}
      {activePillar && (
        <section style={{ marginBottom: '3rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0 }}>Active Pillar</h2>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Category:</strong> {activePillar.categoryKey}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Pillar:</strong> {activePillar.pillarKeyword}
          </div>
          {clusterStats && (
            <div>
              <strong>Progress:</strong> {clusterStats.created} / {activePillar.targetSupportingCount} pages
              <div style={{ marginTop: '0.5rem', width: '100%', height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
                <div
                  style={{
                    width: `${(clusterStats.created / activePillar.targetSupportingCount) * 100}%`,
                    height: '100%',
                    backgroundColor: '#007bff',
                  }}
                />
              </div>
            </div>
          )}
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
            <div>✅ Created: {clusterStats?.created || 0}</div>
            <div>📝 Planned: {clusterStats?.planned || 0}</div>
            <div>⏭️ Skipped: {clusterStats?.skipped || 0}</div>
          </div>
        </section>
      )}

      {/* Manual Run */}
      <section style={{ marginBottom: '3rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>Run Generation</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Manually trigger pillar generation for this tenant.
        </p>
        <form action={`/api/pillar/run`} method="POST">
          <input type="hidden" name="tenantId" value={tenantId} />
          <button
            type="submit"
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Run Weekly Generation Now
          </button>
        </form>
      </section>

      {/* Recent Pages */}
      <section>
        <h2>Recent Pages</h2>
        {recentPages.length > 0 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {recentPages.map((page) => (
              <div
                key={page._id}
                style={{
                  padding: '1rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                }}
              >
                <Link
                  href={page.categoryKey ? `/${page.categoryKey}/${page.slug}` : `/${page.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <h3 style={{ marginTop: 0, color: '#007bff' }}>{page.title}</h3>
                </Link>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  {page.categoryKey && <span>Category: {page.categoryKey}</span>}
                  {page.updatedAt && (
                    <span style={{ marginLeft: '1rem' }}>
                      Updated: {new Date(page.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No pages yet.</p>
        )}
      </section>
    </div>
  );
}

