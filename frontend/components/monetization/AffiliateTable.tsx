'use client';

/**
 * AffiliateTable Component
 * Generic placeholder for affiliate comparison tables
 * Backend can inject product data later
 */

interface AffiliateTableProps {
  products?: Array<{
    name: string;
    price?: string;
    rating?: number;
    link?: string;
    description?: string;
  }>;
}

export default function AffiliateTable({ products }: AffiliateTableProps) {
  if (!products || products.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--spacing-lg, 2rem)',
          backgroundColor: 'var(--border-light, #f9fafb)',
          border: '1px solid var(--border, #e5e7eb)',
          margin: 'var(--spacing-xl, 3rem) 0',
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: '1.5rem', marginBottom: 'var(--spacing-md, 1.5rem)' }}>
          Product Comparison
        </h3>
        <p style={{ color: 'var(--text-secondary, #6b7280)', fontStyle: 'italic' }}>
          Product comparison table will be displayed here.
        </p>
      </div>
    );
  }

  return (
    <section
      style={{
        padding: 'var(--spacing-lg, 2rem)',
        backgroundColor: 'var(--border-light, #f9fafb)',
        border: '1px solid var(--border, #e5e7eb)',
        margin: 'var(--spacing-xl, 3rem) 0',
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: '1.5rem', marginBottom: 'var(--spacing-md, 1.5rem)' }}>
        Product Comparison
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
              <th style={{ padding: 'var(--spacing-md, 1.5rem)', textAlign: 'left', fontWeight: 600 }}>
                Product
              </th>
              <th style={{ padding: 'var(--spacing-md, 1.5rem)', textAlign: 'left', fontWeight: 600 }}>
                Price
              </th>
              <th style={{ padding: 'var(--spacing-md, 1.5rem)', textAlign: 'left', fontWeight: 600 }}>
                Rating
              </th>
              <th style={{ padding: 'var(--spacing-md, 1.5rem)', textAlign: 'left', fontWeight: 600 }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={index} style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                <td style={{ padding: 'var(--spacing-md, 1.5rem)' }}>
                  <strong>{product.name}</strong>
                  {product.description && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #6b7280)', marginTop: '0.25rem' }}>
                      {product.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: 'var(--spacing-md, 1.5rem)' }}>
                  {product.price || 'Check Price'}
                </td>
                <td style={{ padding: 'var(--spacing-md, 1.5rem)' }}>
                  {product.rating ? `⭐ ${product.rating}/5` : '-'}
                </td>
                <td style={{ padding: 'var(--spacing-md, 1.5rem)' }}>
                  {product.link ? (
                    <a
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--primary, #2563eb)',
                        color: '#fff',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        display: 'inline-block',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary-hover, #1d4ed8)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary, #2563eb)';
                      }}
                    >
                      View Product
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

