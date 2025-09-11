import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { leadsController } from '../controllers/leadsController.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Contact:
 *       type: object
 *       properties:
 *         first_name:
 *           type: string
 *           example: Jane
 *         last_name:
 *           type: string
 *           example: Smith
 *         email:
 *           type: string
 *           format: email
 *           example: jane.smith@example.com
 *         phone:
 *           type: string
 *           example: "+1-555-0123"
 *         company_id:
 *           type: string
 *           format: uuid
 *         dob:
 *           type: string
 *           format: date
 *     
 *     Lead:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         title:
 *           type: string
 *           example: Potential client from trade show
 *         status:
 *           type: string
 *           enum: [new, working, qualified, unqualified, converted]
 *           example: new
 *         stage:
 *           type: string
 *           enum: [lead, mql, sql]
 *           example: lead
 *         score:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           example: 75
 *         source:
 *           type: string
 *           enum: [fairex, ads, import, referral, manual]
 *           example: fairex
 *         exhibition_id:
 *           type: integer
 *           example: 123
 *         owner_user_id:
 *           type: string
 *           format: uuid
 *         contact_id:
 *           type: string
 *           format: uuid
 *         utm_source:
 *           type: string
 *           example: google
 *         utm_medium:
 *           type: string
 *           example: cpc
 *         utm_campaign:
 *           type: string
 *           example: summer_campaign
 *         notes:
 *           type: string
 *           example: Very interested in our premium package
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     LeadWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/Lead'
 *         - type: object
 *           properties:
 *             first_name:
 *               type: string
 *               example: Jane
 *             last_name:
 *               type: string
 *               example: Smith
 *             email:
 *               type: string
 *               example: jane.smith@example.com
 *             phone:
 *               type: string
 *               example: "+1-555-0123"
 *             dob:
 *               type: string
 *               format: date
 *             company_name:
 *               type: string
 *               example: Acme Corp
 *             company_website:
 *               type: string
 *               example: https://acme.com
 *             owner_name:
 *               type: string
 *               example: John Doe
 *             owner_email:
 *               type: string
 *               example: john@company.com
 *             tags:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 *     
 *     CreateLeadRequest:
 *       type: object
 *       required:
 *         - contact
 *       properties:
 *         contact:
 *           $ref: '#/components/schemas/Contact'
 *         title:
 *           type: string
 *           example: New lead from website
 *         status:
 *           type: string
 *           enum: [new, working, qualified, unqualified, converted]
 *           default: new
 *         stage:
 *           type: string
 *           enum: [lead, mql, sql]
 *           default: lead
 *         score:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           default: 0
 *         source:
 *           type: string
 *           enum: [fairex, ads, import, referral, manual]
 *           default: manual
 *         exhibition_id:
 *           type: integer
 *         join_id:
 *           type: integer
 *         utm_source:
 *           type: string
 *         utm_medium:
 *           type: string
 *         utm_campaign:
 *           type: string
 *         notes:
 *           type: string
 *     
 *     Tag:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: hot-lead
 *     
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
 *         total:
 *           type: integer
 *           example: 150
 *         pages:
 *           type: integer
 *           example: 8
 *     
 *     LeadStats:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: new
 *         stage:
 *           type: string
 *           example: lead
 *         count:
 *           type: integer
 *           example: 45
 *         avg_score:
 *           type: number
 *           example: 65.5
 *         recent_count:
 *           type: integer
 *           example: 12
 *     
 *     LeaderboardEntry:
 *       type: object
 *       properties:
 *         owner_name:
 *           type: string
 *           example: John Doe
 *         owner_email:
 *           type: string
 *           example: john@company.com
 *         total_leads:
 *           type: integer
 *           example: 150
 *         converted_leads:
 *           type: integer
 *           example: 45
 *         avg_score:
 *           type: number
 *           example: 78.5
 *         conversion_rate:
 *           type: number
 *           example: 30.00
 *     
 *     SuccessResponse:
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
 */

