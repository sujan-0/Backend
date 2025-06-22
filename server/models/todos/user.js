import { timeStamp } from "console";
import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
    {
        username : {
            type: String,
            required : true,
            unique : true,
            lowercase : true
        },

        email :{
            tpye : String,
            required : true,
            unique : true,
            lowercase : true,
        },
        
        password :{
            type: String,
            required: true,
        }, 
    },
    
    {timestamps : true}


) //Method that takes an obj

export const User = mongoose.model("User", userSchema);



