import { sendError, sendSuccess } from '../utils/response.js';
import TaskModel from '../models/Task.js';
import UserModel from '../models/User.js';
import db from '../config/db.js';
import format from "pg-format";

export const tasksController = {
  /**
   * Get tasks with filters and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTasks(req, res) {
    try {
      const filters = req.query;
      const { tasks, totalCount } = await TaskModel.getTasksWithFilters(req.user.tenant_id, filters);
      
      const page = parseInt(filters.page || 1);
      const limit = parseInt(filters.limit || 20);

      sendSuccess(res, 200, {
        tasks,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      console.error('Get tasks error:', error);
      sendError(res, 400, 'Failed to fetch tasks');
    }
  },

  /**
   * Create new task
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createTask(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      const setTenantSQL = format("SET LOCAL app.tenant_id = %L", req.user.tenant_id);
      await client.query(setTenantSQL);

      const taskData = req.body;

      // Validate assigned_to user exists if provided
      if (taskData.assigned_to) {
        const userValid = await UserModel.validateUser(taskData.assigned_to, req.user.tenant_id);
        if (!userValid) {
          return sendError(res, 422, 'Invalid assigned_to user ID');
        }
      }

      // Create task
      const task = await TaskModel.create(req.user.tenant_id, {
        ...taskData,
        created_by: req.user.id
      });

      await client.query('COMMIT');

      sendSuccess(res, 201, task, 'Task created successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create task error:', error);
      sendError(res, 422, 'Failed to create task');
    } finally {
      client.release();
    }
  },

  /**
   * Update task status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateTaskStatus(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.tenant_id) {
        return sendError(res, 401, 'User authentication required');
      }

      const { id } = req.params;
      const { status } = req.body;

      // Check if task exists
      const taskExists = await TaskModel.exists(id, req.user.tenant_id);
      if (!taskExists) {
        return sendError(res, 404, 'Task not found');
      }

      const updatedTask = await TaskModel.updateStatus(id, req.user.tenant_id, status);

      sendSuccess(res, 200, updatedTask, 'Task updated successfully');

    } catch (error) {
      console.error('Update task error:', error);
      sendError(res, 404, 'Failed to update task');
    }
  }
};