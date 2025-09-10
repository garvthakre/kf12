import db from '../config/db.js';

/**
 * Tag Model
 * Handles database operations for the tags table
 */
const TagModel = {
  /**
   * Create or get existing tag
   * @param {string} tenantId - Tenant UUID
   * @param {string} tagName - Tag name
   * @returns {Promise<Object>} - Tag object
   */
  async createOrGet(tenantId, tagName) {
    const query = `
      INSERT INTO tags (id, tenant_id, name)
      VALUES (gen_random_uuid(), $1, $2)
      ON CONFLICT (tenant_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `;
    
    const { rows } = await db.query(query, [tenantId, tagName.trim()]);
    return rows[0];
  },

  /**
   * Get all tags for tenant
   * @param {string} tenantId - Tenant UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of tags
   */
  async findAll(tenantId, filters = {}) {
    let query = `
      SELECT 
        t.*,
        COUNT(lt.lead_id) as lead_count
      FROM tags t
      LEFT JOIN lead_tags lt ON t.id = lt.tag_id
      WHERE t.tenant_id = $1
    `;
    
    const queryParams = [tenantId];
    let paramIndex = 2;

    // Add search filter
    if (filters.search) {
      query += ` AND t.name ILIKE ${paramIndex}`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ' GROUP BY t.id';

    // Add sorting
    if (filters.sort_by) {
      const sortField = filters.sort_by.replace(/[^a-zA-Z0-9_.]/g, '');
      const sortOrder = filters.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      query += ' ORDER BY lead_count DESC, t.name ASC';
    }

    const { rows } = await db.query(query, queryParams);
    return rows;
  },

  /**
   * Link tag to lead
   * @param {string} leadId - Lead UUID
   * @param {string} tagId - Tag UUID
   * @returns {Promise<void>}
   */
  async linkToLead(leadId, tagId) {
    const query = `
      INSERT INTO lead_tags (lead_id, tag_id)
      VALUES ($1, $2)
      ON CONFLICT (lead_id, tag_id) DO NOTHING
    `;
    
    await db.query(query, [leadId, tagId]);
  },

  /**
   * Remove tag from lead
   * @param {string} leadId - Lead UUID
   * @param {string} tagName - Tag name
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<boolean>} - Success status
   */
  async removeFromLead(leadId, tagName, tenantId) {
    const query = `
      DELETE FROM lead_tags 
      WHERE lead_id = $1 AND tag_id = (
        SELECT t.id FROM tags t 
        WHERE t.name = $2 AND t.tenant_id = $3
      )
    `;

    const { rowCount } = await db.query(query, [leadId, tagName, tenantId]);
    return rowCount > 0;
  },

  /**
   * Create new tag
   * @param {string} tenantId - Tenant UUID
   * @param {string} tagName - Tag name
   * @returns {Promise<Object>} - New tag object
   */
  async create(tenantId, tagName) {
    const query = `
      INSERT INTO tags (id, tenant_id, name)
      VALUES (gen_random_uuid(), $1, $2)
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [tenantId, tagName.trim()]);
    return rows[0];
  },

  /**
   * Find tag by ID
   * @param {string} tagId - Tag UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} - Tag object
   */
  async findById(tagId, tenantId) {
    const query = `
      SELECT t.*, COUNT(lt.lead_id) as lead_count
      FROM tags t
      LEFT JOIN lead_tags lt ON t.id = lt.tag_id
      WHERE t.id = $1 AND t.tenant_id = $2
      GROUP BY t.id
    `;
    
    const { rows } = await db.query(query, [tagId, tenantId]);
    return rows[0] || null;
  },

  /**
   * Update tag
   * @param {string} tagId - Tag UUID
   * @param {string} tenantId - Tenant UUID
   * @param {Object} tagData - Tag data to update
   * @returns {Promise<Object>} - Updated tag object
   */
  async update(tagId, tenantId, tagData) {
    const { name } = tagData;

    const query = `
      UPDATE tags
      SET name = COALESCE($1, name)
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `;

    const { rows } = await db.query(query, [name, tagId, tenantId]);
    return rows[0];
  },

  /**
   * Delete a tag
   * @param {string} tagId - Tag UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<boolean>} - Success status
   */
  async delete(tagId, tenantId) {
    const query = 'DELETE FROM tags WHERE id = $1 AND tenant_id = $2';
    const { rowCount } = await db.query(query, [tagId, tenantId]);
    return rowCount > 0;
  },

  /**
   * Get popular tags
   * @param {string} tenantId - Tenant UUID
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Array of popular tags
   */
  async getPopularTags(tenantId, limit = 10) {
    const query = `
      SELECT 
        t.*,
        COUNT(lt.lead_id) as usage_count
      FROM tags t
      LEFT JOIN lead_tags lt ON t.id = lt.tag_id
      WHERE t.tenant_id = $1
      GROUP BY t.id
      HAVING COUNT(lt.lead_id) > 0
      ORDER BY usage_count DESC, t.name ASC
      LIMIT $2
    `;
    
    const { rows } = await db.query(query, [tenantId, limit]);
    return rows;
  }
};

export default TagModel;