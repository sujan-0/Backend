import { timeStamp } from "console";
import { channel } from "diagnostics_channel";
import mongoose from "mongoose";

const subscriptionSchema = new Schema({
    subscriber :{
        type : Schema.Types.ObjectId, //One who is subscribing
        ref : "User"
    },

    channel : {
        type : Schema.Types.ObjectId, //One whom "subscriber" is subscribing
        ref : "User"
    }
}, {timeStamp : true});


export const subscriptions = mongoose.model("Subscription", subscriptionSchema)