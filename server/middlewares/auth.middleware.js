import { User } from "../models/user/user.js";
import { ApiError } from "../utils/ApiErr.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req,_,next) => {
    try {
            req.cookies?.accessToken || req.header("Autorization").replace("Bearer","")
        
            if(!token){
                throw new ApiError(401, "Unauthorized Request")
            }
            
            const decodedToken = jwt.verify(token, process.env.ACESS_TOKEN_SECRET)
            const user = await User.findById(decodedToken?._id).select("-password -refreshToken" )
        
            if(!user){
                //dicuss on frontend
                throw new ApiError(401, "Invalid Access Token")
            }
        
            req.user = user;
            next();

    } catch (error) {
        throw new ApiError (401, "Invaild Access Token")
    }

})