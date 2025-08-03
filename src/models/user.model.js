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
         emial: {
            type: String,
            require: true,
            unique: true,
            lowecase: true,
            trim: true,
        },
         fullName: {
            type: String,
            require: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // cloudinary url
            required: true, 
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
        passwrod: {
            type: String,
            requrired: [true, "passwrod is required"]
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
    if(!this.isModified("passwrod")) return next()
    this.passwrod = await bcrypt.hash(this.passwrod, 10
    )
    next()
 })
 userSchema.methods.isPasswrodCorrect = async function(password) {
    return await bcrypt.compare(password, this.password)
 }
 userSchema.method.generateAccessToken = function() {
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
 userSchema.method.generateRefreshToken = function() {
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