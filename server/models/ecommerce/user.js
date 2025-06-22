import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        userName : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
        },
        fullName : {
            type : String,
            required : true,
            lowercase : true,
        },
        email : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
        },
        password :{
            type: String,
            required: true,
        },

        avatar :{
            type: String,
            required : true,
        },
        coverImage: {
            type : String,
        }




    }, {timestamps : true}




);

export const User = mongoose.model("User", userSchema);