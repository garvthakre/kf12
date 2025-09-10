import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { authController } from '../controllers/authController.js';

const router = express.Router();

/**
 * POST /auth/token - Generate access token
 */
router.post('/token', [
  body('username').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required'),
  body('tenant_id').isUUID().withMessage('Valid tenant ID required')
], validate, authController.generateToken);

/**
 * GET /auth/me - Get current user info
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

export default router;