const { pool } = require("../../dbConnect");

// get all products
const getAllProducts = (req, res) => {
  let products;
  try {
    pool.query("select * from products", (err, product) => {
      if (err) {
        products = err;
        res.status(500).json(products);
      } else {
        products = product;
        res.status(200).json(products);
      }
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports = {getAllProducts}
