/**
 * OpenAI Agent Definition
 * Microsite Builder Agent - Autonomous SEO content generator
 */

export const agentDefinition = {
  name: "Microsite Builder Agent",
  model: "gpt-4o-mini", // Using gpt-4o (gpt-4.1 doesn't exist - will be mapped in registration)
  instructions: `You are an autonomous microsite builder agent specialized in SEO content generation and microsite expansion.

Your primary responsibilities:
1. Generate SEO-optimized, long-tail topic ideas for tenants
2. Create new pages with high-quality, comprehensive content
3. Update existing pages to improve SEO and content quality
4. Expand topical authority by covering related topics
5. Avoid duplicate topics and repeated work
6. Never delete pages - only create or update

WORKFLOW:
1. When given a domain, first get tenant information using getTenantInfo (this will create the tenant if it doesn't exist)
2. Generate 3-5 unique, SEO-friendly topics that are niche-relevant
3. For EACH topic (one at a time):
   a. Generate comprehensive HTML content (1500-2000 words is sufficient)
   b. Include proper HTML structure: <h2>, <h3>, <p>, <ul>, <ol> tags
   c. Create meta information (title, description, keywords array)
   d. Create simple UX layout: { sections: [] } (can be empty)
   e. Use createPage tool with all required fields
4. Work efficiently: Generate and publish pages one by one, not all at once
5. If a topic already exists (you'll see an error), skip it and move to the next

CONTENT QUALITY REQUIREMENTS:
- Target 1500-2000 words per page (sufficient for SEO)
- Use proper HTML structure: <h2>, <h3>, <p>, <ul>, <ol>
- Include SEO-optimized meta tags
- Write clear, valuable content
- Include practical examples

TOOL USAGE RULES:
- Always get tenant info first before creating/updating pages
- Never call tools without thinking through the action first
- Check if a page with similar topic exists before creating new
- Use updatePage if content can be improved
- Use createPage only for genuinely new topics
- Always provide complete data (title, slug, html, meta, uxLayout)

Remember: Quality over quantity. Each page should be valuable and comprehensive.`,
  tools: [
    {
      type: "function",
      function: {
        name: "getTenantInfo",
        description: "Fetch tenant information by domain. Use this first to get tenantId and understand the tenant's niche, theme, and existing setup.",
        parameters: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description: "The tenant domain (e.g., 'travel.ai' or 'example.com')"
            }
          },
          required: ["domain"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "createPage",
        description: "Create a new page for a tenant. Use this for new topics that don't exist yet. Ensure the slug is unique and SEO-friendly.",
        parameters: {
          type: "object",
          properties: {
            tenantId: {
              type: "string",
              description: "The tenant ID (from getTenantInfo)"
            },
            title: {
              type: "string",
              description: "Page title (SEO-optimized, 50-60 characters)"
            },
            slug: {
              type: "string",
              description: "URL slug (lowercase, hyphenated, unique)"
            },
            html: {
              type: "string",
              description: "Full HTML content (1500-2500 words) with proper structure (<h2>, <h3>, <p>, <ul>, etc.)"
            },
            meta: {
              type: "object",
              description: "SEO meta information",
              properties: {
                title: { type: "string", description: "Meta title" },
                description: { type: "string", description: "Meta description (150-160 chars)" },
                keywords: { type: "array", items: { type: "string" }, description: "SEO keywords" }
              }
            },
            uxLayout: {
              type: "object",
              description: "UX layout structure",
              properties: {
                sections: {
                  type: "array",
                  items: { type: "object" },
                  description: "Layout sections array"
                }
              }
            }
          },
          required: ["tenantId", "title", "slug", "html", "meta", "uxLayout"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "updatePage",
        description: "Update an existing page. Use this to improve existing content, add information, or refresh SEO. Never use this to delete content.",
        parameters: {
          type: "object",
          properties: {
            tenantId: {
              type: "string",
              description: "The tenant ID (from getTenantInfo)"
            },
            pageId: {
              type: "string",
              description: "The page ID to update"
            },
            title: {
              type: "string",
              description: "Updated page title (optional)"
            },
            html: {
              type: "string",
              description: "Updated HTML content (optional)"
            },
            meta: {
              type: "object",
              description: "Updated meta information (optional)",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                keywords: { type: "array", items: { type: "string" } }
              }
            },
            uxLayout: {
              type: "object",
              description: "Updated UX layout (optional)",
              properties: {
                sections: { type: "array", items: { type: "object" } }
              }
            }
          },
          required: ["tenantId", "pageId"]
        }
      }
    }
  ]
};

// Export tool schemas for registration
export const toolSchemas = agentDefinition.tools;

