import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db/db.js';
import cors from "cors";
import cookieParser from 'cookie-parser';
import { router as userRouter } from "./routes/user.routes.js"; // Corrected import

dotenv.config();
const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Mount the user routes under /api/v1
app.use('/api/v1/users', userRouter); 

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(` Server is running at http://localhost:${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.log(" MongoDB Connection Failed:", err);
  });

export { app };