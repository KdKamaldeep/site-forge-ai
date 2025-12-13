/**
 * PillarProgressCard
 * Shows active pillar progress and stats
 */

import Link from 'next/link';
import { getActivePillar, getKeywordCluster } from '@/lib/api';

interface PillarProgressCardProps {
  tenantId: string;
  activePillar?: {
    categoryKey: string;
    pillarKeyword: string;
    targetSupportingCount: number;
    createdAt: string;
  } | null;
}

export default async function PillarProgressCard({ tenantId, activePillar }: PillarProgressCardProps) {
  if (!activePillar) {
    return null;
  }

  // Fetch cluster stats
  const cluster = await getKeywordCluster(
    tenantId,
    activePillar.categoryKey,
    activePillar.pillarKeyword
  );

  const createdCount = cluster?.supportingTopics?.filter(t => t.status === 'created').length || 0;
  const plannedCount = cluster?.supportingTopics?.filter(t => t.status === 'planned').length || 0;
  const progress = activePillar.targetSupportingCount > 0
    ? Math.round((createdCount / activePillar.targetSupportingCount) * 100)
    : 0;

  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: '#f9f9f9',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        margin: '2rem 0',
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: '1.25rem' }}>Current Pillar Progress</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
          Category: <strong>{activePillar.categoryKey}</strong>
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          {activePillar.pillarKeyword}
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#666' }}>Progress</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {createdCount} / {activePillar.targetSupportingCount}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: 'var(--primary, #007bff)',
              transition: 'width 0.3s',
            }}
          />
        </div>
        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
          {progress}% complete
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#666' }}>
        <span>✅ Created: {createdCount}</span>
        <span>📝 Planned: {plannedCount}</span>
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
        <Link
          href={`/admin/cluster?category=${activePillar.categoryKey}&pillar=${encodeURIComponent(activePillar.pillarKeyword)}`}
          style={{
            fontSize: '0.875rem',
            color: 'var(--primary, #007bff)',
            textDecoration: 'none',
          }}
        >
          View Cluster Details →
        </Link>
      </div>
    </div>
  );
}

