import { asyncHandler } from "../utils/asyncHandler.js"; // always user .js here 

const registerUser = asyncHandler( async (req, res) => {
    return res.status(200).json({
        message: "ok"
    })
})

const login = asyncHandler(async (req, res) => {
    return res.status(200).json({
        message: "you have log in sucessfull"
    })
})

export {
    login,
}

export {
    registerUser,
}