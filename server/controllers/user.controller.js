import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErr.js";
import { User } from "../models/user/user.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessTokenAndRefreshTokens = async (userId) =>
{
    try{
        const user = await User.findById(userId)

        const accessToken= user.generateAccessToken();
        const refreshToken= user.generateRefreshToken();

        user.refreshToken = refreshToken ;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken}

    }catch(err){
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    console.log("Received files:", req.files); // Debug log
    console.log("Body:", req.body); // Debug log

    // Get user details from frontend
    const { fullName, email, userName, password } = req.body;

    // Validation - Not Empty
    if ([fullName, email, userName, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are Required ⚠️");
    }

    // Check if user already exists: username & email
    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    });
    if (existedUser) {
        throw new ApiError(404, "User with email/username exists");
    }

    // Check for images and avatar
    const avatarLocalpath = req.files?.avatar?.[0]?.path;
    console.log("Avatar local path:", avatarLocalpath); // Debug log
    const coverImageLocalpath = req.files?.coverImage?.[0]?.path;
    if (!avatarLocalpath) {
        throw new ApiError(400, "Avatar file is required ⚠️");
    }

    // Upload them to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalpath);
    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed ⚠️");
    }
    const coverImage = coverImageLocalpath ? await uploadOnCloudinary(coverImageLocalpath) : null;

    // Create user object - Create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    });

    // Remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // Check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    // Return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    );
});

const loginUser = asyncHandler(async(req, res) =>{

    // Steps:

    // Get user data from reqBody
    const {email, userName, password} = req.body

    // Username or Email
    if(!userName || !email){
        throw new ApiError(400, "Username or Email requires")
    }    

    // Find the user
    const user = await User.findOne({
        $or : [{userName}, {email}]
    })
    if(!user){
        throw new ApiError(404, "User do not exist")
    }

    // Validate the user password
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid User Credentials")
    }
    
    // acess and  refresh token
    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // sent cookiers
      const options ={
        httpOnly : true,
        secure : true
      }  

      return res
      .status(200)
      .cookie("accessToken",accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser.accessToken.refreshToken
            },
            "User LoggedIn Sucessfull ✅"
        )
    )
});

const logoutUser = asyncHandler(async(req,res) =>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options ={
        httpOnly : true,
        secure : true
    }  

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "User logged Out"))
}) 


export { registerUser, loginUser, logoutUser };