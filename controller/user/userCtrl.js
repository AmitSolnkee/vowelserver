const { pool } = require("../../dbConnect");
const bcrypt = require("bcryptjs");
const expressAsyncHandler = require("express-async-handler");
const { generateToken } = require("../../token/generateToken");
const paypal = require("@paypal/checkout-server-sdk");

// -------------------------------------------------------------
// --------------------Paypal credential------------------------
// -------------------------------------------------------------

const clientId =
  "AeL6XnXTewvhfzCkjOgDw6ONCsg9Y3TsHJgAxgajjfRjDJ0THoTJ23CDR-qjj3ryuy6_GgQPHK2kjPtE";
const clientSecret =
  "ELoXitXtMmxCaX5jz7pzE3MBYyZnoVENIW-5piB8TDkmrgYKkA34BiZCKTKe8XFXNNEtKkmP7NtA6j_B";

const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

// --------------------------------------------------------------
// ---------Register user----------------------------------------
// --------------------------------------------------------------

const registerUser = expressAsyncHandler(async (req, res) => {
  const { fullname, emailid, password } = req?.body;
  try {
    let salt = bcrypt.genSaltSync(10);
    let hash = await bcrypt.hashSync(password, salt);

    const postUser = {
      fullname,
      email: emailid,
      password: hash,
    };
    pool.query(`INSERT INTO users SET ?`, postUser, (err, response) => {
      if (err) {
        console.error("registration err", err);
      } else {
        res.status(200).json(response);
      }
    });
  } catch (error) {
    console.error("error", error);
    res.json(error);
  }
});

// -------------------------------------
// -------------userLogin---------------
// -------------------------------------

const userLogin = expressAsyncHandler((req, res) => {
  const { email, password } = req?.body;

  // Using pool.query with a callback for the database query
  pool.query(
    "SELECT * FROM `users` WHERE email = ?",
    [email],
    (err, result) => {
      try {
        if (err) {
          throw new Error("Server error");
        }

        if (result.length === 0) {
          throw new Error("Invalid Credentials");
        }

        const user = result[0];

        const matchPassword = bcrypt.compareSync(password, user?.password);
        if (!matchPassword) {
          throw new Error("Invalid Password");
        }

        res.json({
          fullname: user?.fullname,
          email: user?.email,
          mobile_no: user?.mobile_no,
          isAdmin: user?.is_admin,
          token: generateToken(user?.user_id),
        });
      } catch (error) {
        console.error("Error:", error.message);
        res.status(401).json({
          message: "Authentication failed",
          error: error.message,
        });
      }
    }
  );
});

// -----------------------------------------------------------
// ----------------------Add to cart--------------------------
// -----------------------------------------------------------

