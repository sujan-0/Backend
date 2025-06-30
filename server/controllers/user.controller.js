import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErr.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user/user.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { subscribe } from "diagnostics_channel";
import { emit } from "process";

// Generate Access and Refresh Tokens
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

// Register User
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, userName, password } = req.body;

  if ([fullName, email, userName, password].some(field => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required ⚠️");
  }

  const existedUser = await User.findOne({ $or: [{ email }, { userName }] });
  if (existedUser) throw new ApiError(409, "User with email or username already exists");

  const avatarLocalpath = req.files?.avatar?.[0]?.path;
  const coverImageLocalpath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalpath) throw new ApiError(400, "Avatar file is required ⚠️");

  const avatar = await uploadOnCloudinary(avatarLocalpath);
  if (!avatar) throw new ApiError(400, "Avatar upload failed ⚠️");

  const coverImage = coverImageLocalpath ? await uploadOnCloudinary(coverImageLocalpath) : null;

  const user = await User.create({
    fullName,
    email,
    userName: userName.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");
  if (!createdUser) throw new ApiError(500, "Something went wrong while registering user");

  res.status(201).json(new ApiResponse(201, createdUser, "User Registered Successfully ✅"));
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;

  if (!email && !userName) throw new ApiError(400, "Email or Username is required");

  const user = await User.findOne({ $or: [{ email }, { userName }] });
  if (!user) throw new ApiError(404, "User does not exist");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshTokens(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User Logged In Successfully ✅"));
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } }, { new: true });

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  };

  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User Logged Out ✅"));
});

// Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized Access");

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);
    if (!user) throw new ApiError(401, "Invalid Refresh Token");

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessTokenAndRefreshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed successfully"));
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Change Current Password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(401, "Invalid Old Password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, null, "Password changed successfully"));
});

// Get Current User
const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// Update Account Details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) throw new ApiError(400, "All fields are required");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullName, email } },
    { new: true }
  ).select("-password");

  res.status(200).json(new ApiResponse(200, user, "Account Details Updated ✅"));
});

// Update User Avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalpath = req.file?.path;
  if (!avatarLocalpath) throw new ApiError(400, "Avatar is missing");

  const avatar = await uploadOnCloudinary(avatarLocalpath);
  if (!avatar) throw new ApiError(400, "Error uploading avatar");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");

  res.status(200).json(new ApiResponse(200, user, "Avatar updated ✅"));
});

// Update User Cover Image
const updateUserCoverImg = asyncHandler(async (req, res) => {
  const coverImgLocalpath = req.file?.path;
  if (!coverImgLocalpath) throw new ApiError(400, "Cover image is missing");

  const coverImage = await uploadOnCloudinary(coverImgLocalpath);
  if (!coverImage) throw new ApiError(400, "Error uploading cover image");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password");

  res.status(200).json(new ApiResponse(200, user, "Cover image updated ✅"));
});


const getUserChannelProfile = asyncHandler (async(req, res) =>{
    const {username} = req.params
  if(!username){
    throw new ApiError(400, "Username missing")
  }

  const channel = await User.aggregate([
      {
        $match : {
          username : username?.toLowerCase()
        }
      },
      {
        $lookup : {
          from : "subscriptions",
          localField : "_id",
          foreignField : "channel"
        }
      },
      {
        $lookup : {
          from : "subscriptions",
          localField : "_id",
          foreignField : "subscriber",
          as: "subscribedTo"
        }
      },
      {
          $addFields :{
            subscribersCount :{
              $size : "$subscribers"
            },
            channelsSubscribedToCount : {
              $size : "$subscribed"
            }
          }
      },

      {
        isSubscribed: { 
          $cond: {
            if : {$in: [req.user?._id, "$subscribers.subscribe"]},
            then : true,
            else: false
          }
        }
      },

      {
        $project  : {
          fullName : 1,
          userName : 1,
          subscribersCount : 1,
          channelsSubscribedToCount : 1,
          isSubscribed : 1,
          avatar: 1,
          coverImage : 1,
          email : 1
        }
      }

    ])  
    
    if(!channel?.length){
      throw new ApiError (400, "Channel do not ecist ")
    }

    return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel fetched sucessfully")
    )
    

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
  updateUserCoverImg,
  getUserChannelProfile
};
