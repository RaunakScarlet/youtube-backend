import dotenv from "dotenv/config.js";
import connectDB from "./db/index.js";
import { app } from "./app.js";

const port = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on ${port}`);
    });
  })
  .catch((err) => {
    console.log(`Server Connection error`, err);
  });
