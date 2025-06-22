import mongoose  from "mongoose";

const orderItemSchema = new mongoose.Schema({
    product : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Product"
    },
    quantity :{
        type : Number,
        required : true,
    }
})

const orderSchema = new mongoose.Schema(
    {
        orderPrice :{
            type : Number,
            required: true,
        },
        customer :{
            type: mongoose.Schema.Types.ObjectId,
            ref : "User",   
        },
        OrderItems :{
            type :[orderItemSchema]
        },
        address :{
            type : String,
            required : true,
        },
        status :{
            type : String,
            enum : ["PENDING", "CANCELLED", "DELIVERED"],
            default : "PENDING"
        }
        


    },{timestamps : true}
);

export const order = mongoose.Schema("Order" , orderSchema)