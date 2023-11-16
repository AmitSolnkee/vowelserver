const express = require("express");
const app = express();
const PORT = 5001;
const cors = require("cors");
const dotenv = require("dotenv");
const { productRoutes } = require("./route/productRoutes");
const { userRoute } = require("./route/userRoute");

dotenv.config();

app.use(express.json());

app.use(cors());

app.use("/", productRoutes);

app.use("/", userRoute);

// Create server
app.listen(PORT, () => {
  console.log(`Server is running successfully on port ${PORT}`);
});
