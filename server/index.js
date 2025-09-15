import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import swaggerUI from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';

 
import "./config/db.js";

// Import routes
import authRoutes from './routes/authRoutes.js';
import leadsRoutes from './routes/leadsRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import tasksRoutes from './routes/taskRoutes.js';
import interactionsRoutes from './routes/interactionRoutes.js';
// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Swagger definition - MINIMAL like your example
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KFCRM FAIREX API',
      version: '1.0.0',
      description: 'API documentation for the KFCRM FAIREX',
      contact: {
        name: 'API Support',
        email: 'support@crm-system.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'],  
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Documentation Route
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/companies',companyRoutes);
app.use('/api/webhooks',webhookRoutes);
app.use('/api/contacts',contactRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/interactions', interactionsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    message: 'CRM Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to KFCRM  FAIREX API',
    documentation: `/api-docs`,
    health: '/health',
    version: '1.0.0'
  });
});

// 404 handler
app.use( (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: {
      documentation: '/api-docs',
      auth: '/api/auth',
      leads: '/api/leads',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});