const addToCart = expressAsyncHandler(async (req, res) => {
  const { product_id, price } = req?.body;
  const { id } = req?.user;
  try {
    const checkExistingQuery =
      "SELECT * FROM cart WHERE product_id = ? AND user_id = ?";
    const existingResult = await executeQuery(checkExistingQuery, [
      product_id,
      id,
    ]);

    if (existingResult.length > 0) {
      const updateQuery =
        "UPDATE cart SET qty = qty + 1 WHERE product_id = ? AND user_id = ?";
      await executeQuery(updateQuery, [product_id, id]);
      res.status(200).json({ message: "Quantity updated in cart" });
    } else {
      const insertQuery = "INSERT INTO cart SET ?";
      const payload = {
        product_id,
        user_id: id,
        qty: 1,
        price,
      };
      await executeQuery(insertQuery, payload);
      res.status(200).json({ message: "Product added to cart" });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({
      error,
      message: "Internal server error",
    });
  }
});

// ------------------------------------------------------------
// ----------------------Remove from cart----------------------
// ------------------------------------------------------------

const removeFromCart = expressAsyncHandler(async (req, res) => {
  const { product_id } = req.body;
  const { id } = req.user;

  try {
    // Check if the product is in the cart
    const checkExistingQuery =
      "SELECT * FROM cart WHERE product_id = ? AND user_id = ?";

    pool.query(
      checkExistingQuery,
      [product_id, id],
      (checkError, existingResult) => {
        if (checkError) {
          console.error("Error checking existing product in cart:", checkError);
          res.status(500).json({
            error: checkError,
            message: "Internal server error",
          });
          return;
        }

        if (existingResult.length > 0) {
          const currentQty = existingResult[0].qty;

          if (currentQty > 1) {
            // If quantity is more than 1, decrease the quantity by 1
            const updateQuery =
              "UPDATE cart SET qty = qty - 1, price = price - ? WHERE product_id = ? AND user_id = ?";
            const priceOfOneItem = existingResult[0].price / currentQty;
            pool.query(
              updateQuery,
              [priceOfOneItem, product_id, id],
              (updateError) => {
                if (updateError) {
                  console.error(
                    "Error updating quantity in cart:",
                    updateError
                  );
                  res.status(500).json({
                    error: updateError,
                    message: "Internal server error",
                  });
                } else {
                  res.status(200).json({ message: "Quantity updated in cart" });
                }
              }
            );
          } else {
            // If quantity is 1, delete the entire row
            const deleteQuery =
              "DELETE FROM cart WHERE product_id = ? AND user_id = ?";
            pool.query(deleteQuery, [product_id, id], (deleteError) => {
              if (deleteError) {
                console.error("Error deleting product from cart:", deleteError);
                res.status(500).json({
                  error: deleteError,
                  message: "Internal server error",
                });
              } else {
                res.status(200).json({ message: "Product removed from cart" });
              }
            });
          }
        } else {
          res.status(404).json({ message: "Product not found in cart" });
        }
      }
    );
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({
      error,
      message: "Internal server error",
    });
  }
});

function executeQuery(query, values) {
  return new Promise((resolve, reject) => {
    pool.query(query, values, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

//------------------------------------------------------------
//-------------------Delete from cart-------------------------
//-----------------------------------------------------------

const removeFromCartByUserIdAndProductId = expressAsyncHandler(
  async (req, res) => {
    const { product_id } = req.body;
    const { id } = req.user;

    try {
      const deleteQuery =
        "DELETE FROM cart WHERE product_id = ? AND user_id = ?";

      pool.query(deleteQuery, [product_id, id], (error) => {
        if (error) {
          console.error("Error deleting product from cart:", error);
          res.status(500).json({
            error,
            message: "Internal server error",
          });
        } else {
          res.status(200).json({ message: "Product removed from cart" });
        }
      });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({
        error,
        message: "Internal server error",
      });
    }
  }
);

// -------------------------------------------------------
// ---------------------Get all cart for users------------
// -------------------------------------------------------

// const getAllCartItemsForUsers = expressAsyncHandler(async (req, res) => {
//   const { id } = req?.user;
//   console.log("id", id);
//   try {
//     pool.query("SELECT * FROM `cart` WHERE user_id =?", [id], (err, result) => {
//       if (err) {
//         throw new Error(err, "Invalid Credentials");
//       }

//       res.json(result);
//     });
//   } catch (error) {
//     console.error("sent error", error);
//     res.status(500).json({
//       error,
//       message: "Server error",
//     });
//   }
// });

const getAllCartItemsForUsers = expressAsyncHandler(async (req, res) => {
  const { id } = req?.user;
  try {
    const query = `
      SELECT cart.*, products.* 
      FROM cart 
      JOIN products ON cart.product_id = products.product_id 
      WHERE cart.user_id = ?
    `;

    pool.query(query, [id], (err, result) => {
      if (err) {
        throw new Error(err, "Invalid Credentials");
      }

      res.json(result);
    });
  } catch (error) {
    console.error("sent error", error);
    res.status(500).json({
      error,
      message: "Server error",
    });
  }
});

// ------------------------------------------------------
// ------------------Add  Address------------------------
// ------------------------------------------------------

const addAddress = (req, res) => {
  const { address } = req?.body;
  const { id } = req?.user;

  pool.query(
    "SELECT * FROM users WHERE user_id = ?",
    [id],
    (errSelect, resultSelect) => {
      if (errSelect) {
        return res.status(500).json({
          error: errSelect.message,
          message: "Error retrieving user data",
        });
      }

      if (resultSelect.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      try {
        const user = resultSelect[0];
        const currentAddress = user.address ? JSON.parse(user.address) : [];
        const updatedAddress = [...currentAddress, { id: Date.now(), address }];

        pool.query(
          "UPDATE users SET address = ? WHERE user_id = ?",
          [JSON.stringify(updatedAddress), id],
          (errUpdate) => {
            if (errUpdate) {
              return res.status(500).json({
                error: errUpdate.message,
                message: "Error updating user address",
              });
            }

            res.json({
              message: "Address added successfully",
              updatedAddress,
            });
          }
        );
      } catch (error) {
        res.status(500).json({
          error: error.message,
          message: "Error parsing user address",
        });
      }
    }
  );
};

// -------------------------------------------------------------
// --------------------------------Get Address------------------
// -------------------------------------------------------------

const getAddress = expressAsyncHandler((req, res) => {
  const { id } = req?.user;
  try {
    pool.query(
      "SELECT address FROM users WHERE user_id = ?",
      [id],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            error: err.message,
            message: "Error retrieving user address",
          });
        }

        if (result.length === 0) {
          return res.status(404).json({
            message: "User not found or address is empty",
          });
        }

        const userAddress = result[0].address;
        res.json({
          userAddress,
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Server error",
    });
  }
});

// -------------------------------------------------
// ------------------update Address-----------------
// -------------------------------------------------

const updateAddress = (req, res) => {
  const { id } = req?.user;
  const { addId, address } = req?.body;
  console.log("req.body", addId, address);

  pool.query(
    "SELECT address FROM users WHERE user_id = ?",
    [id],
    (selectErr, selectResult) => {
      if (selectErr) {
        return res.status(500).json({
          error: selectErr.message,
          message: "Error retrieving existing user address",
        });
      }

      if (selectResult.length === 0) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const existingArray = JSON.parse(selectResult[0].address);
      const updatedArray = updateAddressArray(existingArray, addId, address);
      pool.query(
        "UPDATE users SET address = ? WHERE user_id = ?",
        [JSON.stringify(updatedArray), id],
        (updateErr, updateResult) => {
          if (updateErr) {
            return res.status(500).json({
              error: updateErr.message,
              message: "Error updating user address",
            });
          }

          if (updateResult.affectedRows === 0) {
            return res.status(404).json({
              message: "Address not found for the given user and address ID",
            });
          }

          res.json({
            message: "Address updated successfully",
          });
        }
      );
    }
  );
};

// ---------------------------------------------------------------------

const updateAddressArray = (existingArray, addId, newAddress) => {
  return existingArray.map((item) => {
    if (item.id === addId) {
      return { ...item, address: newAddress };
    }
    return item;
  });
};

// ------------------------------------------------
// ------------------------Delete address----------
// ------------------------------------------------

const deleteAddress = (req, res) => {
  const { id } = req?.user;
  const { deleteId } = req?.body;
  console.log("req.body", deleteId);

  pool.query(
    "SELECT address FROM users WHERE user_id = ?",
    [id],
    (selectErr, selectResult) => {
      if (selectErr) {
        return res.status(500).json({
          error: selectErr.message,
          message: "Error retrieving existing user address",
        });
      }

      if (selectResult.length === 0) {
        return res.status(404).json({
          message: "User not found",
        });
      }
      const existingArray = JSON.parse(selectResult[0].address);
      const updatedArray = deleteAddressArray(existingArray, deleteId);

      pool.query(
        "UPDATE users SET address = ? WHERE user_id = ?",
        [JSON.stringify(updatedArray), id],
        (updateErr, updateResult) => {
          if (updateErr) {
            return res.status(500).json({
              error: updateErr.message,
              message: "Error updating user address",
            });
          }

          if (updateResult.affectedRows === 0) {
            return res.status(404).json({
              message: "Address not found for the given user and address ID",
            });
          }

          res.json({
            message: "Address deleted successfully",
          });
        }
      );
    }
  );
};
const deleteAddressArray = (existingArray, deleteId) => {
  return existingArray.filter((item) => item.id !== deleteId);
};

// ---------------------------------------------------------------
// ---------------------post order -------------------------------
// ---------------------------------------------------------------

const postOrder = expressAsyncHandler(async (req, res) => {
  const { id } = req?.user;
  const { totalAmount, status, shippingadress } = req.body;

  try {
    const insertOrderQuery = `
      INSERT INTO orders (user_id, shippingadress,totalAmount, status )
      VALUES (?, ?, ?, ?)
    `;

    pool.query(
      insertOrderQuery,
      [id, shippingadress, totalAmount, status],
      (err, result) => {
        if (err) {
          console.error("Error creating the order:", err);
          res.status(500).json({
            error: err.message,
            message: "Error creating the order",
          });
        } else {
          const orderId = result.insertId;
          res.status(201).json({
            message: "Order created successfully",
            orderId,
          });
        }
      }
    );
  } catch (error) {
    console.error("Error creating the order:", error);
    res.status(500).json({
      error: error.message,
      message: "Error creating the order",
    });
  }
});

const deleteCartRows = expressAsyncHandler(async (req, res) => {
  const { id } = req?.user;

  try {
    const deleteCartQuery = "DELETE FROM cart WHERE user_id = ?";
    pool.query(deleteCartQuery, [id], (error, result) => {
      if (error) {
        console.error("Error deleting cart rows:", error);
        res.status(500).json({
          error: error.message,
          message: "Error deleting cart rows",
        });
      } else {
        const affectedRows = result.affectedRows;

        res.json({
          message: `${affectedRows} cart rows deleted successfully`,
        });
      }
    });
  } catch (error) {
    console.error("Error deleting cart rows:", error);
    res.status(500).json({
      error: error.message,
      message: "Error deleting cart rows",
    });
  }
});

const getOrder = (req, res) => {
  const { id } = req?.user;

  const getOrderQuery = "SELECT * FROM `orders` WHERE user_id = ?";

  pool.query(getOrderQuery, [id], (err, result) => {
    if (err) {
      console.error("Error retrieving orders:", err);
      return res.status(500).json({
        error: err.message,
        message: "Error retrieving orders",
      });
    }

    res.json({
      orders: result,
    });
  });
};

const addProduct = expressAsyncHandler((req, res) => {
  const { id } = req?.user;
  const { productName, description, price, stockQty, imgUrl } = req?.body;

  pool.query(
    "INSERT INTO products ( productName, description,price, stock_quantity, img) VALUES (?,?, ?, ?, ?)",
    [productName, description, price, stockQty, imgUrl],
    (error, result) => {
      if (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ message: "Internal Server Error" });
      } else {
        const insertedProduct = {
          _id: result.insertId,
          productName,
          description,
          price,
          stockQty,
          imgUrl,
        };

        res.status(201).json(insertedProduct);
      }
    }
  );
});

// ------------------------------------------------------------
// -------------------Paypal payment integration---------------
// ------------------------------------------------------------

const approveOrder = expressAsyncHandler(async (req, res) => {
  const { orderId } = req?.body;

  try {
    const query = `UPDATE orders SET status = ? WHERE order_id = ?`;

    pool.query(query, ["Success", orderId], (error, result) => {
      if (error) {
        console.error("Error approving order:", error);
        res.status(500).json({ message: "Internal Server Error" });
      } else {
        res.status(200).json({ message: "Order approved successfully" });
      }
    });
  } catch (error) {
    console.error("Error approving order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const createPaypalOrder = expressAsyncHandler(async (req, res) => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      { amount: { currency_code: "USD", value: req.body.amount } },
    ],
  });

  try {
    const response = await client.execute(request);
    res.json({ orderId: response.result.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const capturePaypalOrder = expressAsyncHandler(async (req, res) => {
  const orderId = req.body.orderID;
  const request = new paypal.orders.OrdersCaptureRequest(orderId);

  try {
    const response = await client.execute(request);
    res.json({ status: response.result.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = {
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
};
