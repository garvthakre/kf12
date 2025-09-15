import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { opportunityController } from '../controllers/opportunityController.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Opportunity:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         amount:
 *           type: number
 *           format: decimal
 *         currency:
 *           type: string
 *           default: "INR"
 *         status:
 *           type: string
 *           enum: [open, won, lost, abandoned]
 *         close_date:
 *           type: string
 *           format: date
 *         contact_name:
 *           type: string
 *         company_name:
 *           type: string
 *         pipeline_name:
 *           type: string
 *         stage_name:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/opportunities:
 *   get:
 *     tags:
 *       - Opportunities
 *     summary: List opportunities
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, won, lost, abandoned]
 *         description: Filter by status
 *       - in: query
 *         name: close_before
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by close date before
 *       - in: query
 *         name: close_after
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by close date after
 *       - in: query
 *         name: pipeline_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by pipeline
 *       - in: query
 *         name: stage_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by stage
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Opportunities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Opportunity'
 *       400:
 *         description: Bad request
 */
router.get('/', authenticateToken, opportunityController.getOpportunities);

/**
 * @swagger
 * /api/opportunities:
 *   post:
 *     tags:
 *       - Opportunities
 *     summary: Create deal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - pipeline_id
 *               - stage_id
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Website Redesign Project"
 *               lead_id:
 *                 type: string
 *                 format: uuid
 *               contact_id:
 *                 type: string
 *                 format: uuid
 *               company_id:
 *                 type: string
 *                 format: uuid
 *               pipeline_id:
 *                 type: string
 *                 format: uuid
 *               stage_id:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 example: 50000.00
 *               currency:
 *                 type: string
 *                 default: "INR"
 *               close_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *     responses:
 *       201:
 *         description: Opportunity created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Opportunity'
 *       422:
 *         description: Validation error
 */
router.post('/', [
  body('name')
    .notEmpty()
    .withMessage('Opportunity name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('lead_id').optional().isUUID().withMessage('Valid lead ID required'),
  body('contact_id').optional().isUUID().withMessage('Valid contact ID required'),
  body('company_id').optional().isUUID().withMessage('Valid company ID required'),
  body('pipeline_id').isUUID().withMessage('Valid pipeline ID required'),
  body('stage_id').isUUID().withMessage('Valid stage ID required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('close_date').optional().isDate().withMessage('Valid close date required')
], validate, authenticateToken, opportunityController.createOpportunity);

/**
 * @swagger
 * /api/opportunities/{id}:
 *   patch:
 *     tags:
 *       - Opportunities
 *     summary: Update opportunity
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Opportunity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stage:
 *                 type: string
 *                 format: uuid
 *                 description: Stage ID
 *               status:
 *                 type: string
 *                 enum: [open, won, lost, abandoned]
 *               amount:
 *                 type: number
 *                 format: decimal
 *               currency:
 *                 type: string
 *               close_date:
 *                 type: string
 *                 format: date
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Opportunity updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Opportunity'
 *       404:
 *         description: Opportunity not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id', [
  param('id').isUUID().withMessage('Valid opportunity ID required'),
  body('stage').optional().isUUID().withMessage('Valid stage ID required'),
  body('status').optional().isIn(['open', 'won', 'lost', 'abandoned']).withMessage('Invalid status'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('close_date').optional().isDate().withMessage('Valid close date required'),
  body('name').optional().isLength({ min: 1, max: 255 }).withMessage('Name must be between 1 and 255 characters')
], validate, authenticateToken, opportunityController.updateOpportunity);

export default router;