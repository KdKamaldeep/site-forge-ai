/**
 * Schema Markup Component
 * Renders JSON-LD structured data for SEO
 */

export default function SchemaMarkup({ schemas }) {
  if (!schemas || schemas.length === 0) {
    return null;
  }

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema)
          }}
        />
      ))}
    </>
  );
}

