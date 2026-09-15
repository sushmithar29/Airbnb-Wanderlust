const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const ExpressError = require('../utils/ExpressError.js');

module.exports.createReview = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        throw new ExpressError('Listing not found', 404);
    }

    const newReview = new Review({
        ...req.body.review,
        rating: req.body.review.rating || 1
    });
    newReview.author = req.user._id;
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    req.flash('success', 'Successfully created a new review!');
    res.redirect(`/listings/${listing._id}`);
};

module.exports.deleteReview = async (req, res) => {
    const { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    req.flash('success', 'Successfully deleted the review!');
    res.redirect(`/listings/${id}`);
};