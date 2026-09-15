const User = require("../models/user.js");

const authCookieOptions = {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
const authCookieClearOptions = {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
};

function rememberAuthenticatedUser(res, userId) {
    res.cookie("authUserId", userId.toString(), authCookieOptions);
}

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
            rememberAuthenticatedUser(res, registeredUser._id);
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
    rememberAuthenticatedUser(res, req.user._id);
    console.info("[auth] Login succeeded; session and signed cookie were issued.");
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
        res.clearCookie("authUserId", authCookieClearOptions);
        console.info("[auth] Logout succeeded; saved identity was cleared.");
        req.flash("success", "You are logged out now!");
        res.redirect("/listings");
    });
};
