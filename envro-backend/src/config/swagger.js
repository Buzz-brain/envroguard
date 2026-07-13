import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'EnviroGuard API',
    version: '1.0.0',
    description:
      'Environmental Hazard Alert System - Backend API documentation. This API supports student hazard reporting, admin management, and real-time status tracking.',
    contact: {
      name: 'EnviroGuard Team',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/v1`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'number' },
          page: { type: 'number' },
          limit: { type: 'number' },
          totalPages: { type: 'number' },
          hasNextPage: { type: 'boolean' },
          hasPrevPage: { type: 'boolean' },
        },
      },
      Student: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          registrationNumber: { type: 'string', example: 'STU/2024/001' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          department: { type: 'string' },
          faculty: { type: 'string' },
          level: { type: 'string' },
          isEligible: { type: 'boolean' },
        },
      },
      HazardReport: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          category: {
            type: 'string',
            enum: [
              'Flooding',
              'Waste Dumping',
              'Pollution',
              'Blocked Drainage',
              'Dirty Environment',
              'Others',
            ],
          },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                publicId: { type: 'string' },
              },
            },
          },
          location: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              coordinates: { type: 'array', items: { type: 'number' } },
            },
          },
          status: {
            type: 'string',
            enum: ['pending', 'under_review', 'in_progress', 'resolved'],
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
          },
          faculty: { type: 'string' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          isRead: { type: 'boolean' },
          relatedReport: { type: 'string' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/modules/**/*.routes.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
  if (config.env === 'development') {
    import('swagger-ui-express').then(({ default: swaggerUi }) => {
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    });
  }
};
