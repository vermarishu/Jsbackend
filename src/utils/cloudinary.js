import {v2 as cloudinary} from "cloudinary"
import { response } from "express";
import fs from "fs"

// Configuration
cloudinary.config({ 
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
    api_key:process.env.CLOUDINARY_API_KEY, 
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        // upload the file on lcoudinary 
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
            fs.unlinkSync(localFilePath);
            // return {
            //     url: result.secure_url,
            //     public_id: result.public_id,
            // };
            //or
            return result;
        // file has been uploaded sucessfull
        //console.log("file is uploaded on cloudinary", response.url)
        //return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
} 

// // delete image file after updateImagefile successfully 
// const deleteFromCloudinary = async(publicId) => {
//    try {
//       // Delete the file from cloudinary using public_id
//         const result = await cloudinary.uploader.destroy(publicId, {
//             resource_type: "auto" // or "auto" for any type of file
//         });
//      return result;
//    } catch (error) {
//     throw new ApiError(401, error?.message || "Error deleting Image from clodinary")
//    }

// }

export{
    uploadOnCloudinary,
    // deleteFromCloudinary
}

    
//     // Upload an image
//      const uploadResult = await cloudinary.uploader
//        .upload(
//            'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
//                public_id: 'shoes',
//            }
//        )
//        .catch((error) => {
//            console.log(error);
//        });
    
//     console.log(uploadResult);
    
//     // Optimize delivery by resizing and applying auto-format and auto-quality
//     const optimizeUrl = cloudinary.url('shoes', {
//         fetch_format: 'auto',
//         quality: 'auto'
//     });
    
//     console.log(optimizeUrl);
    
//     // Transform the image: auto-crop to square aspect_ratio
//     const autoCropUrl = cloudinary.url('shoes', {
//         crop: 'auto',
//         gravity: 'auto',
//         width: 500,
//         height: 500,
//     });
    
//     console.log(autoCropUrl);    
// })();
