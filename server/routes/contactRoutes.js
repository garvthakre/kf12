import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { contactsController } from '../controllers/contactController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Contact:
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
 *         first_name:
 *           type: string
 *           example: John
 *         last_name:
 *           type: string
 *           example: Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john.doe@example.com
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *         dob:
 *           type: string
 *           format: date
 *           example: "1990-01-15"
 *         company_id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         company_name:
 *           type: string
 *           example: Acme Corp
 *         company_website:
 *           type: string
 *           example: https://acme.com
 *         kf_visitor_id:
 *           type: integer
 *           example: 12345
 *         source:
 *           type: string
 *           enum: [fairex, import, manual, api]
 *           example: manual
 *         lead_count:
 *           type: integer
 *           example: 3
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     ContactCreate:
 *       type: object
 *       properties:
 *         first_name:
 *           type: string
 *           example: John
 *           description: Contact's first name
 *         last_name:
 *           type: string
 *           example: Doe
 *           description: Contact's last name
 *         email:
 *           type: string
 *           format: email
 *           example: john.doe@example.com
 *           description: Contact's email address
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *           description: Contact's phone number
 *         dob:
 *           type: string
 *           format: date
 *           example: "1990-01-15"
 *           description: Date of birth
 *         company_id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *           description: Associated company ID
 *         source:
 *           type: string
 *           enum: [fairex, import, manual, api]
 *           example: manual
 *           description: Source of contact creation
 *       description: At least one of first_name, last_name, email, or phone is required
 *     
 *     ContactUpdate:
 *       type: object
 *       properties:
 *         first_name:
 *           type: string
 *           example: John
 *         last_name:
 *           type: string
 *           example: Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john.doe@example.com
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *         dob:
 *           type: string
 *           format: date
 *           example: "1990-01-15"
 *         company_id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *     
 *     ContactStats:
 *       type: object
 *       properties:
 *         source:
 *           type: string
 *           example: manual
 *         count:
 *           type: integer
 *           example: 150
 *         recent_count:
 *           type: integer
 *           example: 25
 *           description: Count of contacts created in last 30 days
 */

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     tags:
 *       - Contacts
 *     summary: Get contacts with filters
 *     description: Retrieve a list of contacts with optional filtering, searching, and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of contacts per page
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [fairex, import, manual, api]
 *         description: Filter by contact source
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by company ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, email, phone, or company name
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *         description: Field to sort by (e.g., created_at, first_name, email)
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Contacts retrieved successfully
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
 *                     contacts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Contact'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         pages:
 *                           type: integer
 *                           example: 8
 *       400:
 *         description: Bad request - Failed to fetch contacts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('source').optional().isIn(['fairex', 'import', 'manual', 'api']).withMessage('Invalid source'),
  query('company_id').optional().isUUID().withMessage('Company ID must be a valid UUID'),
  query('sort_order').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
], validate, contactsController.getContacts);

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     tags:
 *       - Contacts
 *     summary: Create new contact
 *     description: Create a new contact. At least one of first_name, last_name, email, or phone is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactCreate'
 *           example:
 *             first_name: John
 *             last_name: Doe
 *             email: john.doe@example.com
 *             phone: "+1234567890"
 *             company_id: "123e4567-e89b-12d3-a456-426614174000"
 *             source: manual
 *     responses:
 *       201:
 *         description: Contact created successfully
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
 *                   example: Contact created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Contact with this email already exists
 *               errors: [
 *                 {
 *                   "field": "email",
 *                   "message": "email must be unique"
 *                 }
 *               ]
 */
router.post('/', [
  body('first_name').optional().isString().trim().isLength({ max: 255 }).withMessage('First name must be a string with max 255 characters'),
  body('last_name').optional().isString().trim().isLength({ max: 255 }).withMessage('Last name must be a string with max 255 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('phone').optional().isString().trim().isLength({ max: 20 }).withMessage('Phone must be a string with max 20 characters'),
  body('dob').optional().isDate().withMessage('Date of birth must be a valid date'),
  body('company_id').optional().isUUID().withMessage('Company ID must be a valid UUID'),
  body('source').optional().isIn(['fairex', 'import', 'manual', 'api']).withMessage('Invalid source')
], validate, contactsController.createContact);

/**
 * @swagger
 * /api/contacts/{id}:
 *   get:
 *     tags:
 *       - Contacts
 *     summary: Get contact details
 *     description: Retrieve detailed information about a specific contact
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact details retrieved successfully
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
 *                   $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Contact not found
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Contact ID must be a valid UUID')
], validate, contactsController.getContactById);

/**
 * @swagger
 * /api/contacts/{id}:
 *   patch:
 *     tags:
 *       - Contacts
 *     summary: Update contact
 *     description: Update contact information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactUpdate'
 *           example:
 *             first_name: John
 *             last_name: Smith
 *             email: john.smith@example.com
 *     responses:
 *       200:
 *         description: Contact updated successfully
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
 *                   example: Contact updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', [
  param('id').isUUID().withMessage('Contact ID must be a valid UUID'),
  body('first_name').optional().isString().trim().isLength({ max: 255 }).withMessage('First name must be a string with max 255 characters'),
  body('last_name').optional().isString().trim().isLength({ max: 255 }).withMessage('Last name must be a string with max 255 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('phone').optional().isString().trim().isLength({ max: 20 }).withMessage('Phone must be a string with max 20 characters'),
  body('dob').optional().isDate().withMessage('Date of birth must be a valid date'),
  body('company_id').optional().isUUID().withMessage('Company ID must be a valid UUID')
], validate, contactsController.updateContact);

/**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     tags:
 *       - Contacts
 *     summary: Delete contact
 *     description: Delete a contact from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact deleted successfully
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
 *                   example: Contact deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: boolean
 *                       example: true
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to delete contact
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('Contact ID must be a valid UUID')
], validate, contactsController.deleteContact);

/**
 * @swagger
 * /api/contacts/stats:
 *   get:
 *     tags:
 *       - Contacts
 *     summary: Get contact statistics
 *     description: Retrieve contact statistics grouped by source
 *     responses:
 *       200:
 *         description: Contact statistics retrieved successfully
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
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ContactStats'
 *       500:
 *         description: Failed to fetch contact statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', contactsController.getContactStats);

export default router;