import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MicroSite Empire AI API',
      version: '1.0.0',
      description: 'Complete backend API for Next.js 14 multi-tenant CMS with SSR, ISR, dynamic page rendering, theme system, and navigation menus.',
      contact: {
        name: 'API Support',
        email: 'support@microsite-empire.ai'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.microsite-empire.ai',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        Tenant: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Tenant ID'
            },
            name: {
              type: 'string',
              description: 'Tenant name'
            },
            domain: {
              type: 'string',
              description: 'Tenant domain'
            },
            logo: {
              type: 'string',
              nullable: true,
              description: 'Logo URL'
            },
            theme: {
              type: 'object',
              properties: {
                colors: {
                  type: 'object',
                  properties: {
                    primary: { type: 'string' },
                    secondary: { type: 'string' },
                    text: { type: 'string' },
                    background: { type: 'string' },
                    accent: { type: 'string' }
                  }
                },
                typography: {
                  type: 'object',
                  properties: {
                    fontFamily: { type: 'string' },
                    headingFont: { type: 'string' },
                    fontSize: { type: 'string' }
                  }
                }
              }
            },
            settings: {
              type: 'object',
              description: 'Additional tenant settings'
            }
          }
        },
        Page: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Page title'
            },
            slug: {
              type: 'string',
              description: 'Page slug'
            },
            meta: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                keywords: {
                  type: 'array',
                  items: { type: 'string' }
                },
                ogImage: {
                  type: 'string',
                  nullable: true
                }
              }
            },
            content: {
              type: 'string',
              description: 'HTML content'
            },
            uxLayout: {
              type: 'object',
              description: 'UX layout configuration'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        PageList: {
          type: 'object',
          properties: {
            pages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  slug: { type: 'string' },
                  title: { type: 'string' }
                }
              }
            }
          }
        },
        Navigation: {
          type: 'object',
          properties: {
            logo: {
              type: 'string',
              nullable: true
            },
            menu: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  slug: { type: 'string' }
                }
              }
            },
            cta: {
              type: 'object',
              properties: {
                label: { type: 'string', nullable: true },
                url: { type: 'string', nullable: true }
              }
            }
          }
        },
        RevalidateRequest: {
          type: 'object',
          required: ['tenantId', 'slug'],
          properties: {
            tenantId: {
              type: 'string',
              description: 'Tenant ID'
            },
            slug: {
              type: 'string',
              description: 'Page slug to revalidate'
            }
          }
        },
        RevalidateResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            path: { type: 'string' },
            revalidated: { type: 'boolean' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Tenants',
        description: 'Tenant domain resolution and management'
      },
      {
        name: 'Pages',
        description: 'Page fetching for SSR, homepage, and page lists'
      },
      {
        name: 'Navigation',
        description: 'Navigation menu and header configuration'
      },
      {
        name: 'Revalidate',
        description: 'Next.js ISR cache revalidation'
      },
      {
        name: 'Auth',
        description: 'Authentication endpoints'
      },
      {
        name: 'Tools',
        description: 'AI agent tools and utilities'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './server.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerSpec, swaggerUi };

