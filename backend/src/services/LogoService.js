/**
 * Logo Service
 * Generates logos for tenants using Gemini image generation
 */

import { GeminiImageService } from './GeminiImageService.js';
import { AIAuditService } from './AIAuditService.js';

export class LogoService {
  /**
   * Generate a logo for a tenant based on brand identity
   * @param {Object} tenant - Tenant object with brandIdentity
   * @returns {Promise<string|null>} Logo URL or null if generation fails
   */
  static async generateLogo(tenant) {
    if (!tenant) {
      throw new Error('Tenant is required');
    }

    const brandName = tenant.brandIdentity?.brandName || tenant.name || 'Brand';
    const tagline = tenant.brandIdentity?.tagline || '';
    const tone = tenant.brandIdentity?.tone || 'professional';
    
    // Create a prompt for logo generation
    const logoPrompt = this.createLogoPrompt(brandName, tagline, tone);

    try {
      console.log(`🎨 Generating logo for tenant: ${brandName}`);
      const startTime = Date.now();

      // Generate logo image (square format for logos)
      const logoUrl = await GeminiImageService.generateImage(logoPrompt, {
        width: 400,
        height: 400,
        style: 'professional',
        context: 'logo',
        tenantId: tenant._id?.toString() || null
      });

      const duration = Date.now() - startTime;

      // Log successful logo generation
      await AIAuditService.logSuccess({
        tenantId: tenant._id || null,
        service: 'gemini',
        operation: 'generateLogo',
        requestData: { brandName, tagline, tone },
        responseData: { logoUrl },
        duration,
        metadata: { brandName }
      });

      console.log(`✅ Logo generated successfully: ${logoUrl}`);
      return logoUrl;
    } catch (error) {
      console.error(`❌ Error generating logo for tenant ${brandName}:`, error.message);
      
      // Log failed logo generation
      await AIAuditService.logFailure({
        tenantId: tenant._id || null,
        service: 'gemini',
        operation: 'generateLogo',
        error,
        requestData: { brandName, tagline, tone },
        duration: Date.now() - Date.now(),
        metadata: { brandName }
      });

      // Return null if generation fails (tenant can set logo manually later)
      return null;
    }
  }

  /**
   * Create a prompt for logo generation
   * @param {string} brandName - Brand name
   * @param {string} tagline - Brand tagline (optional)
   * @param {string} tone - Brand tone
   * @returns {string} Logo generation prompt
   */
  static createLogoPrompt(brandName, tagline = '', tone = 'professional') {
    const toneDescriptions = {
      'professional': 'clean, modern, corporate, trustworthy',
      'friendly': 'warm, approachable, inviting, welcoming',
      'expert': 'authoritative, knowledgeable, sophisticated',
      'casual': 'relaxed, informal, friendly, approachable',
      'authoritative': 'bold, confident, strong, commanding',
      'conversational': 'friendly, engaging, personable, relatable',
      'practical': 'straightforward, functional, clear, useful'
    };

    const toneDesc = toneDescriptions[tone] || 'professional';

    let prompt = `Create a professional logo design for "${brandName}"`;
    
    if (tagline) {
      prompt += ` with tagline "${tagline}"`;
    }
    
    prompt += `. The logo should be ${toneDesc}, suitable for use as a website header logo. `;
    prompt += `The design should be simple, memorable, and work well at small sizes. `;
    prompt += `Use a clean, modern style with good contrast. `;
    prompt += `The logo should represent the brand "${brandName}" in a professional and appealing way.`;
    
    return prompt;
  }

  /**
   * Generate logo with retry logic (2 retries)
   * @param {Object} tenant - Tenant object
   * @param {number} maxRetries - Maximum number of retries (default: 2)
   * @returns {Promise<string|null>} Logo URL or null if all retries fail
   */
  static async generateLogoWithRetry(tenant, maxRetries = 2) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying logo generation (attempt ${attempt + 1}/${maxRetries + 1})...`);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
        const logoUrl = await this.generateLogo(tenant);
        if (logoUrl) {
          return logoUrl;
        }
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  Logo generation attempt ${attempt + 1} failed:`, error.message);
      }
    }
    
    console.error(`❌ Logo generation failed after ${maxRetries + 1} attempts`);
    return null;
  }
}
