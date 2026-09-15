const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const User = require("./models/user.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");

module.exports.isLoggedIn = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        const userId = req.session?.userId || req.signedCookies?.authUserId;
        if (userId) {
            try {
                const user = await User.findById(userId);
                if (user) {
                    req.user = user;
                    req.session.userId = user._id.toString();
                    return next();
                }
            } catch (err) {
                return next(err);
            }
        }

        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to continue");
        return res.redirect("/login");
    }
    next();
}

module.exports.isOwner = async (req, res, next) => {
    try {
        const listing = await Listing.findById(req.params.id);

        if (!listing) {
            req.flash("error", "Listing you requested does not exist.");
            return res.redirect("/listings");
        }

        if (!listing.owner || !listing.owner.equals(req.user._id)) {
            req.flash("error", "You can't edit or delete this listing because you are not its owner.");
            return res.redirect(`/listings/${req.params.id}`);
        }

        next();
    } catch (err) {
        next(err);
    }
}

module.exports.isReviewAuthor = async (req, res, next) => {
    try {
        const { id, reviewId } = req.params;
        const review = await Review.findById(reviewId);

        if (!review) {
            req.flash("error", "Review you requested does not exist.");
            return res.redirect(`/listings/${id}`);
        }

        if (!review.author || !review.author.equals(res.locals.currUser._id)) {
            req.flash("error", "You are not the author of this review");
            return res.redirect(`/listings/${id}`);
        }

        next();
    } catch (err) {
        next(err);
    }
}

module.exports.validateListing = (req, res, next) => {
    const { error } = listingSchema.validate(req.body);

    if (error) {
        const errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }

    next();
}

module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);

    if (error) {
        const errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }

    next();
}



module.exports.saveRedirectUrl = (req, res, next) => {
    if(req.session.redirectUrl)
        {
            res.locals.redirectUrl = req.session.redirectUrl;
        }
    next();
}
