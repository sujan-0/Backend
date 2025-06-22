import express from 'express';
import mongoose from "mongoose";
import dotenv from 'dotenv';

const app = express ();

dotenv.config({

})

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`);
    console.log(`\nMongoDB Connected! DB HOST: ${connectionInstance.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection FAILED !!:", err);
    process.exit(1);
  }
};

export default connectDB;
