import db from '../config/db.js';

/**
 * Task Model
 * Handles database operations for the tasks table
 */
const TaskModel = {
  /**
   * Get tasks with filters and pagination
   * @param {string} tenantId - Tenant UUID
   * @param {Object} filters - Filter and pagination options
   * @returns {Promise<Object>} - Tasks data with pagination info
   */
  async getTasksWithFilters(tenantId, filters) {
    const { 
      status, 
      assigned_to, 
      due_before,
      due_after,
      priority,
      page = 1, 
      limit = 20 
    } = filters;
    
    const offset = (page - 1) * limit;

    let whereConditions = ['t.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIndex = 2;

    // Build dynamic WHERE clause
    if (status) {
      whereConditions.push(`t.status = $${paramIndex++}`);
      queryParams.push(status);
    }
    if (assigned_to) {
      whereConditions.push(`t.assigned_to = $${paramIndex++}`);
      queryParams.push(assigned_to);
    }
    if (due_before) {
      whereConditions.push(`t.due_at <= $${paramIndex++}`);
      queryParams.push(due_before);
    }
    if (due_after) {
      whereConditions.push(`t.due_at >= $${paramIndex++}`);
      queryParams.push(due_after);
    }
    if (priority) {
      whereConditions.push(`t.priority = $${paramIndex++}`);
      queryParams.push(priority);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        t.*,
        l.title as lead_title,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        tu.name as assignee_name,
        tu.email as assignee_email,
        COUNT(*) OVER() as total_count
      FROM tasks t
      LEFT JOIN leads l ON t.lead_id = l.id
      LEFT JOIN contacts c ON t.contact_id = c.id
      LEFT JOIN team_users tu ON t.assigned_to = tu.id
      WHERE ${whereClause}
      ORDER BY 
        CASE 
          WHEN t.priority = 'urgent' THEN 1
          WHEN t.priority = 'high' THEN 2
          WHEN t.priority = 'normal' THEN 3
          WHEN t.priority = 'low' THEN 4
        END,
        t.due_at ASC NULLS LAST,
        t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    
    const { rows } = await db.query(query, queryParams);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    
    return {
      tasks: rows.map(row => {
        const { total_count, ...task } = row;
        return task;
      }),
      totalCount
    };
  },

  /**
   * Create new task
   * @param {string} tenantId - Tenant UUID
   * @param {Object} taskData - Task information
   * @returns {Promise<Object>} - New task object
   */
  async create(tenantId, taskData) {
    const {
      lead_id,
      contact_id,
      assigned_to,
      title,
      due_at,
      priority = 'normal'
    } = taskData;

    const query = `
      INSERT INTO tasks (
        id, tenant_id, lead_id, contact_id, assigned_to, title, due_at, priority
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING *
    `;

    const values = [
      tenantId,
      lead_id,
      contact_id,
      assigned_to,
      title,
      due_at,
      priority
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Check if task exists
   * @param {string} taskId - Task UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<boolean>} - Existence status
   */
  async exists(taskId, tenantId) {
    const query = 'SELECT id FROM tasks WHERE id = $1 AND tenant_id = $2';
    const { rows } = await db.query(query, [taskId, tenantId]);
    return rows.length > 0;
  },

  /**
   * Update task status
   * @param {string} taskId - Task UUID
   * @param {string} tenantId - Tenant UUID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated task object
   */
  async updateStatus(taskId, tenantId, status) {
    const query = `
      UPDATE tasks 
      SET status = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;

    const { rows } = await db.query(query, [taskId, tenantId, status]);
    return rows[0] || null;
  },

  /**
   * Get task by ID with details
   * @param {string} taskId - Task UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} - Task object with related data
   */
  async findByIdWithDetails(taskId, tenantId) {
    const query = `
      SELECT 
        t.*,
        l.title as lead_title,
        c.first_name || ' ' || c.last_name as contact_name,
        c.email as contact_email,
        tu.name as assignee_name,
        tu.email as assignee_email
      FROM tasks t
      LEFT JOIN leads l ON t.lead_id = l.id
      LEFT JOIN contacts c ON t.contact_id = c.id
      LEFT JOIN team_users tu ON t.assigned_to = tu.id
      WHERE t.id = $1 AND t.tenant_id = $2
    `;

    const { rows } = await db.query(query, [taskId, tenantId]);
    return rows[0] || null;
  },

  /**
   * Get task statistics
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Array>} - Task stats
   */
  async getTaskStats(tenantId) {
    const query = `
      SELECT 
        status,
        priority,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE due_at < CURRENT_TIMESTAMP AND status NOT IN ('done', 'canceled')) as overdue_count
      FROM tasks
      WHERE tenant_id = $1
      GROUP BY status, priority
      ORDER BY count DESC
    `;
    
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  }
};

export default TaskModel;