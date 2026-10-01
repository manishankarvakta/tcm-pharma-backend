const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const Settings = require("../models/settingsModel");
const settingsRouter = express.Router();
const fs = require("fs");
const path = require("path");

// update all settings records add status  active
// settingsRouter.get(
//     "/updateAamarId",
//     expressAsyncHandler(async (req, res) => {
//       const status = "active";

//       try {
//         const result = await Settings.updateMany({
//           $set: { status: status },
//         });
//         res
//           .status(200)
//           .json({ message: "Settings aamarId updated successfully", result });
//       } catch (error) {
//         // If an error occurs, handle it and send an error response
//         res
//           .status(500)
//           .send({ message: "Error fetching Settings", error: error.message });
//       }
//     })
//   );
// Route to add new settings
settingsRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const { aamarId, ...settingsData } = req.body;

    // console.log('Aamar Donak DATA::>>', aamarId, settingsData)

    try {
      // Check if a record with the given aamarId exists
      let existingSettings = await Settings.findOne({ aamarId });

      if (existingSettings) {
        // Update the existing record
        existingSettings = await Settings.findOneAndUpdate(
          { aamarId },
          { ...settingsData }, // Update with new data
          { new: true } // Return the updated document
        );

        return res.status(200).json({
          message: "Settings updated successfully",
          status: "success",
          data: existingSettings,
        });
      } else {
        // Create a new record if no match is found
        const newSettings = new Settings({ aamarId, ...settingsData });
        await newSettings.save();

        return res.status(201).json({
          message: "Settings created successfully",
          status: "success",
          data: newSettings,
        });
      }
    } catch (error) {
      console.error("Error handling settings:", error);
      return res.status(500).json({
        message: "There was a server-side error",
        status: "error",
        error: error.message,
      });
    }
  })
);

// GET route to fetch settings by aamarId
settingsRouter.get("/:aamarId", async (req, res) => {
  try {
    const aamarId = req.params.aamarId;

    // Find settings by aamarId
    const settingsData = await Settings.findOne({ aamarId });

    if (!settingsData) {
      return res.status(404).json({ message: "Settings not found" });
    }

    res.status(200).json(settingsData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching settings", error });
  }
});

// GET route to fetch settings
// settingsRouter.get("/:aamarId", async (req, res) => {
//   const aamarId = req.params.aamarId;
//   try {
//     // Fetch the settings from the database (if there is only one settings document)
//     const settings = await Settings.findOne(aamarId);
//     if (!settings) {
//       return res.status(404).json({ message: "Settings not found" });
//     }

//     res.status(200).json(settings);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching settings", error });
//   }
// });

// settingsRouter.post(
//   "/upload/:aamarId",
//   expressAsyncHandler(async (req, res) => {
//     const aamarId = req.params.aamarId;
// console.log(aamarId);
//     // Ensure req.files is populated
//     if (!req.files || !req.files.file) {
//       return res.status(400).json({ msg: "No file uploaded" });
//     }
//     const file = req.files.file;
//     const ext = file.name.split('.').pop(); // Extract file extension
//     const fileName = ${aamarId}.${ext};
//     const uploadPath = ${process.cwd()}/uploads/setting;

//     // Ensure the upload directory exists
//     if (!fs.existsSync(uploadPath)) {
//       fs.mkdirSync(uploadPath, { recursive: true });
//     }

//     const filePath = ${uploadPath}/${fileName};
//     console.log(file,
//       ext,
//       fileName,
//       uploadPath,filePath);
//     file.mv(filePath, async (err) => {
//       if (err) {
//         console.error("File move error:", err);
//         return res.status(500).json({ msg: "File upload failed", error: err });
//       }

//       try {
//         // Update product photo in the database
//         await Settings.updateOne(
//           { aamarId: aamarId },
//           { $set: { photo: /uploads/setting/${fileName} } }
//         );

//         res.json({
//           fileName,
//           filePath: /uploads/setting/${fileName},
//         });
//       } catch (dbError) {
//         console.error("Database update error:", dbError);
//         res.status(500).json({ msg: "Failed to update product", error: dbError });
//       }
//     });
//   })
// );
settingsRouter.post(
  "/upload/:aamarId",
  expressAsyncHandler(async (req, res) => {
    try {
      const aamarId = req.params.aamarId;

      if (!req.files || !req.files.file) {
        return res.status(400).json({ msg: "No file uploaded" });
      }

      const file = req.files.file;
      const ext = file.name.split(".").pop().toLowerCase(); // Extract file extension
      const fileName = `${aamarId}.${ext}`; // Corrected
      const uploadPath = path.join(process.cwd(), "uploads", "setting"); // Use path.join

      // Validate file type
      const validExtensions = ["jpg", "jpeg", "png"];
      if (!validExtensions.includes(ext)) {
        return res.status(400).json({ msg: "Invalid file type" });
      }

      // Validate file size (max 5MB)
      const maxFileSize = 5 * 1024 * 1024; // 5MB limit
      if (file.size > maxFileSize) {
        return res
          .status(400)
          .json({ msg: "File is too large. Maximum size is 5MB" });
      }

      // Create the directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const filePath = path.join(uploadPath, fileName); // Use path.join for file path

      // Move the file to the destination
      file.mv(filePath, async (err) => {
        if (err) {
          console.error("Error moving file:", err);
          return res
            .status(500)
            .json({ msg: "File upload failed", error: err.message });
        }

        // Update the settings with the new photo path
        const updateResult = await Settings.updateOne(
          { aamarId },
          { $set: { storePhoto: `/uploads/setting/${fileName}` } }
        );

        if (updateResult.matchedCount === 0) {
          return res
            .status(404)
            .json({ msg: "Settings not found for given aamarId" });
        }

        // Respond with the file details
        res.json({
          fileName,
          filePath: `/uploads/setting/${fileName}`,
        });
      });
    } catch (error) {
      console.error("Upload error:", error);
      res
        .status(500)
        .json({ msg: "Internal server error", error: error.message });
    }
  })
);



module.exports = settingsRouter;
