import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { companiesController } from '../controllers/companiesController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Company:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         tenant_id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         name:
 *           type: string
 *           example: Acme Corporation
 *         website:
 *           type: string
 *           example: https://www.acme.com
 *         phone:
 *           type: string
 *           example: +91-11-12345678
 *         address:
 *           type: string
 *           example: 123 Business Street, Delhi, India
 *         contact_count:
 *           type: integer
 *           example: 25
 *         opportunity_count:
 *           type: integer
 *           example: 5
 *         total_won_value:
 *           type: number
 *           example: 150000.00
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     CompanyCreate:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: Acme Corporation
 *           description: Company name
 *         website:
 *           type: string
 *           example: https://www.acme.com
 *           description: Company website URL
 *         phone:
 *           type: string
 *           example: +91-11-12345678
 *           description: Company phone number
 *         address:
 *           type: string
 *           example: 123 Business Street, Delhi, India
 *           description: Company address
 *     
 *     CompanyUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Acme Corporation Ltd
 *         website:
 *           type: string
 *           example: https://www.acme.com
 *         phone:
 *           type: string
 *           example: +91-11-12345678
 *         address:
 *           type: string
 *           example: 456 New Business Street, Mumbai, India
 *     
 *     CompanyListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Success
 *         data:
 *           type: object
 *           properties:
 *             companies:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Company'
 *             pagination:
 *               $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/companies:
 *   get:
 *     tags:
 *       - Companies
 *     summary: Get companies with filters
 *     description: Retrieve list of companies with optional filtering and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, website, phone, address
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, created_at, contact_count, opportunity_count, total_won_value]
 *         description: Sort field
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: created_after
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter companies created after this date
 *       - in: query
 *         name: created_before
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter companies created before this date
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyListResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort_by').optional().isIn(['name', 'created_at', 'contact_count', 'opportunity_count', 'total_won_value']).withMessage('Invalid sort field'),
  query('sort_order').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('created_after').optional().isISO8601().withMessage('Invalid date format'),
  query('created_before').optional().isISO8601().withMessage('Invalid date format')
], validate, companiesController.getCompanies);

/**
 * @swagger
 * /api/companies:
 *   post:
 *     tags:
 *       - Companies
 *     summary: Create new company
 *     description: Add a new company to the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyCreate'
 *     responses:
 *       201:
 *         description: Company created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Company created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Company with this name already exists
 */
router.post('/', [
  body('name').notEmpty().trim().withMessage('Company name is required'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address too long')
], validate, companiesController.createCompany);

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     tags:
 *       - Companies
 *     summary: Get company details
 *     description: Retrieve detailed information about a specific company
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Company UUID
 *     responses:
 *       200:
 *         description: Company details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       404:
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Valid company ID required')
], validate, companiesController.getCompanyById);

/**
 * @swagger
 * /api/companies/{id}:
 *   patch:
 *     tags:
 *       - Companies
 *     summary: Update company
 *     description: Update company information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Company UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyUpdate'
 *     responses:
 *       200:
 *         description: Company updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Company updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       404:
 *         description: Company not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id', [
  param('id').isUUID().withMessage('Valid company ID required'),
  body('name').optional().notEmpty().trim().withMessage('Company name cannot be empty'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address too long')
], validate, companiesController.updateCompany);

/**
 * @swagger
 * /api/companies/{id}:
 *   delete:
 *     tags:
 *       - Companies
 *     summary: Delete company
 *     description: Delete a company from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Company UUID
 *     responses:
 *       200:
 *         description: Company deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Company deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: boolean
 *                       example: true
 *       404:
 *         description: Company not found
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('Valid company ID required')
], validate, companiesController.deleteCompany);

/**
 * @swagger
 * /api/companies/stats:
 *   get:
 *     tags:
 *       - Companies
 *     summary: Get company statistics
 *     description: Retrieve company statistics and metrics
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total_companies:
 *                           type: integer
 *                         new_this_month:
 *                           type: integer
 *                         new_this_week:
 *                           type: integer
 *                         avg_contacts_per_company:
 *                           type: number
 *                         avg_revenue_per_company:
 *                           type: number
 */
router.get('/stats', companiesController.getCompanyStats);

export default router;