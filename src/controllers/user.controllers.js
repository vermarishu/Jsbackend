import { asyncHandler } from "../utils/asyncHandler.js"; // always user .js here 
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefressToken = async(UserId) => {
  try {
    const user = await User.findById(UserId)
    const accessToken = User.generateAccessToken()
    const refreshToken = User.generateRefreshToken() 

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken}

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
    console.log("email", email)
    
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
    console.log(exitedUser);
    
    
    if(exitedUser) {
        throw new ApiError(400, "alredy exists")
    }
    console.log("req.files:", req.files);

    
    // step 5  , checking for image and avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path;
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
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
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
  if(!username || !email) {
    throw new ApiError(400, "Usernaem of Email is required")
  }

// setp 3 - find the user => db
const user = await user.findOne({
  $or: [{ username } , { email }]
})
if (!user) {
  throw new ApiError(404, "User does not exist")
}

// setp 4 - check password 
const isPasswordValid = await isPasswrodCorrect(password)
if (!isPasswordValid) {
  throw new ApiError(401, "Invalid Password")
}

//setp 5 - access and refresh token 
// we have created generateAccessAndRefreshToken method seprately , line -8 
const {accessToken, refreshToken} = generateAccessAndRefressToken(user._id)
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
  .clearCookies("accessToken", options)
  .clearCookies("refreshToken", options)
  .json(new ApiResponse(200, {}, "logout successfully"))
}) 

export {
    registerUser,
    loginUser,
    logoutUser
}
