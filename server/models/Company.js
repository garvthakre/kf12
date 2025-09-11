import db from '../config/db.js';

/**
 * Company Model
 * Handles database operations for the companies table
 */
const CompanyModel = {
  /**
   * Find company by name
   * @param {string} tenantId - Tenant UUID
   * @param {string} name - Company name
   * @returns {Promise<Object>} - Company object
   */
  async findByName(tenantId, name) {
    const query = `
      SELECT * FROM companies 
      WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)
      LIMIT 1
    `;
    const { rows } = await db.query(query, [tenantId, name]);
    return rows[0] || null;
  },

  /**
   * Create new company
   * @param {string} tenantId - Tenant UUID
   * @param {Object} companyData - Company information
   * @returns {Promise<Object>} - New company object
   */
  async create(tenantId, companyData) {
    const { 
      name, 
      website, 
      phone, 
      address 
    } = companyData;
    
    const query = `
      INSERT INTO companies (id, tenant_id, name, website, phone, address)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      tenantId,
      name,
      website || null,
      phone || null,
      address || null
    ];
    
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Find company by ID
   * @param {string} companyId - Company UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} - Company object with stats
   */
  async findById(companyId, tenantId) {
    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT cont.id) as contact_count,
        COUNT(DISTINCT opp.id) as opportunity_count,
        COALESCE(SUM(CASE WHEN opp.status = 'won' THEN opp.amount ELSE 0 END), 0) as total_won_value
      FROM companies c
      LEFT JOIN contacts cont ON c.id = cont.company_id
      LEFT JOIN opportunities opp ON c.id = opp.company_id
      WHERE c.id = $1 AND c.tenant_id = $2
      GROUP BY c.id
    `;
    const { rows } = await db.query(query, [companyId, tenantId]);
    return rows[0] || null;
  },

  /**
   * Get all companies with pagination and filters
   * @param {string} tenantId - Tenant UUID
   * @param {number} limit - Number of results per page
   * @param {number} offset - Pagination offset
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of companies
   */
  async findAll(tenantId, limit = 20, offset = 0, filters = {}) {
    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT cont.id) as contact_count,
        COUNT(DISTINCT opp.id) as opportunity_count,
        COALESCE(SUM(CASE WHEN opp.status = 'won' THEN opp.amount ELSE 0 END), 0) as total_won_value,
        MAX(cont.created_at) as last_contact_date
      FROM companies c
      LEFT JOIN contacts cont ON c.id = cont.company_id
      LEFT JOIN opportunities opp ON c.id = opp.company_id
      WHERE c.tenant_id = $1
    `;
    
    const queryParams = [tenantId];
    let paramIndex = 2;

    // Add search filter
    if (filters.search) {
      query += ` AND (
        c.name ILIKE $${paramIndex} OR
        c.website ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex} OR
        c.address ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Add date range filter
    if (filters.created_after) {
      query += ` AND c.created_at >= $${paramIndex}`;
      queryParams.push(filters.created_after);
      paramIndex++;
    }

    if (filters.created_before) {
      query += ` AND c.created_at <= $${paramIndex}`;
      queryParams.push(filters.created_before);
      paramIndex++;
    }

    query += ' GROUP BY c.id';

    // Add sorting
    if (filters.sort_by) {
      const sortField = filters.sort_by.replace(/[^a-zA-Z0-9_.]/g, '');
      const sortOrder = filters.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      // Handle aggregate columns
      if (sortField === 'contact_count') {
        query += ` ORDER BY COUNT(DISTINCT cont.id) ${sortOrder}`;
      } else if (sortField === 'opportunity_count') {
        query += ` ORDER BY COUNT(DISTINCT opp.id) ${sortOrder}`;
      } else if (sortField === 'total_won_value') {
        query += ` ORDER BY COALESCE(SUM(CASE WHEN opp.status = 'won' THEN opp.amount ELSE 0 END), 0) ${sortOrder}`;
      } else {
        query += ` ORDER BY c.${sortField} ${sortOrder}`;
      }
    } else {
      query += ' ORDER BY c.created_at DESC';
    }

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const { rows } = await db.query(query, queryParams);
    return rows;
  },

  /**
   * Update company information
   * @param {string} companyId - Company UUID
   * @param {string} tenantId - Tenant UUID
   * @param {Object} companyData - Company data to update
   * @returns {Promise<Object>} - Updated company object
   */
  async update(companyId, tenantId, companyData) {
    const {
      name,
      website,
      phone,
      address
    } = companyData;

    const query = `
      UPDATE companies
      SET 
        name = COALESCE($1, name),
        website = COALESCE($2, website),
        phone = COALESCE($3, phone),
        address = COALESCE($4, address),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND tenant_id = $6
      RETURNING *
    `;

    const values = [
      name,
      website,
      phone,
      address,
      companyId,
      tenantId
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Delete a company
   * @param {string} companyId - Company UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<boolean>} - Success status
   */
  async delete(companyId, tenantId) {
    const query = 'DELETE FROM companies WHERE id = $1 AND tenant_id = $2';
    const { rowCount } = await db.query(query, [companyId, tenantId]);
    return rowCount > 0;
  },

  /**
   * Count total companies
   * @param {string} tenantId - Tenant UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} - Total company count
   */
  async countTotal(tenantId, filters = {}) {
    let query = 'SELECT COUNT(*) FROM companies c WHERE c.tenant_id = $1';
    const queryParams = [tenantId];
    let paramIndex = 2;

    // Add search filter
    if (filters.search) {
      query += ` AND (
        c.name ILIKE $${paramIndex} OR
        c.website ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex} OR
        c.address ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Add date range filter
    if (filters.created_after) {
      query += ` AND c.created_at >= $${paramIndex}`;
      queryParams.push(filters.created_after);
      paramIndex++;
    }

    if (filters.created_before) {
      query += ` AND c.created_at <= $${paramIndex}`;
      queryParams.push(filters.created_before);
    }

    const { rows } = await db.query(query, queryParams);
    return parseInt(rows[0].count);
  },

  /**
   * Get company statistics
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Array>} - Company statistics
   */
  async getCompanyStats(tenantId) {
    const query = `
      SELECT 
        COUNT(*) as total_companies,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_this_week,
        AVG((
          SELECT COUNT(*) FROM contacts 
          WHERE company_id = c.id
        )) as avg_contacts_per_company,
        AVG((
          SELECT COALESCE(SUM(amount), 0) FROM opportunities 
          WHERE company_id = c.id AND status = 'won'
        )) as avg_revenue_per_company
      FROM companies c
      WHERE c.tenant_id = $1
    `;
    
    const { rows } = await db.query(query, [tenantId]);
    return rows[0];
  },

  /**
   * Get top companies by revenue or contacts
   * @param {string} tenantId - Tenant UUID
   * @param {string} metric - 'revenue' or 'contacts'
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Top companies
   */
  async getTopCompanies(tenantId, metric = 'revenue', limit = 10) {
    let orderBy = '';
    
    if (metric === 'revenue') {
      orderBy = 'COALESCE(SUM(CASE WHEN opp.status = \'won\' THEN opp.amount ELSE 0 END), 0) DESC';
    } else {
      orderBy = 'COUNT(DISTINCT cont.id) DESC';
    }

    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT cont.id) as contact_count,
        COALESCE(SUM(CASE WHEN opp.status = 'won' THEN opp.amount ELSE 0 END), 0) as total_revenue
      FROM companies c
      LEFT JOIN contacts cont ON c.id = cont.company_id
      LEFT JOIN opportunities opp ON c.id = opp.company_id
      WHERE c.tenant_id = $1
      GROUP BY c.id
      ORDER BY ${orderBy}
      LIMIT $2
    `;
    
    const { rows } = await db.query(query, [tenantId, limit]);
    return rows;
  }
};

export default CompanyModel;