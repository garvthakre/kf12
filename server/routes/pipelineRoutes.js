import express from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { pipelineController } from '../controllers/pipelineController.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Pipeline:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         is_default:
 *           type: boolean
 *         stages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PipelineStage'
 *     
 *     PipelineStage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         position:
 *           type: integer
 *         probability:
 *           type: integer
 */

/**
 * @swagger
 * /api/pipelines:
 *   post:
 *     tags:
 *       - Pipelines
 *     summary: Create sales pipeline
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Sales Pipeline"
 *     responses:
 *       201:
 *         description: Pipeline created successfully
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
 *                   $ref: '#/components/schemas/Pipeline'
 *       422:
 *         description: Validation error
 */
router.post('/', [
  body('name')
    .notEmpty()
    .withMessage('Pipeline name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters')
], validate, authenticateToken, pipelineController.createPipeline);

/**
 * @swagger
 * /api/pipelines/{id}/stages:
 *   post:
 *     tags:
 *       - Pipelines
 *     summary: Add stage in pipeline
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Pipeline ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Qualification"
 *     responses:
 *       201:
 *         description: Stage created successfully
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
 *                   $ref: '#/components/schemas/PipelineStage'
 *       404:
 *         description: Pipeline not found
 *       422:
 *         description: Validation error
 */
router.post('/:id/stages', [
  param('id').isUUID().withMessage('Valid pipeline ID required'),
  body('name')
    .notEmpty()
    .withMessage('Stage name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters')
], validate, authenticateToken, pipelineController.createStage);

export default router;