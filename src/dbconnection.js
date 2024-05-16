const sql = require('mssql');
const dbconfig = require('./dbconfig');

const pool = new sql.ConnectionPool(dbconfig);

pool.connect().then(() => {
  console.log('Connected to database');
}).catch((err) => {
  console.log(err);
});

module.exports = pool;
