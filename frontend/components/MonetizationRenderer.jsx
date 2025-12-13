'use client';

/**
 * MonetizationRenderer component
 * Converts monetization placeholders in HTML content to React components
 */

import { useEffect, useRef } from 'react';

export default function MonetizationRenderer({ content, intent, monetizationMode, children }) {
  const contentRef = useRef(null);

  // If children provided (ArticleLayout), render it instead
  if (children) {
    return children;
  }

  useEffect(() => {
    if (!contentRef.current) return;

    // Process AdSense placeholders
    const adSlots = contentRef.current.querySelectorAll('[data-ad-slot]');
    adSlots.forEach((slot, index) => {
      const slotName = slot.getAttribute('data-ad-slot');
      // Replace with actual AdSense component (or keep placeholder if AdSense not configured)
      // For now, we'll just style it as a placeholder
      slot.innerHTML = `
        <div style="
          min-height: 250px;
          background: #f5f5f5;
          border: 2px dashed #ddd;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 0.9rem;
          margin: 2rem 0;
        ">
          Ad Slot: ${slotName}
          ${process.env.NEXT_PUBLIC_ADSENSE_ID ? '(AdSense configured)' : '(Configure AdSense in env)'}
        </div>
      `;
    });

    // Process affiliate table placeholders
    const affiliateTables = contentRef.current.querySelectorAll('[data-affiliate-table]');
    affiliateTables.forEach((table) => {
      table.innerHTML = `
        <div style="
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 2rem;
          margin: 2rem 0;
        ">
          <h3 style="margin-top: 0;">Product Comparison</h3>
          <p style="color: #666; font-size: 0.9rem;">
            AI-generated product comparison table will be displayed here.
            (To be implemented with actual product data)
          </p>
        </div>
      `;
    });

    // Process lead generation placeholders
    const leadCTAs = contentRef.current.querySelectorAll('[data-lead-cta]');
    leadCTAs.forEach((cta) => {
      const whatsappButton = cta.querySelector('[data-whatsapp-button]');
      const contactForm = cta.querySelector('[data-contact-form]');

      if (whatsappButton) {
        whatsappButton.innerHTML = `
          <a 
            href="https://wa.me/1234567890" 
            target="_blank"
            style="
              display: inline-block;
              background: #25D366;
              color: white;
              padding: 1rem 2rem;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              margin: 1rem 0;
            "
          >
            📱 Contact via WhatsApp
          </a>
        `;
      }

      if (contactForm) {
        contactForm.innerHTML = `
          <form style="
            background: #f9f9f9;
            padding: 2rem;
            border-radius: 8px;
            margin: 1rem 0;
          ">
            <h4 style="margin-top: 0;">Get in Touch</h4>
            <input 
              type="text" 
              placeholder="Your Name" 
              style="
                width: 100%;
                padding: 0.75rem;
                margin: 0.5rem 0;
                border: 1px solid #ddd;
                border-radius: 4px;
              "
            />
            <input 
              type="email" 
              placeholder="Your Email" 
              style="
                width: 100%;
                padding: 0.75rem;
                margin: 0.5rem 0;
                border: 1px solid #ddd;
                border-radius: 4px;
              "
            />
            <textarea 
              placeholder="Your Message" 
              rows="4"
              style="
                width: 100%;
                padding: 0.75rem;
                margin: 0.5rem 0;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-family: inherit;
              "
            ></textarea>
            <button 
              type="submit"
              style="
                background: #007bff;
                color: white;
                padding: 0.75rem 2rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
              "
            >
              Send Message
            </button>
          </form>
        `;
      }
    });
  }, [content, intent, monetizationMode]);

  return (
    <div 
      ref={contentRef}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

