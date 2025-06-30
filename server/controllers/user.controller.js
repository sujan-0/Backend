import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErr.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user/user.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// ========== Generate Access and Refresh Tokens ==========
const generateAccessTokenAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

// ========== Register User ==========
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, userName, password } = req.body;

  if ([fullName, email, userName, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are Required ⚠️");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avatarLocalpath = req.files?.avatar?.[0]?.path;
  const coverImageLocalpath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalpath) {
    throw new ApiError(400, "Avatar file is required ⚠️");
  }

  const avatar = await uploadOnCloudinary(avatarLocalpath);
  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed ⚠️");
  }

  const coverImage = coverImageLocalpath
    ? await uploadOnCloudinary(coverImageLocalpath)
    : null;

  const user = await User.create({
    fullName,
    email,
    userName: userName.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Registered Successfully ✅"));
});

// ========== Login User ==========
const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;

  if (!email && !userName) {
    throw new ApiError(400, "Email or Username is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, 
          accessToken,
          refreshToken,
        },
        "User Logged In Successfully ✅"
      )
    );
});

// ========== Logout User ==========
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User Logged Out ✅"));
});

const refreshAccessToken = asyncHandler(async (req,res) =>{
    const incomingRefreshtoken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshtoken){
        throw new ApiError(401, "Unauthorized Access")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshtoken, 
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if(incomingRefreshtoken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired aor used")
        }
    
        const option = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessTokenAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken" , refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken : newrefreshToken}.accessToken,
                "Access token refreshed successfully"
            
            )
        )
    } catch (error) {
        throw new ApiError (401, error?.message || "invalid refrsh token")
    }
});


const changeCurrentPassword = asyncHandler(async (req, res) =>{
  const {oldPassword, newPassword} = req.body
  
  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(401, "Invalid Old Password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave : false})
  return res.status(200).json (new ApiResponse(200, "Password change sucessfully"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(200, req.user, "current user fetched sucessfully")

})

const updateAccountDetails = asyncHandler(async(req, res)=>{
  const {fullName, email} = req.body
  if(!fullName || !email){
    throw new ApiError (400, "All fields are required ")
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set :{
        fullName,
        email  
      }  

    },
    {new : true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse( 200, user, "Account Detai;s"))
})


const updateUserAvatar = await asyncHandler(async (req, res) =>{
  const avatarLocalpath = req.file?.path

  if(!avatarLocalpath){
    throw new ApiError(400, "Avatar is missing ")
  }

  const avatar = await uploadOnCloudinary(avatarLocalpath)
  if(!avatar){
    throw new ApiError(400, "Error while uploaidng on avatar")
  }

  await User.findByIdAndUpdate(
    req.user._id,             
    {
      $set :{
        avatar : avatar.url
      }
    },
    {new : true}
  ).select("-password")


});

const updateUserCoverImg = await asyncHandler(async (req, res) =>{
  const coverImgLocalpath = req.file?.path

  if(!coverImgLocalpath){
    throw new ApiError(400, "CoverImg is missing ")
  }

  const coverImage = await uploadOnCloudinary(coverImgLocalpath)
  if(!coverImage){
    throw new ApiError(400, "Error while uploaidng on Cover Image")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,             
    {
      $set :{
        avatar : coverImage.url
      }
    },
    {new : true}
  ).select("-password")


});







export { 
  registerUser, 
  loginUser, 
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImg
};
