/**
 * MonetizationRenderer
 * Safely replaces monetization placeholders in HTML content with React components
 * Uses server-side HTML parsing (minimal, controlled)
 */

'use client';

import { useEffect, useState } from 'react';
import AdSlot from './AdSlot';
import AffiliateTable from './AffiliateTable';
import LeadForm from './LeadForm';

interface MonetizationRendererProps {
  content: string;
  intent?: 'informational' | 'commercial' | 'lead';
  monetizationMode?: 'adsense' | 'affiliate' | 'lead' | 'mixed';
  tenantId?: string;
}

export default function MonetizationRenderer({
  content,
  intent = 'informational',
  monetizationMode = 'adsense',
  tenantId,
}: MonetizationRendererProps) {
  const [processedContent, setProcessedContent] = useState<string>('');
  const [components, setComponents] = useState<Array<{ type: string; props: any; id: string }>>([]);

  useEffect(() => {
    // Parse HTML and extract placeholders
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const placeholders: Array<{ type: string; props: any; id: string }> = [];
    let componentId = 0;

    // Find AdSlot placeholders
    const adSlots = doc.querySelectorAll('[data-ad-slot]');
    adSlots.forEach((el) => {
      const slot = el.getAttribute('data-ad-slot');
      const id = `ad-${componentId++}`;
      placeholders.push({
        type: 'ad',
        props: { slot },
        id,
      });
      // Replace with marker
      const marker = doc.createComment(`MONETIZATION_COMPONENT:${id}`);
      el.parentNode?.replaceChild(marker, el);
    });

    // Find AffiliateTable placeholders
    const affiliateTables = doc.querySelectorAll('[data-affiliate-table]');
    affiliateTables.forEach((el) => {
      const id = `affiliate-${componentId++}`;
      placeholders.push({
        type: 'affiliate',
        props: {},
        id,
      });
      const marker = doc.createComment(`MONETIZATION_COMPONENT:${id}`);
      el.parentNode?.replaceChild(marker, el);
    });

    // Find LeadForm placeholders
    const leadForms = doc.querySelectorAll('[data-lead-form]');
    leadForms.forEach((el) => {
      const ctaStyle = el.getAttribute('data-cta-style') || 'form';
      const whatsappNumber = el.getAttribute('data-whatsapp-number') || undefined;
      const id = `lead-${componentId++}`;
      placeholders.push({
        type: 'lead',
        props: { tenantId, ctaStyle, whatsappNumber },
        id,
      });
      const marker = doc.createComment(`MONETIZATION_COMPONENT:${id}`);
      el.parentNode?.replaceChild(marker, el);
    });

    setProcessedContent(doc.body.innerHTML);
    setComponents(placeholders);
  }, [content, tenantId]);

  // Render content with components inserted
  const renderContent = () => {
    let html = processedContent || content;
    const parts: Array<React.ReactNode> = [];
    let lastIndex = 0;
    let key = 0;

    // Find all component markers and split content
    const markerRegex = /<!--MONETIZATION_COMPONENT:([^>]+)-->/g;
    let match;

    while ((match = markerRegex.exec(html)) !== null) {
      // Add text before marker
      if (match.index > lastIndex) {
        parts.push(
          <div
            key={`content-${key++}`}
            dangerouslySetInnerHTML={{ __html: html.substring(lastIndex, match.index) }}
          />
        );
      }

      // Add component
      const componentId = match[1];
      const component = components.find((c) => c.id === componentId);
      if (component) {
        if (component.type === 'ad') {
          parts.push(<AdSlot key={componentId} {...component.props} />);
        } else if (component.type === 'affiliate') {
          parts.push(<AffiliateTable key={componentId} {...component.props} />);
        } else if (component.type === 'lead') {
          parts.push(<LeadForm key={componentId} {...component.props} />);
        }
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining content
    if (lastIndex < html.length) {
      parts.push(
        <div
          key={`content-${key++}`}
          dangerouslySetInnerHTML={{ __html: html.substring(lastIndex) }}
        />
      );
    }

    return parts.length > 0 ? parts : <div dangerouslySetInnerHTML={{ __html: content }} />;
  };

  // If children provided, render children instead (for ArticleLayout)
  if (arguments.length > 0 && (arguments as any)[0]?.children) {
    const children = (arguments as any)[0].children;
    return <>{children}</>;
  }

  return <div>{renderContent()}</div>;
}

