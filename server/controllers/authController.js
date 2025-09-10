import jwt from 'jsonwebtoken';
import { sendError, sendSuccess } from '../utils/response.js';
import UserModel from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authController = {
  /**
   * Generate access token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateToken(req, res) {
    try {
      const { username, password, tenant_id } = req.body;

      // Find user
      const user = await UserModel.findByEmailAndTenant(username, tenant_id);

      if (!user) {
        return sendError(res, 401, 'Invalid credentials');
      }

      // For demo purposes, assuming password validation
      // In production, use bcrypt.compare(password, user.password_hash)

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          tenantId: user.tenant_id,
          email: user.email,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      sendSuccess(res, 200, {
        access_token: token,
        expires_in: 86400, // 24 hours in seconds
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenant: user.tenant_name
        }
      }, 'Authentication successful');

    } catch (error) {
      console.error('Auth error:', error);
      sendError(res, 500, 'Authentication failed');
    }
  },

  /**
   * Get current user info
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCurrentUser(req, res) {
    try {
      const user = await UserModel.findByIdWithTenant(req.user.id);
      
      if (!user) {
        return sendError(res, 404, 'User not found');
      }

      sendSuccess(res, 200, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: user.tenant_name,
        created_at: user.created_at
      });

    } catch (error) {
      console.error('Get current user error:', error);
      sendError(res, 500, 'Failed to get user info');
    }
  }
};