'use client';

/**
 * LeadForm Component
 * WhatsApp + Email form for lead generation
 */

'use client';

import { useState } from 'react';

interface LeadFormProps {
  tenantId?: string;
  ctaStyle?: 'whatsapp' | 'form' | 'both';
  whatsappNumber?: string;
}

export default function LeadForm({ tenantId, ctaStyle = 'form', whatsappNumber }: LeadFormProps) {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In production, send to backend API
    console.log('Form submitted:', formData);
    setSubmitted(true);
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Hi! I'm interested in learning more.`);
    const number = whatsappNumber || '1234567890'; // Default placeholder
    window.open(`https://wa.me/${number}?text=${message}`, '_blank');
  };

  if (ctaStyle === 'whatsapp') {
    return (
      <div
        style={{
          padding: '2rem',
          backgroundColor: '#f9f9f9',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          margin: '2rem 0',
          textAlign: 'center',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Get in Touch</h3>
        <p>Contact us via WhatsApp for immediate assistance.</p>
        <button
          onClick={handleWhatsApp}
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#25D366',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          💬 Chat on WhatsApp
        </button>
      </div>
    );
  }

  if (ctaStyle === 'form') {
    return (
      <div
        style={{
          padding: '2rem',
          backgroundColor: '#f9f9f9',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          margin: '2rem 0',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Contact Us</h3>
        {submitted ? (
          <div style={{ padding: '1rem', backgroundColor: '#d4edda', borderRadius: '4px', color: '#155724' }}>
            Thank you! We'll get back to you soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: 'var(--primary, #007bff)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Submit
            </button>
          </form>
        )}
      </div>
    );
  }

  // Both: Show form with WhatsApp option
  return (
    <div
      style={{
        padding: '2rem',
        backgroundColor: '#f9f9f9',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        margin: '2rem 0',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Get in Touch</h3>
      <p>Fill out the form below or contact us via WhatsApp.</p>
      
      {submitted ? (
        <div style={{ padding: '1rem', backgroundColor: '#d4edda', borderRadius: '4px', color: '#155724' }}>
          Thank you! We'll get back to you soon.
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Your Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  marginBottom: '0.5rem',
                }}
              />
              <input
                type="email"
                placeholder="Your Email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--primary, #007bff)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '1rem',
              }}
            >
              Submit
            </button>
          </form>
          
          <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
            <p style={{ marginBottom: '0.5rem' }}>Or contact us directly:</p>
            <button
              onClick={handleWhatsApp}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#25D366',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              💬 WhatsApp
            </button>
          </div>
        </>
      )}
    </div>
  );
}

