/**
 * units API
 * 1. get all unitss
 * 2. get Unit by id
 * 3. get Unit by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const path = require("path");
const fs = require("fs");
const { default: axios } = require("axios");
const fileManagerRouter = express.Router();



// Buckets are no longer used in local disk storage
fileManagerRouter.post('/buckets', (req, res) => res.status(200).json({ success: true, message: "Local storage active" }));
fileManagerRouter.get('/check-bucket/:bucketName', (req, res) => res.json({ exists: true }));
fileManagerRouter.get('/buckets', (req, res) => res.json([]));
fileManagerRouter.delete('/buckets/:bucketName', (req, res) => res.json({ success: true }));

// Upload photo
fileManagerRouter.post('/upload', 
  expressAsyncHandler(async (req, res) => {
    try {
      if (!req.files || !req.files.photo) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const photo = req.files.photo;
      const fileExt = path.extname(photo.name);
      // Create a URL-safe filename
      const sanitizedBaseName = photo.name
        .replace(fileExt, "")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      
      const objectName = `${sanitizedBaseName}-${Date.now()}${fileExt}`;
      const uploadPath = path.join(__dirname, "../uploads", objectName);

      // Save file to local disk
      await photo.mv(uploadPath);

      // Return local URL
      res.json({ 
        upURL: `/uploads/${objectName}`, 
        url: `/uploads/${objectName}`, 
        objectName 
      });
    } catch (error) {
      console.error("Error uploading photo:", error.message);
      res.status(500).json({ error: error.message });
    }
  })
);

// GET PROXY photo - Kept for backward compatibility
fileManagerRouter.get('/photo-url/:url', 
  expressAsyncHandler(async (req, res) => {
    try {
      const imageUrl = decodeURIComponent(req.params.url);
      const response = await axios.get(imageUrl, { responseType: 'stream' });
      res.setHeader('Content-Type', response.headers['content-type']);
      response.data.pipe(res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })
);

// Delete photo
fileManagerRouter.delete('/photo/:bucket/:objectName', 
  expressAsyncHandler(async (req, res) => {
    try {
      const { objectName } = req.params;
      const filePath = path.join(__dirname, "../uploads", objectName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })
);


module.exports = fileManagerRouter;
