const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const ExpressError = require('./utils/ExpressError.js');
const { listingSchema, reviewSchema} = require('./schema.js');

module.exports.isLoggedIn = (req, res, next) => {
    console.log(req.path, req.originalUrl);
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash("error", "You must be signed in first!");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

module.exports.isOwner = async (req, res, next) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    const isOwner = listing.owner && req.user && listing.owner.toString() === req.user._id.toString();

    if (!isOwner) {
        req.flash("error", "You do not have permission to do that!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};

module.exports.validateListing = (req, res, next) => {
    let { error: err } = listingSchema.validate(req.body || {}, { abortEarly: false });
    if (err) {
        let msg = err.details.map(el => el.message).join(', ');
        return next(new ExpressError(msg, 400));
    }
    next();
};

module.exports.validateReview = (req, res, next) => {
    let { error: err } = reviewSchema.validate(req.body);
    if (err) {
        return next(new ExpressError(err.message, 400));
    }
    next();
};

module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) {
        req.flash("error", "Review not found!");
        return res.redirect(`/listings/${id}`);
    }

    const isAuthor = review.author && req.user && review.author.toString() === req.user._id.toString();

    if (!isAuthor) {
        req.flash("error", "You do not have permission to do that!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};