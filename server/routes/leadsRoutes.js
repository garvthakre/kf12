import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { leadsController } from '../controllers/leadsController.js';

const router = express.Router();

/**
 * GET /leads - List leads with filters
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
 * POST /leads - Create a new lead
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
 * GET /leads/stats - Get lead statistics
 */
router.get('/stats', authenticateToken, leadsController.getLeadStats);

/**
 * GET /leads/leaderboard - Get leaderboard
 */
router.get('/leaderboard', authenticateToken, leadsController.getLeaderboard);

/**
 * GET /leads/:id - Get lead details
 */
router.get('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Valid lead ID required')
], validate, leadsController.getLeadById);

/**
 * PATCH /leads/:id - Update lead
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
 * DELETE /leads/:id - Delete lead
 */
router.delete('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Valid lead ID required')
], validate, leadsController.deleteLead);

/**
 * POST /leads/:id/tags - Tag a lead
 */
router.post('/:id/tags', authenticateToken, [
  param('id').isUUID().withMessage('Valid lead ID required'),
  body('tags').isArray({ min: 1 }).withMessage('Tags array required'),
  body('tags.*').isString().withMessage('Each tag must be a string')
], validate, leadsController.addTagsToLead);

/**
 * DELETE /leads/:id/tags/:tagName - Remove a tag from lead
 */
router.delete('/:id/tags/:tagName', authenticateToken, [
  param('id').isUUID().withMessage('Valid lead ID required'),
  param('tagName').isString().withMessage('Tag name required')
], validate, leadsController.removeTagFromLead);

export default router;