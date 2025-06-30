import { Router } from "express";
import { changeCurrentPassword,
        getCurrentUser, 
        getUserChannelProfile, 
        getWatchedHistory, 
        loginUser, 
        logoutUser, 
        registerUser, 
        updateAccountDetails, 
        updateUserAvatar, 
        updateUserCoverImg 
} from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { refreshAccessToken } from "../controllers/user.controller.js";


const router = Router()
router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1   
        },
        
        {
            name : "coverImage",
            maxCount : 1
        }

    ]),
    registerUser

)

router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/coverimg").patch(verifyJWT, upload.single("/coverImage"), updateUserCoverImg)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchedHistory)




export { router };


