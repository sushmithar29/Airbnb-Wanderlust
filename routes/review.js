const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const { isLoggedIn, validateReview, isReviewAuthor } = require('../middleware.js');
const reviews = require('../controllers/reviews.js');

router.route('/:id/reviews')
  .post(isLoggedIn, validateReview, wrapAsync(reviews.createReview));

router.route('/:id/reviews/:reviewId')
  .delete(isLoggedIn, isReviewAuthor, wrapAsync(reviews.deleteReview));

module.exports = router;