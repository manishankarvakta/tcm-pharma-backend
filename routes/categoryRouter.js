/**
 * CATEGORY API
 * 1. get all Category
 * 2. get category by group
 * 3. get category by id
 * 3.1 get category by parent
 * 3.2 get master category
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const Category = require("../models/categoryModel");
const upload = require("../middlewares/fileUploader");
const path = require("path");
const categoryRouter = express.Router();

// COUNT Category
categoryRouter.get(
  "/count",
  expressAsyncHandler(async (req, res) => {
    const total = await Category.countDocuments({});
    res.status(200).json(total);
  })
);

// GET ALL Category WITH PAGENATION & SEARCH
categoryRouter.get(
  "/all/:page/:size",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();
    const currentPage = page + 0;

    let query = {};
    let category = [];
    // const size = parseInt(req.query.size);
    // console.log("page:", currentPage, "size:", size, "search:", queryString);

    //check if search or the pagenation

    if (queryString) {
      // console.log("search:", query);
      // search check if num or string
      const isNumber = /^\d/.test(queryString);
      // console.log(isNumber);
      if (!isNumber) {
        // if text then search name
        query = { name: { $regex: new RegExp("^" + queryString + ".*", "i") } };
        // query = { name:  queryString  };
      } else {
        // if number search in ean and article code
        query = {
          article_code: {
            $regex: RegExp("^" + queryString + ".*", "i"),
          },
        };
      }

      category = await Category.find(query)
        .select({
          _id: 1,
          name: 1,
          mcId: 1,
          group: 1,
          mc: 1,
        })
        .limit(50)
        .populate("mc", "name");
      res.status(200).json(category);
    } else {
      // regular pagination
      query = {};

      category = await Category.find(query)
        .select({
          _id: 1,
          name: 1,
          mcId: 1,
          group: 1,
          mc: 1,
        })
        .limit(size)
        .skip(size * page)
        .populate("mc", "name");
      res.status(200).json(category);
      // console.log("done:", query);
    }
  })
);

// GET ALL CATEGORY
categoryRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const categories = await Category.find({});
    res.send(categories);
    // // res.send('removed');
    // console.log(categories);
  })
);

categoryRouter.get(
  "/export",
  expressAsyncHandler(async (req, res) => {
    const categories = await Category.find({}).select({
      _id: 1,
      name: 1,
      code: 1,
      mcId: 1,
    });
    res.send(categories);
    // // res.send('removed');
    // console.log(categories);
  })
);

// GET ALL CATEGORY BY GROUP
categoryRouter.get(
  "/group/:group",
  expressAsyncHandler(async (req, res) => {
    const group = req.params.group.toLowerCase();
    const categories = await Category.find({ group: group });
    res.send(categories);
  })
);

// GET ALL MASTER CATEGORY
categoryRouter.get(
  "/master",
  expressAsyncHandler(async (req, res) => {
    const categories = await Category.find({
      status: "active",
      mc: { $exists: false },
    }).select({ _id: 1, name: 1, mcId: 1 });
    res.send(categories);
  })
);
// GET ALL CATEGORY BY MASTER CATEGORY
categoryRouter.get(
  "/masterCat/:id",
  expressAsyncHandler(async (req, res) => {
    const mcId = req.params.id;
    const categories = await Category.find({
      mc: { $exists: false },
      mc: mcId,
    });
    // console.log(mcId)
    res.send(categories);
  })
);
// GET ALL CATEGORY BY MASTER CATEGORY
categoryRouter.get(
  "/master/:mcId",
  expressAsyncHandler(async (req, res) => {
    const mcId = req.params.mcId;
    const categories = await Category.find({
      mcId: mcId,
      mc: { $exists: true },
    });
    res.send(categories);
  })
);

// GET CATEGORY BY ID
categoryRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const category = await Category.find({ _id: id });
    res.send(category[0]);
  })
);

// GET CATEGORY BY PARENT
categoryRouter.get(
  "/parent/:parent",
  expressAsyncHandler(async (req, res) => {
    const parent = req.params.parent;
    const category = await Category.find({ mc: parent });
    res.send(category);
  })
);

// GET CATEGORY BY MC ID
// categoryRouter.get(
//   "/mc/:mcId",
//   expressAsyncHandler(async (req, res) => {
//     const parent = req.params.mcId;
//     const category = await Category.find({ mcId: parent, mc: { $ne: "mc" } });
//     res.send(category);
//   })
// );

// CREATE ONE CATEGORY
categoryRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const newCategory = new Category(req.body);
    // console.log("category", req.body);
    await newCategory.save((err) => {
      if (err) {
        res.status(500).json({ error: "There was a server side error" });
      } else {
        res.status(200).json({
          message: "Category is created Successfully",
        });
      }
    });
  })
);

// CREATE MULTI CATEGORIES
categoryRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Category.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "Categories are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE CATEGORY
categoryRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    // console.log(req.body);
    try {
      await Category.updateOne({ _id: id }, { $set: update })
        .then((response) => {
          res.send(response);
        })
        .catch((err) => {
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);

// DELETE ONE CATEGORY
categoryRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Category.deleteOne({ _id: id })
        .then((response) => {
          res.send(response);
        })
        .catch((err) => {
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);

// CATEGORY PHOTO UPLOAD
// Upload Endpoint
categoryRouter.post(
  "/upload/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;

    // APPRoot
    // const appRoot = path.dirname(require.main.filename);
    // const appRoot = process.env.PWD;
    const appRoot = process.cwd();
    // APPRoot
    if (req.files === null) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const file = req.files.file;
    const name = file.name.split(".");
    const ext = name[1];
    const time = Date.now();
    const fileName = `${id}-${time}.${ext}`;
    // console.log(`../uploads/${fileName}`);

    file.mv(`${appRoot}/uploads/category/${fileName}`, async (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      } else {
        await Category.updateOne(
          { _id: id },
          { $set: { photo: `/uploads/category/${fileName}` } }
        )
          .then((response) => {
            // res.send(response);
            res.json({
              fileName: fileName,
              filePath: `/uploads/category/${fileName}`,
            });
          })
          .catch((err) => {
            res.send(err);
          });
      }
    });
  })
);
// categoryRouter.post(
//   "/photo/:id",
//   upload.single("photo"),
//   expressAsyncHandler(async (req, res) => {
//     // res.send({ req, res });
//     // const id = req.params.id;
//     console.log(id);
//     try {
//       // console.log(req.body.file);
//     } catch (err) {
//       res.send(err);
//     }
//   })
// );
// CATEGORY PHOTO UPLOAD
categoryRouter.post("/doc", upload.single("doc"), async (req, res) => {
  res.send(req.file);
});

module.exports = categoryRouter;
