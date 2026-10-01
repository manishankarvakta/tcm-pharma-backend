[
    {
        $lookup: {
            from: "inventories",
            localField: "article_code",
            foreignField: "article_code",
            as: "products"
        }
    },
    {
        $unwind: '$products'
    },
    //?grn
    {
        $lookup: {
            from: "grns",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]

                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$products",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "grnsPrevious"
        }
    },
    {
        $lookup: {
            from: "grns",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                //ji
                                {
                                    $gte: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-07T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$products",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "grns"
        }
    },

    //? grn qty sum 
    //? grn Qty sum
    //?grn sum 
    {
        $addFields: {
            grnPQty: {
                $reduce: {
                    input: "$grnsPrevious",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },
        }
    },
    {
        $addFields: {
            grnQty: {
                $reduce: {
                    input: "$grns",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }

                                    }
                                }
                            }
                        ]
                    }
                }
            },
        }
    },

    //?grn  new Date("2023-09-02T17:59:59.999Z")
    //? rtv  new Date("2023-09-02T17:59:59.999Z")
    {
        $lookup: {
            from: "rtvs",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                {
                                    $gte: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$products",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "rtvs"
        }
    },
    {
        $lookup: {
            from: "rtvs",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                // {
                                //   $gte: ["$createdAt",  new Date("2023-09-02T17:59:59.999Z")]
                                // },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$products",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "rtvsPrevious"
        }
    },

    {
        $addFields: {
            rtvPQty: {
                $reduce: {
                    input: "$rtvsPrevious",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

        }
    },
    {
        $addFields: {
            rtvQty: {
                $reduce: {
                    input: "$rtvs",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

        }
    },
    //?rtv  new Date("2023-09-02T17:59:59.999Z") 
    //?damage  new Date("2023-09-02T17:59:59.999Z") 
    {
        $lookup: {
            from: "damages",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                // {
                                //   $gte: ["$createdAt",  new Date("2023-09-02T17:59:59.999Z")]
                                // },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$products",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "damagesPrevious"
        }
    },
    {
        $lookup: {
            from: "damages",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                {
                                    $gte: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$products",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "damages"
        }
    },

    {
        $addFields: {
            damagePQty: {
                $reduce: {
                    input: "$damagesPrevious",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

        }
    },
    {
        $addFields: {
            damageQty: {
                $reduce: {
                    input: "$damages",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

        }
    },
    //?damage  new Date("2023-09-02T17:59:59.999Z")
    //?sale  new Date("2023-09-02T17:59:59.999Z") 
    {
        $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                // {
                                // $gte: ["$createdAt",  new Date("2023-09-02T17:59:59.999Z")]
                                // },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$products",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "salesPrevious"
        }
    },
    {
        $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                // {
                                // $gte: ["$createdAt",  new Date("2023-09-02T17:59:59.999Z")]
                                // },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$returnProducts",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "salesReturnPrevious"
        }
    },
    {
        $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                {
                                    $gte: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$returnProducts",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "salesReturn"
        }
    },
    {
        $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                {
                                    $gte: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$products",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "sales"
        }
    },

    {
        $addFields: {
            saleRQty: {
                $reduce: {
                    input: "$salesReturn",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

        }
    },
    {
        $addFields: {
            saleRPQty: {
                $reduce: {
                    input: "$salesReturnPrevious",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

        }
    },
    {
        $addFields: {
            salePQty: {
                $reduce: {
                    input: "$salesPrevious",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

        }
    },
    {
        $addFields: {
            saleQty: {
                $reduce: {
                    input: "$sales",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

        }
    },

    //?sale  new Date("2023-09-02T17:59:59.999Z")
    //?tpn  new Date("2023-09-02T17:59:59.999Z")
    {
        $lookup: {
            from: "tpns",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                // {
                                //   $gte: ["$createdAt",  new Date("2023-09-02T17:59:59.999Z")]
                                // },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$products",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "tpnsPrevious"
        }
    },
    {
        $lookup: {
            from: "tpns",
            let: { article_code: "$products.article_code" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                // { $eq: ["$status", "Complete"] },
                                {
                                    $gte: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                },
                                {
                                    $lt: ["$createdAt", new Date("2023-09-02T17:59:59.999Z")]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        products: {
                            $filter: {
                                input: "$products",
                                as: "product",
                                cond: {
                                    $eq: ["$$product.article_code", "$$article_code"]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        "products": { $gt: [] }
                    }
                }
            ],
            as: "tpns"
        }
    },

    {
        $addFields: {
            tpnPQty: {
                $reduce: {
                    input: "$tpnsPrevious",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

        }
    },
    {
        $addFields: {
            tpnQty: {
                $reduce: {
                    input: "$tpns",
                    initialValue: 0,
                    in: {
                        $sum: [
                            "$$value",
                            {
                                $sum: {
                                    $map: {
                                        input: "$$this.products",
                                        as: "product",
                                        in: {
                                            $toInt: {
                                                $ifNull: [ // Handle null or invalid values
                                                    { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                                    0 // Default value if conversion fails
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

        }
    },

    //?tpn  new Date("2023-09-02T17:59:59.999Z")
    // {
    //   $lookup: {
    //     from: "generics",
    //     localField: "generic", // Convert to ObjectId
    //     foreignField: "_id",
    //     as: "generic",
    //   },
    // },
    // {
    //   $unwind: "$generic"
    // },
    {
        $lookup: {
            from: "groups",
            localField: "group", // Convert to ObjectId
            foreignField: "_id",
            as: "group",
        },
    },
    {
        $unwind: "$group"
    },
    // {
    //   $lookup: {
    //     from: "brands",
    //     localField: "brand", // Convert to ObjectId
    //     foreignField: "_id",
    //     as: "brand",
    //   },
    // },
    // {
    //   $unwind: "$brand"
    // },
    {
        $project: {
            _id: 0,
            name: 1,
            article_code: 1,
            group: 1,
            // generic: 1,
            // brand: 1,
            // unit: 1,
            tp: 1,
            mrp: 1,

            grnPQty: 1,
            grnQty: 1,
            // grnDetails: 1,

            rtvQty: 1,
            // rtvDetails: 1,
            rtvPQty: 1,

            saleQty: 1,
            // saleDetails: 1,
            salePQty: 1,
            saleRPQty: 1,
            saleRQty: 1,

            tpnQty: 1,
            // tpnDetails: 1,
            tpnPQty: 1,

            damageQty: 1,
            // damageDetails: 1,
            damagePQty: 1,
        },
    },


]