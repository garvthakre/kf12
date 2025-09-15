import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { tasksController } from '../controllers/tasksController.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         title:
 *           type: string
 *           example: Follow up with client
 *         status:
 *           type: string
 *           enum: [open, in_progress, done, canceled]
 *           example: open
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           example: normal
 *         lead_id:
 *           type: string
 *           format: uuid
 *         contact_id:
 *           type: string
 *           format: uuid
 *         assigned_to:
 *           type: string
 *           format: uuid
 *         due_at:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T10:00:00Z"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     TaskWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/Task'
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
 *             assignee_name:
 *               type: string
 *               example: John Doe
 *             assignee_email:
 *               type: string
 *               example: john@company.com
 *     
 *     CreateTaskRequest:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           example: Call client for follow-up
 *         lead_id:
 *           type: string
 *           format: uuid
 *         contact_id:
 *           type: string
 *           format: uuid
 *         assigned_to:
 *           type: string
 *           format: uuid
 *         due_at:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T10:00:00Z"
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           default: normal
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: List tasks with filters
 *     description: Retrieve tasks with optional filtering by status, assignee, and due dates
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, done, canceled]
 *         description: Filter by task status
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: due_before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tasks due before this date
 *       - in: query
 *         name: due_after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tasks due after this date
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *         description: Filter by task priority
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
 *         description: Tasks retrieved successfully
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
 *                         tasks:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TaskWithDetails'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Bad Request
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', authenticateToken, [
  query('status').optional().isIn(['open', 'in_progress', 'done', 'canceled']),
  query('assigned_to').optional().isUUID(),
  query('due_before').optional().isISO8601(),
  query('due_after').optional().isISO8601(),
  query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  query('page').optional().isInt({ min: 1 }).default(1),
  query('limit').optional().isInt({ min: 1, max: 100 }).default(20)
], validate, tasksController.getTasks);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Create a new task
 *     description: Create a new task and assign it to a team member
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *           example:
 *             title: "Follow up with premium client"
 *             lead_id: "123e4567-e89b-12d3-a456-426614174000"
 *             assigned_to: "456e7890-e89b-12d3-a456-426614174000"
 *             due_at: "2024-12-01T10:00:00Z"
 *             priority: "high"
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Task created successfully
 *                     data:
 *                       $ref: '#/components/schemas/Task'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/', authenticateToken, [
  body('title').notEmpty().withMessage('Task title is required'),
  body('lead_id').optional().isUUID(),
  body('contact_id').optional().isUUID(),
  body('assigned_to').optional().isUUID(),
  body('due_at').optional().isISO8601(),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
], validate, tasksController.createTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Update task status
 *     description: Update task status (typically to mark as done)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, done, canceled]
 *           example:
 *             status: "done"
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Task updated successfully
 *                     data:
 *                       $ref: '#/components/schemas/Task'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.patch('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Valid task ID required'),
  body('status').notEmpty().isIn(['open', 'in_progress', 'done', 'canceled'])
], validate, tasksController.updateTaskStatus);

export default router;