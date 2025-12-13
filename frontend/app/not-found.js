export default function NotFound() {
  return (
    <div style={{ 
      padding: '4rem 2rem', 
      textAlign: 'center',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Page Not Found</h2>
      <p style={{ fontSize: '1.1rem', color: '#666' }}>
        The page you are looking for does not exist or the tenant was not found.
      </p>
    </div>
  );
}

