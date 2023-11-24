const express = require("express");
const {
  registerUser,
  userLogin,
  addToCart,
  getAllCartItemsForUsers,
  addAddress,
  getAddress,
  updateAddress,
  deleteAddress,
  postOrder,
  deleteCartRows,
  getOrder,
  addProduct,
  approveOrder,
  createPaypalOrder,
  capturePaypalOrder,
  removeFromCart,
  removeFromCartByUserIdAndProductId,
} = require("../controller/user/userCtrl");
const authMiddleware = require("../middleware/authMiddleware");
const expressAsyncHandler = require("express-async-handler");
const userRoute = express.Router();

userRoute.post("/registeruser", registerUser);

userRoute.post("/login", userLogin);

userRoute.post("/addtocart", authMiddleware, addToCart);

userRoute.post("/addaddress", authMiddleware, addAddress);

userRoute.get("/getcart", authMiddleware, getAllCartItemsForUsers);

userRoute.get("/getaddress", authMiddleware, getAddress);

userRoute.post("/updateaddress", authMiddleware, updateAddress);

userRoute.delete("/deleteaddress", authMiddleware, deleteAddress);

userRoute.post("/postorder", authMiddleware, postOrder);

userRoute.delete("/deleteCart", authMiddleware, deleteCartRows);

userRoute.get("/getorder", authMiddleware, getOrder);

userRoute.post("/postproduct", authMiddleware, addProduct);

userRoute.post("/approveorder", authMiddleware, approveOrder);

userRoute.post("/create-order", createPaypalOrder);

userRoute.post("/capture-order", capturePaypalOrder);

userRoute.post("/removefromcart", authMiddleware, removeFromCart);

userRoute.delete(
  "/deletefromcart",
  authMiddleware,
  removeFromCartByUserIdAndProductId
);

userRoute.get(
  "/verify-jwt",
  authMiddleware,
  expressAsyncHandler((req, res) => {
    res.json(true);
  })
);

module.exports = { userRoute };
