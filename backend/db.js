const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '@Solamento1',
  database: 'etiquetas_db'
});

module.exports = pool;