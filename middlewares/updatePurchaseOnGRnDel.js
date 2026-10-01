const { response } = require("express");
const Grn = require("../models/grnModel");
const Purchase = require("../models/purchaseModel");



const updatePurchaseStatus = async (req, res, next) => {
    const a = req.body
    const id = req.params.id;
    // console.log("a", a)
    // console.log("a", id)
    try {
        const findGrn = await Grn.findOne({ _id: id })
        // .select({
        //     article_code: 1
        // })
        // console.log("findGrn", findGrn)
        const findPO = await Purchase.findOne({ _id: findGrn.poNo })
        // console.log(findPO, "findPO")
        const matchedGrn = await Grn.find({ poNo: findPO?._id })
        // console.log("matchedGrn", matchedGrn)
        // console.log("matchedGrn", matchedGrn.length)
        if (matchedGrn?.length === 1) {
            await Purchase.updateOne({ _id: findPO?._id }, { $set: { status: "Pending" } })
            // console.log("hi")
        }
    } catch (err) {
        console.log(err)
    } finally {
        next()
    }
}

module.exports = {
    updatePurchaseStatus
}