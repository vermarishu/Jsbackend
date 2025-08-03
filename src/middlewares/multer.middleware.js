import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./pulbic/temp")
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Data.now() + '_' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '_' + uniqueSuffix)
    }
})

export const upload = multer({
    storage,
})  

// ? - why here we not use export default 
// because - Then you configure multer with some custom storage settings,
// Because that would export the entire multer library again, 
// If you wanted to use export default, you could do:

// const upload = multer({ storage });
// export default upload;

// import upload from './middlewares/multer.js';
