import { sendError, sendSuccess } from '../utils/response.js';
import OpportunityModel from '../models/Opportunity.js';

export const opportunityController = {
  /**
   * Get all opportunities with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOpportunities(req, res) {
    try {
      const tenant_id = req.user.tenant_id;
      const filters = {
        status: req.query.status,
        close_before: req.query.close_before,
        close_after: req.query.close_after,
        pipeline_id: req.query.pipeline_id,
        stage_id: req.query.stage_id,
        q: req.query.q,
        limit: req.query.limit,
        offset: req.query.offset
      };

      const opportunities = await OpportunityModel.findAll(tenant_id, filters);
      sendSuccess(res, 200, opportunities);
    } catch (error) {
      console.error('Get opportunities error:', error);
      sendError(res, 400, 'Failed to fetch opportunities');
    }
  },

  /**
   * Create a new opportunity
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createOpportunity(req, res) {
    try {
      const {
        name,
        lead_id,
        contact_id,
        company_id,
        pipeline_id,
        stage_id,
        amount,
        currency,
        close_date
      } = req.body;
      
      const tenant_id = req.user.tenant_id;

      const opportunity = await OpportunityModel.create({
        tenant_id,
        name,
        lead_id,
        contact_id,
        company_id,
        pipeline_id,
        stage_id,
        amount,
        currency,
        close_date
      });

      sendSuccess(res, 201, opportunity, 'Opportunity created successfully');
    } catch (error) {
      console.error('Create opportunity error:', error);
      sendError(res, 422, 'Failed to create opportunity');
    }
  },

  /**
   * Update an opportunity
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateOpportunity(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.user.tenant_id;
      
      // Check if opportunity exists
      const existingOpportunity = await OpportunityModel.findById(id, tenant_id);
      if (!existingOpportunity) {
        return sendError(res, 404, 'Opportunity not found');
      }

      const updateData = {
        stage_id: req.body.stage,
        status: req.body.status,
        amount: req.body.amount,
        currency: req.body.currency,
        close_date: req.body.close_date,
        name: req.body.name
      };

      const updatedOpportunity = await OpportunityModel.update(id, tenant_id, updateData);
      sendSuccess(res, 200, updatedOpportunity, 'Opportunity updated successfully');
    } catch (error) {
      console.error('Update opportunity error:', error);
      sendError(res, 404, 'Failed to update opportunity');
    }
  }
};