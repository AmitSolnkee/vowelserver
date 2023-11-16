const express = require("express");
const productRoutes = express.Router();

const {getAllProducts} = require('../controller/product/productCtrl');

productRoutes.get('/getproducts' , getAllProducts);


module.exports = {productRoutes};