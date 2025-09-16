import { asyncHandler } from "../utils/asyncHandler.js"; // always user .js here 
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";


const generateAccessAndRefressToken = async(UserId) => {
  try {
    const user = await User.findById(UserId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken() 

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }

  } catch (error) {
    throw new ApiError(500, "something went wrong while generating access and refress token")
  }
}

const registerUser = asyncHandler( async (req, res) => {
    
    // get user details from fronted 
    // validation - not emptyj
    // check if user already exit : usernaem , email
    // check for images , check for avatar 
    // upload them to cloudinary , avatar
    // create user object - create entry in db
    // remove passwrod and refresh token field from response (encrypted passwrod)
    // check for user creation then ,
    // return response (res)
    
    // step - 1 , get user details from fronted 
    const {fullName, email, password, username} = req.body
    console.log("email", email);
    console.log("fullName", fullName);
    
    // step 3, valikdation 
    
    // if(
    //     [fullName, email, password, username].some((filed) = field?.trim() === "")
    // ){
    //     throw new ApiError(400, "All fileds are required")
    // }
    
    // but here we use each field method 
    
    if (!fullName?.trim()) {
      throw new ApiError(400, "Full name is required");
    }
    
    if (!email?.trim()) {
      throw new ApiError(400, "Email is required");
    }
    
    if (!email.includes("@")) {
      throw new ApiError(400, "Email must be valid and contain '@'");
    }
    
    if (!username?.trim()) {
      throw new ApiError(400, "Username is required");
    }
    
    if (!password?.trim()) {
      throw new ApiError(400, "Password is required");
    }
    
    // step 4, check if user already exit
    const exitedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    // console.log(exitedUser);
    
    
    if(exitedUser) {
        throw new ApiError(400, "alredy exists")
    }
    // console.log("req.files:", req.files);

    
    // step 5  , checking for image and avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files?.coverImage?.[0].path;
    }

    
    if (!avatarLocalPath) { 
        throw new ApiError(409, "Required")
    }
    
    // step 6 , upload on clodinary - avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if(!avatar) {
        throw new ApiError(409, "avatar is Required") 
    }
    
    // step 7, create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: {
          secure_url: avatar.secure_url,
          public_id: avatar.public_id
        },
        coverImage: coverImage?.secure_url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    
    // setp 8 , check for user createion & remove passwrod and refresh token 
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    
    if(!createdUser) {
        throw new ApiError(500, "something went wrong")
    }
    
    // setp 9, return response 
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )
})
 
// now we create login method , 
  // req body => data
  // username or email => login with 
  // find the user => db
  // password check 
  // access and refresh token
  // send cookie 
  // reponse login successfully 

// step 1 - req boday => data
const loginUser = asyncHandler(async(req, res) => {

// step 2 - username and email => login with 
  const { email, username, password} = req.body
  if(!(username || email)) {
    throw new ApiError(400, "Usernaem of Email is required")
  }

// setp 3 - find the user => db
const user = await User.findOne({
  $or: [{ username } , { email }]
})
if (!user) {
  throw new ApiError(404, "User does not exist")
}

// setp 4 - check password 
const isPasswordValid = await user.isPasswordCorrect(password)
if (!isPasswordValid) {
  throw new ApiError(401, "Invalid Password")
}

//setp 5 - access and refresh token 
// we have created generateAccessAndRefreshToken method seprately , line -8 
const {accessToken, refreshToken} = await generateAccessAndRefressToken(user._id)
const logedInUser = await User.findById(user._id).select("-password -refreshToken")  

const options = {
  httpOnly: true,
  secure: true
}
return res
.status(200)
.cookie("accessToken", accessToken, options)
.cookie("refreshToken", refreshToken, options)
.json(
  new ApiResponse(
    200,
    {
      user: logedInUser, accessToken, refreshToken
    },
    "user loged in successfully"
  )
)
})

const logoutUser = asyncHandler(async(req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
  {
    $set: {
      refreshToken: undefined
    }
  },
  {
    new: true
  }
  )
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "logout successfully"))
})

