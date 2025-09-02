import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

 const userSchema = new Schema(
    {
        username: {
            type: String,
            require: true,
            unique: true,
            lowecase: true,
            trim: true,
            index: true
        },
         email: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true,
        },
         fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
          //  type: String, // cloudinary url
          //  required: true,
          url: {
            type: String,
            required: true,   // Cloudinary secure_url
            },
          public_id: {
            type: String,
            required: true,   // Cloudinary public_id
            } 
        }, 
        coverImage: {
            type:String, // cloudinary url
        }, 
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ], 
        password: {
            type: String,
            required: [true, "passwrod is required"]
        },
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true
    }
 )
 userSchema.pre("save", async function(next) {
    // if(this.inModified("passwrod")) {} - 1st method
    // 2nd method 
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10
    )
    next()
 })
 userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password)
 }
 userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        
        // expiresIn: process.env.ACCESS_TOKEN_EXPIRY -- expity need a object, {}
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
 }
 userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
 } 

 export const User = mongoose.model("User", userSchema)