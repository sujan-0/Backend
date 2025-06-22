import dotenv from "dotenv";
import express from 'express';
import cors from 'cors';
import connectDB from './db/db.js';

dotenv.config({ path: './.env' }); 

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});


//Basic Database Connection basic 

    /* import mongoose from 'mongoose';
    import { DB_NAME } from './db/constraints';

    ( async () =>{
        try{
          mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
          app.on("error", (error) => {
            console.log("ERRR ", error)
          })
          app.listen(port, () => {
            console.log(`http://localhost:${port}`);
          });

        } catch (err){
          console.log("Error", err);
          throw err
        }
    })()
    */































