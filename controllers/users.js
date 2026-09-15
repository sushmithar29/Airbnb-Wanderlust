const User = require("../models/user.js");

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }

            req.session.userId = registeredUser._id.toString();
            req.flash("success", "Welcome to Wanderlust");
            req.session.save((saveErr) => {
                if (saveErr) {
                    return next(saveErr);
                }
                res.redirect("/listings");
            });
        });
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

module.exports.login = (req, res, next) => {
    req.session.userId = req.user._id.toString();
    req.flash("success", "Welcome back to Wanderlust!!");
    req.session.save((err) => {
        if (err) {
            return next(err);
        }
        res.redirect(res.locals.redirectUrl || "/listings");
    });
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        delete req.session.userId;
        req.flash("success", "You are logged out now!");
        res.redirect("/listings");
    });
};
