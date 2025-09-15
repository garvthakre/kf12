import { sendError, sendSuccess } from '../utils/response.js';
import PipelineModel from '../models/Pipeline.js';

export const pipelineController = {
  /**
   * Create a new pipeline
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createPipeline(req, res) {
    try {
      const { name } = req.body;
      const tenant_id = req.user.tenant_id;

      const pipeline = await PipelineModel.create({
        tenant_id,
        name
      });

      sendSuccess(res, 201, pipeline, 'Pipeline created successfully');
    } catch (error) {
      console.error('Create pipeline error:', error);
      sendError(res, 500, 'Failed to create pipeline');
    }
  },

  /**
   * Create a new stage for a pipeline
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createStage(req, res) {
    try {
      const { id: pipelineId } = req.params;
      const { name } = req.body;
      const tenant_id = req.user.tenant_id;

      // Verify pipeline exists and belongs to tenant
      const pipeline = await PipelineModel.findById(pipelineId, tenant_id);
      if (!pipeline) {
        return sendError(res, 404, 'Pipeline not found');
      }

      const stage = await PipelineModel.createStage(pipelineId, {
        tenant_id,
        name
      });

      sendSuccess(res, 201, stage, 'Stage created successfully');
    } catch (error) {
      console.error('Create stage error:', error);
      sendError(res, 500, 'Failed to create stage');
    }
  }
};