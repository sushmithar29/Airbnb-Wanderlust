const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const DEFAULT_IMAGE_URL =
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80";


const listingSchema = new Schema({ 
    title: {
        type: String,
        required: true,
    },
    description: String,
    image: {
        url: {
            type: String,
            default: DEFAULT_IMAGE_URL,
            // An empty form field is an empty string, not `undefined`, so
            // normalize it to the same fallback image.
            set: (value) => value?.trim() || DEFAULT_IMAGE_URL,
        },
        filename: String,
    },
       price: Number,
       location: String,
       country: String,
       geometry: {
        type: {
            type: String,
            enum: ["Point"],
        },
        coordinates: {
            type: [Number],
        },

       },
       categoty:{
        type: String,
        enum: ["mountains", "arctic","farms","deserts"]
       },
       reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        }
    ],
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User",
    }
}); 


    listingSchema.post("findOneAndDelete", async function (doc) {
        if(doc) {   
        await Review.deleteMany({
            _id: {
                $in: doc.reviews,
            },
        });
    }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
