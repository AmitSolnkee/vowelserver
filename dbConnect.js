const mysql = require("mysql");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "ecomm",
  multipleStatements: true,
});

module.exports = {
  pool,
};