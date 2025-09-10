 
import {Pool} from 'pg';
import dotenv from 'dotenv'
// Load environment variables
dotenv.config();

/**
 * PostgreSQL database connection pool
 * @type {Pool}
 */
  const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test database connection
pool.connect()
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection error:', err.message));

/**
 * Execute SQL queries with parameterized values
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} - Query result
 */
const db = {
  query: (text, params) => pool.query(text, params),
  pool
};
export default db;