// generate new accessToken if it expired 
const refreshAccessToken = asyncHandler(async(req, res) => {
  // token coming from user side, - incomingRefreshtoken
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorize request")
  }
  try {
    // verify refreshToken from the server side and decodeToken
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    // if the decodedToke  is valid then find id of user
    const user = await User.findById(decodedToken?._id)
    if(!user) {
      throw new ApiError(401, "Invalid refresh token")
    }
    // check the user side refreshToken is matches from the server side 
    if(incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used")
    }
    const options = {
      httpOnly: true,
      secure: true
    }
    // if token if matches then generate a new accessToken
    const { accessToken, newRefreshToken } = await generateAccessAndRefressToken(user._id)
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
      {accessToken, refreshToken: newRefreshToken},
      "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

// change the old password by user 
const changeCurrentPassword = asyncHandler(async(req, res) => {
  const {oldPasswrod, newPasswrod} = req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPasswrod)

  if(!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password")
  }

  user.passwrod = newPasswrod
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "Password Changed Successfully"))

})

// access the current user
const getCurrentUser =  asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(new ApiResponse(
    200,
    req.user,
    "Current user fetched successfully"))
})

// allow user to change their detail 
const updateAccountDetails = asyncHandler(async(req, res) => {
  const { fullName, email, ...extraFields } = req.body

  //  #If any extra fields provided, throw erro
  if (Object.keys(extraFields).length > 0) {
    throw new ApiError(400, "Only fullName and email can be updated");
  }

  if(!(fullName || email)) {
    throw new ApiError(400, "field are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set : {
        fullName: fullName, // fullName - we can also write this only
        email: email 
      }
    },
    {new: true}
  ).select("-password")  // we can do chaining here also
  // .select("-password") means:
  //"Bring me the user data but don’t show me the password field."

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully"))
})

// allow user to change their avatar flie
const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path // there is  a single file so, we use file (not files)

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }
  
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if(!avatar?.secure_url) {
    throw new ApiError(400, "Error while uploading on avatar")
  }
  
  // // -----Get current user data to access old avatar publicId-----

  // const currentUser = await User.findById(req.user?._id);
  // if(!currentUser) {
  //   throw new ApiError(404, "current User not found")
  // }
  
  // if(currentUser.avatar?.public_id) {
  //       await deleteFromCloudinary(currentUser.avatar.public_id);
  //   }  

  // // or------

  // if(currentUser.avatar?.publicId) {
  //       await deleteFromCloudinary(currentUser.avatar.publicId);
  //   }  
  // if(currentUser?.avatar) {
  //   const publicId =  currentUser.avatar.split("/").pop().split(".")[0];
  //   await deleteFromCloudinary(publicId)
  // }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.secure_url,
        // public_id: avatar.public_id
      }
    }
  ).select("-password")
  return res
    .status(200)
    .json(new ApiResponse(
    200,
    user,
    "Avatar updated sucessfull"))
})

// allow user to change their coverImage file
const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path // there is  a single file so, we use file (not files)

  if(!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if(!coverImage?.secure_url) {
    throw new ApiError(400, "Error while uploading on avatar")
  }
  
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.secure_url
      }
    }
  ).select("-password")
  return res
    .status(200)
    .json(new ApiResponse(
      200,
      user,
      "coverImage updated sucessfull"))
})

// mongoDB aggregation pipelines
const getUserChannelProfile = asyncHandler(async(req, res) => {
  const {username} = req.params 

  if(!username?.trim()) {
    throw new ApiError(400, "username is missing")
  } 
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    // find the subscriber of the channel 
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    // find the subscribed to channel
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscirber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
  ])
  if(!channel?.length) {
    throw new ApiError(404, "channel does not exist")
  } 
  return res
  .status(200)
  .json(
    new ApiResponse(200, channel[0], "User channel fetched successfully")
  )
})

// get watch history of user , and write sub pipeline 
const getWatchHistory = asyncHandler(async(req, res) => {
  // convert the sting id into mongodb Id
  const user = await User.aggregate([
    {
      $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id", 
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
            from: "user",
            localField: "owner",
            foreignField: "_id", 
            as: "owner",
            pipeline: {
              $project: {
                fullName: 1,
                username: 1,
                avatar: 1
              }
            }
            }
          },
          // just for frontend perpose , it will find the fist value of owner
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])
  return res
  .status(200)
  .json(
    new ApiResponse(
    200,
    user[0].watchHistory,
    "watch history fetched successfully"
  )
)
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}