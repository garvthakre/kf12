import db from '../config/db.js';

/**
 * Pipeline Model
 * Handles database operations for the pipelines and pipeline_stages tables
 */
const PipelineModel = {
  /**
   * Create a new pipeline
   * @param {Object} pipelineData - Pipeline information
   * @returns {Promise<Object>} - Created pipeline
   */
  async create(pipelineData) {
    const { tenant_id, name } = pipelineData;

    const query = `
      INSERT INTO pipelines (id, tenant_id, name, is_default)
      VALUES (gen_random_uuid(), $1, $2, false)
      RETURNING *
    `;

    const values = [tenant_id, name];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Create a new stage for a pipeline
   * @param {string} pipelineId - Pipeline UUID
   * @param {Object} stageData - Stage information
   * @returns {Promise<Object>} - Created stage
   */
  async createStage(pipelineId, stageData) {
    const { tenant_id, name } = stageData;

    // Get the next position for this pipeline
    const positionQuery = `
      SELECT COALESCE(MAX(position), 0) + 1 as next_position
      FROM pipeline_stages
      WHERE pipeline_id = $1
    `;
    const { rows: positionRows } = await db.query(positionQuery, [pipelineId]);
    const nextPosition = positionRows[0].next_position;

    const query = `
      INSERT INTO pipeline_stages (id, tenant_id, pipeline_id, name, position, probability)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [tenant_id, pipelineId, name, nextPosition, 0]; // Default probability is 0
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Get all pipelines for a tenant
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Array>} - Array of pipelines with stages
   */
  async findAll(tenantId) {
    const query = `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ps.id,
              'name', ps.name,
              'position', ps.position,
              'probability', ps.probability
            ) ORDER BY ps.position
          ) FILTER (WHERE ps.id IS NOT NULL),
          '[]'::json
        ) as stages
      FROM pipelines p
      LEFT JOIN pipeline_stages ps ON p.id = ps.pipeline_id
      WHERE p.tenant_id = $1
      GROUP BY p.id
      ORDER BY p.is_default DESC, p.name ASC
    `;

    const { rows } = await db.query(query, [tenantId]);
    return rows;
  },

  /**
   * Get pipeline by ID
   * @param {string} pipelineId - Pipeline UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} - Pipeline with stages
   */
  async findById(pipelineId, tenantId) {
    const query = `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ps.id,
              'name', ps.name,
              'position', ps.position,
              'probability', ps.probability
            ) ORDER BY ps.position
          ) FILTER (WHERE ps.id IS NOT NULL),
          '[]'::json
        ) as stages
      FROM pipelines p
      LEFT JOIN pipeline_stages ps ON p.id = ps.pipeline_id
      WHERE p.id = $1 AND p.tenant_id = $2
      GROUP BY p.id
    `;

    const { rows } = await db.query(query, [pipelineId, tenantId]);
    return rows[0] || null;
  }
};

export default PipelineModel;