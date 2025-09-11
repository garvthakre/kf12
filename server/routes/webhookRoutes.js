import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { webhookController } from '../controllers/webhookController.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     WebhookLeadCaptured:
 *       type: object
 *       required:
 *         - tenant_id
 *         - visitor
 *         - exhibition_id
 *         - join_id
 *         - scan_time
 *       properties:
 *         tenant_id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *           description: Tenant UUID
 *         visitor:
 *           type: object
 *           properties:
 *             first_name:
 *               type: string
 *               example: John
 *             last_name:
 *               type: string
 *               example: Doe
 *             email:
 *               type: string
 *               format: email
 *               example: john.doe@example.com
 *             phone:
 *               type: string
 *               example: +91-9876543210
 *             kf_visitor_id:
 *               type: integer
 *               example: 12345
 *             dob:
 *               type: string
 *               format: date
 *               example: 1990-01-01
 *         exhibition_id:
 *           type: integer
 *           example: 101
 *           description: Exhibition ID from FairEx
 *         join_id:
 *           type: integer
 *           example: 54321
 *           description: Join ID from FairEx
 *         scan_time:
 *           type: string
 *           format: date-time
 *           example: 2025-09-11T10:30:00Z
 *           description: When the visitor was scanned
 *         context:
 *           type: object
 *           properties:
 *             notes:
 *               type: string
 *               example: Interested in premium package
 *             booth_location:
 *               type: string
 *               example: Hall A, Booth 123
 *     
 *     WebhookResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Webhook processed successfully
 *         data:
 *           type: object
 *           properties:
 *             lead_id:
 *               type: string
 *               format: uuid
 *               example: 123e4567-e89b-12d3-a456-426614174000
 *             contact_id:
 *               type: string
 *               format: uuid
 *               example: 456e7890-e89b-12d3-a456-426614174000
 *             message:
 *               type: string
 *               example: Lead captured successfully
 */

/**
 * @swagger
 * /api/webhooks/fairex/lead-captured:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Capture lead from FairEx
 *     description: Process visitor scan data from KF-FairEx and create lead with contact
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookLeadCaptured'
 *     responses:
 *       200:
 *         description: Lead captured successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookResponse'
 *       401:
 *         description: Invalid signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Invalid signature
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Invalid tenant ID
 *       500:
 *         description: Webhook processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/fairex/lead-captured', [
  body('tenant_id').isUUID().withMessage('Valid tenant ID required'),
  body('visitor').isObject().withMessage('Visitor data required'),
  body('exhibition_id').isInt().withMessage('Valid exhibition ID required'),
  body('join_id').isInt().withMessage('Valid join ID required'),
  body('scan_time').isISO8601().withMessage('Valid scan time required')
], validate , webhookController.handleLeadCaptured);

export default router;