/**
 * @swagger
 * /api/leads:
 *   get:
 *     tags:
 *       - Leads
 *     summary: List leads with filters and pagination
 *     description: Retrieve leads with optional filtering, searching, sorting, and pagination
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, working, qualified, unqualified, converted]
 *         description: Filter by lead status
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [lead, mql, sql]
 *         description: Filter by lead stage
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by lead owner (user ID)
 *       - in: query
 *         name: exhibition_id
 *         schema:
 *           type: integer
 *         description: Filter by exhibition ID
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search in title, contact name, or email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, score]
 *           default: created_at
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Leads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         leads:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/LeadWithDetails'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', authenticateToken, [
  query('status').optional().isIn(['new', 'working', 'qualified', 'unqualified', 'converted']),
  query('stage').optional().isIn(['lead', 'mql', 'sql']),
  query('owner').optional().isUUID(),
  query('exhibition_id').optional().isNumeric(),
  query('page').optional().isInt({ min: 1 }).default(1),
  query('limit').optional().isInt({ min: 1, max: 100 }).default(20),
  query('sort').optional().isIn(['created_at', 'updated_at', 'score']),
  query('order').optional().isIn(['asc', 'desc']).default('desc')
], validate, leadsController.getLeads);

/**
 * @swagger
 * /api/leads:
 *   post:
 *     tags:
 *       - Leads
 *     summary: Create a new lead
 *     description: Create a new lead with contact information. If contact exists, it will be linked; otherwise, a new contact will be created.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLeadRequest'
 *           example:
 *             contact:
 *               first_name: "Jane"
 *               last_name: "Smith"
 *               email: "jane.smith@example.com"
 *               phone: "+1-555-0123"
 *             title: "Interested in premium package"
 *             status: "new"
 *             stage: "lead"
 *             score: 75
 *             source: "fairex"
 *             exhibition_id: 123
 *             utm_source: "google"
 *             utm_medium: "cpc"
 *             utm_campaign: "summer_2024"
 *             notes: "Met at trade show, very interested in our services"
 *     responses:
 *       201:
 *         description: Lead created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Lead created successfully
 *                     data:
 *                       $ref: '#/components/schemas/LeadWithDetails'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', authenticateToken, [
  body('contact').isObject().withMessage('Contact object required'),
  body('contact.first_name').optional().isString(),
  body('contact.last_name').optional().isString(),
  body('contact.email').optional().isEmail(),
  body('contact.phone').optional().isString(),
  body('contact.company_id').optional().isUUID(),
  body('title').optional().isString(),
  body('status').optional().isIn(['new', 'working', 'qualified', 'unqualified', 'converted']),
  body('stage').optional().isIn(['lead', 'mql', 'sql']),
  body('score').optional().isInt({ min: 0, max: 100 }),
  body('source').optional().isIn(['fairex', 'ads', 'import', 'referral', 'manual']),
  body('exhibition_id').optional().isNumeric(),
  body('join_id').optional().isNumeric(),
  body('utm_source').optional().isString(),
  body('utm_medium').optional().isString(),
  body('utm_campaign').optional().isString(),
  body('notes').optional().isString()
], validate, leadsController.createLead);

/**
 * @swagger
 * /api/leads/stats:
 *   get:
 *     tags:
 *       - Leads
 *       - Analytics
 *     summary: Get lead statistics
 *     description: Retrieve lead statistics by status and stage for business intelligence
 *     responses:
 *       200:
 *         description: Lead statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         stats:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/LeadStats'
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 stats:
 *                   - status: "new"
 *                     stage: "lead"
 *                     count: 45
 *                     avg_score: 65.5
 *                     recent_count: 12
 *                   - status: "working"
 *                     stage: "mql"
 *                     count: 32
 *                     avg_score: 78.2
 *                     recent_count: 8
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/stats', authenticateToken, leadsController.getLeadStats);

/**
 * @swagger
 * /api/leads/leaderboard:
 *   get:
 *     tags:
 *       - Leads
 *       - Analytics
 *     summary: Get performance leaderboard
 *     description: Retrieve performance leaderboard for team members
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top performers to return
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         leaderboard:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/LeaderboardEntry'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/leaderboard', authenticateToken, leadsController.getLeaderboard);

/**
 * @swagger
 * /api/leads/{id}:
 *   get:
 *     tags:
 *       - Leads
 *     summary: Get lead details
 *     description: Retrieve detailed information about a specific lead including contact, company, owner, and tags
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/LeadWithDetails'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Valid lead ID required')
], validate, leadsController.getLeadById);

/**
 * @swagger
 * /api/leads/{id}:
 *   patch:
 *     tags:
 *       - Leads
 *     summary: Update lead
 *     description: Update lead information with partial data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               owner_user_id:
 *                 type: string
 *                 format: uuid
 *               status:
 *                 type: string
 *                 enum: [new, working, qualified, unqualified, converted]
 *               stage:
 *                 type: string
 *                 enum: [lead, mql, sql]
 *               score:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               notes:
 *                 type: string
 *           example:
 *             status: "working"
 *             stage: "mql"
 *             score: 85
 *             notes: "Follow up scheduled for next week"
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Lead updated successfully
 *                     data:
 *                       $ref: '#/components/schemas/Lead'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Valid lead ID required'),
  body('owner_user_id').optional().isUUID(),
  body('status').optional().isIn(['new', 'working', 'qualified', 'unqualified', 'converted']),
  body('stage').optional().isIn(['lead', 'mql', 'sql']),
  body('score').optional().isInt({ min: 0, max: 100 }),
  body('notes').optional().isString()
], validate, leadsController.updateLead);

/**
 * @swagger
 * /api/leads/{id}:
 *   delete:
 *     tags:
 *       - Leads
 *     summary: Delete lead
 *     description: Permanently delete a lead from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Lead deleted successfully
 *                     data:
 *                       type: object
 *                       properties:
 *                         deleted:
 *                           type: boolean
 *                           example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Valid lead ID required')
], validate, leadsController.deleteLead);

/**
 * @swagger
 * /api/leads/{id}/tags:
 *   post:
 *     tags:
 *       - Leads
 *       - Tags
 *     summary: Add tags to lead
 *     description: Add one or more tags to a lead. Tags will be created if they don't exist.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tags
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 example: ["hot-lead", "premium-interest", "follow-up-needed"]
 *     responses:
 *       200:
 *         description: Tags added successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Tags added successfully
 *                     data:
 *                       type: object
 *                       properties:
 *                         tags:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Tag'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/:id/tags', authenticateToken, [
  param('id').isUUID().withMessage('Valid lead ID required'),
  body('tags').isArray({ min: 1 }).withMessage('Tags array required'),
  body('tags.*').isString().withMessage('Each tag must be a string')
], validate, leadsController.addTagsToLead);

/**
 * @swagger
 * /api/leads/{id}/tags/{tagName}:
 *   delete:
 *     tags:
 *       - Leads
 *       - Tags
 *     summary: Remove tag from lead
 *     description: Remove a specific tag from a lead
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *       - in: path
 *         name: tagName
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag name to remove
 *     responses:
 *       200:
 *         description: Tag removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Tag removed successfully
 *                     data:
 *                       type: object
 *                       properties:
 *                         removed:
 *                           type: string
 *                           example: "hot-lead"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:id/tags/:tagName', authenticateToken, [
  param('id').isUUID().withMessage('Valid lead ID required'),
  param('tagName').isString().withMessage('Tag name required')
], validate, leadsController.removeTagFromLead);

/**
 * @swagger
 * components:
 *   responses:
 *     UnauthorizedError:
 *       description: Unauthorized - Invalid or missing token
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: Access token required
 *     
 *     NotFoundError:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: Resource not found
 *     
 *     ValidationError:
 *       description: Validation error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: Validation error
 *               errors:
 *                 type: array
 *                 items:
 *                   type: object
 *     
 *     InternalServerError:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: Internal server error
 */

export default router;