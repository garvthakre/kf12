import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { interactionsController } from '../controllers/interactionsController.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Interaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         lead_id:
 *           type: string
 *           format: uuid
 *         contact_id:
 *           type: string
 *           format: uuid
 *         channel:
 *           type: string
 *           enum: [chat, email, sms, whatsapp, call, meeting, note]
 *           example: email
 *         direction:
 *           type: string
 *           enum: [in, out]
 *           example: out
 *         subject:
 *           type: string
 *           example: Follow-up on your inquiry
 *         body:
 *           type: string
 *           example: Thank you for your interest in our premium package
 *         meta:
 *           type: object
 *           example: { duration: 30, outcome: "positive" }
 *         occurred_at:
 *           type: string
 *           format: date-time
 *         created_by:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *     
 *     InteractionWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/Interaction'
 *         - type: object
 *           properties:
 *             lead_title:
 *               type: string
 *               example: Premium client inquiry
 *             contact_name:
 *               type: string
 *               example: Jane Smith
 *             contact_email:
 *               type: string
 *               example: jane@example.com
 *             creator_name:
 *               type: string
 *               example: John Doe
 *             creator_email:
 *               type: string
 *               example: john@company.com
 *     
 *     CreateInteractionRequest:
 *       type: object
 *       required:
 *         - channel
 *         - body
 *       properties:
 *         lead_id:
 *           type: string
 *           format: uuid
 *         contact_id:
 *           type: string
 *           format: uuid
 *         channel:
 *           type: string
 *           enum: [chat, email, sms, whatsapp, call, meeting, note]
 *           example: email
 *         direction:
 *           type: string
 *           enum: [in, out]
 *           default: out
 *         subject:
 *           type: string
 *           example: Follow-up on your inquiry
 *         body:
 *           type: string
 *           example: Thank you for your interest in our services
 *         meta:
 *           type: object
 *           example: { duration: 30, outcome: "positive" }
 *         occurred_at:
 *           type: string
 *           format: date-time
 *           example: "2024-09-15T14:30:00Z"
 */

/**
 * @swagger
 * /api/interactions:
 *   get:
 *     tags:
 *       - Interactions
 *     summary: List interactions with filters
 *     description: Retrieve communication logs with optional filtering by lead, contact, channel, and date
 *     parameters:
 *       - in: query
 *         name: lead_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by lead ID
 *       - in: query
 *         name: contact_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by contact ID
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [chat, email, sms, whatsapp, call, meeting, note]
 *         description: Filter by communication channel
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [in, out]
 *         description: Filter by communication direction
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter interactions from this date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter interactions until this date
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
 *     responses:
 *       200:
 *         description: Interactions retrieved successfully
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
 *                         interactions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/InteractionWithDetails'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Bad Request
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', authenticateToken, [
  query('lead_id').optional().isUUID(),
  query('contact_id').optional().isUUID(),
  query('channel').optional().isIn(['chat', 'email', 'sms', 'whatsapp', 'call', 'meeting', 'note']),
  query('direction').optional().isIn(['in', 'out']),
  query('date_from').optional().isDate(),
  query('date_to').optional().isDate(),
  query('page').optional().isInt({ min: 1 }).default(1),
  query('limit').optional().isInt({ min: 1, max: 100 }).default(20)
], validate, interactionsController.getInteractions);

/**
 * @swagger
 * /api/interactions:
 *   post:
 *     tags:
 *       - Interactions
 *     summary: Log a communication interaction
 *     description: Log an email, call, chat, or other communication with a lead or contact
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInteractionRequest'
 *           example:
 *             lead_id: "123e4567-e89b-12d3-a456-426614174000"
 *             contact_id: "456e7890-e89b-12d3-a456-426614174000"
 *             channel: "email"
 *             direction: "out"
 *             subject: "Follow-up on your premium package inquiry"
 *             body: "Hi Jane, Thank you for your interest in our premium package. I wanted to follow up on our conversation from yesterday's trade show..."
 *             meta: { 
 *               "template_used": "follow_up_template",
 *               "attachments": ["brochure.pdf"]
 *             }
 *             occurred_at: "2024-09-15T14:30:00Z"
 *     responses:
 *       201:
 *         description: Interaction logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Interaction logged successfully
 *                     data:
 *                       $ref: '#/components/schemas/Interaction'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', authenticateToken, [
  body('lead_id').optional().isUUID(),
  body('contact_id').optional().isUUID(),
  body('channel').notEmpty().isIn(['chat', 'email', 'sms', 'whatsapp', 'call', 'meeting', 'note']),
  body('direction').optional().isIn(['in', 'out']).default('out'),
  body('subject').optional().isString(),
  body('body').notEmpty().withMessage('Interaction body is required'),
  body('meta').optional().isObject(),
  body('occurred_at').optional().isISO8601()
], validate, interactionsController.createInteraction);

export default router;