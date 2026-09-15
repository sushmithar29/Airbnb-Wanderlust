if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}


const express = require('express');
const app = express();
const mongoose = require('mongoose');
const ejs = require('ejs');
const path = require("path");
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const ExpressError = require('./utils/ExpressError.js');
const session = require('express-session');
const cookieParser = require("cookie-parser");
const MongoStore = require('connect-mongo').default;
const flash = require("connect-flash");
const passport = require('passport');
const LocalStrategy =   require('passport-local');
const User = require('./models/user.js');

const isProduction = process.env.NODE_ENV === "production";
const authCookieClearOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
};



const listingRouter = require("./routes/listing.js");
const reviewRouter = require('./routes/review.js');
const userRouter = require('./routes/user.js');

const dburl = process.env.ATLASDB_URL;

// Render terminates HTTPS at its proxy. Trust it so secure session cookies work
// correctly in production while local development continues to use HTTP.
if (isProduction) {
    app.set("trust proxy", 1);
}

main().then( () =>{
    console.log("Connected to MongoDB");
}).catch(err => {
    console.log("Error connecting to mongoDB:", err);
})
async function main() {
    await mongoose.connect(dburl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cookieParser(process.env.SECRET));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const store = MongoStore.create({
    mongoUrl: dburl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24*3600,
});



const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7*24*60*60*1000,
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
    },
};

// app.get("/", (req, res) => {
//     res.send("Helo World, Iam Root")
// });



store.on("error", (err) => {
    console.error("Mongo session store error:", err);
});

sessionOptions.store = store;



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// A Render session can retain its user ID even when Passport does not restore
// req.user on the following request. Validate that ID against MongoDB and
// restore req.user so protected features (reviews, new listings, and logout)
// work consistently.
app.use(async (req, res, next) => {
    const authenticatedUserId = req.session.userId || req.signedCookies.authUserId;
    if (req.user || !authenticatedUserId) {
        return next();
    }

    try {
        const sessionUser = await User.findById(authenticatedUserId);
        if (sessionUser) {
            req.user = sessionUser;
            req.session.userId = sessionUser._id.toString();
            console.info("[auth] Restored authenticated user from saved identity.");
        } else {
            delete req.session.userId;
            res.clearCookie("authUserId", authCookieClearOptions);
            console.warn("[auth] Saved identity did not match a user.");
        }
        next();
    } catch (err) {
        next(err);
    }
});


app.use((req, res, next) => {
    const successMessages = req.flash("success");
    res.locals.success = successMessages;
    res.locals.error = req.flash("error");
    // Keep the navigation state available when the session is present but
    // Passport has not restored req.user for this request.
    const sessionUserId = req.session.userId;
    res.locals.currUser = req.user || (sessionUserId ? { _id: sessionUserId } : null);
    const justAuthenticated = successMessages.some((message) =>
        /^Welcome(?: back)? to Wanderlust!?/i.test(message)
    );
    res.locals.isLoggedIn = Boolean(req.user || sessionUserId || justAuthenticated);
    next();
});

// app.get("/demouser", async(req, res) => {
//     let fakeUser = new User({
//         email: "student@gmail.com",
//         username: "delta-student"
//     });
//    let registeredUser =  await User.register(fakeUser,"helloworld");
//    res.send(registeredUser);
// })



app.use("/listings",listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/",userRouter);

app.all("/{*splat}", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
    let {statuscode = 500, message = "Something went wrong!"} = err;
    res.status(statuscode).render('error.ejs', { statuscode, message, err });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
