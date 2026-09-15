const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const passport = require('passport');
const users = require('../controllers/users.js');

router.route('/signup')
  .get(users.renderSignupForm)
  .post(wrapAsync(users.signup));

router.route('/login')
  .get(users.renderLoginForm)
  .post(
    passport.authenticate('local', {
      failureFlash: true,
      failureRedirect: '/login'
    }),
    wrapAsync(users.login)
  );

router.get('/logout', users.logout);

module.exports = router;