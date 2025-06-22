import cloudinary from 'cloudinary'; // Import the default export
import fs from 'fs';

const { config, uploader } = cloudinary; 

config({
    cloud_name: process.env.Cloudinary_CLOUD_NAME,
    api_key: process.env.Cloudinary_API_KEY,
    api_secret: process.env.Cloudinary_SECRET_KEY  
});

const uploadOnCloudinary = async(localFilePath) => {
    try {
        if (!localFilePath) return null;
        //upload the file on cloudinary
        const response = await uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        //file has been uploaded sucessfully 
        //console.log("File has been uploaded sucessfully", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (err) {
        fs.unlinkSync(localFilePath); // remove the locally saved temp file as the upload operation gets failed                         
        return null;
    }
};

export { uploadOnCloudinary };