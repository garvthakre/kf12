import { sendError, sendSuccess } from '../utils/response.js';
import InteractionModel from '../models/Interaction.js';
import db from '../config/db.js';
import format from "pg-format";

export const interactionsController = {
  /**
   * Get interactions with filters and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getInteractions(req, res) {
    try {
      const filters = req.query;
      const { interactions, totalCount } = await InteractionModel.getInteractionsWithFilters(req.user.tenant_id, filters);
      
      const page = parseInt(filters.page || 1);
      const limit = parseInt(filters.limit || 20);

      sendSuccess(res, 200, {
        interactions,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      console.error('Get interactions error:', error);
      sendError(res, 400, 'Failed to fetch interactions');
    }
  },

  /**
   * Create new interaction (log communication)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createInteraction(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      const setTenantSQL = format("SET LOCAL app.tenant_id = %L", req.user.tenant_id);
      await client.query(setTenantSQL);

      const interactionData = req.body;

      // Create interaction
      const interaction = await InteractionModel.create(req.user.tenant_id, {
        ...interactionData,
        created_by: req.user.id,
        occurred_at: interactionData.occurred_at || new Date()
      });

      await client.query('COMMIT');

      sendSuccess(res, 201, interaction, 'Interaction logged successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create interaction error:', error);
      sendError(res, 422, 'Failed to log interaction');
    } finally {
      client.release();
    }
  }
};