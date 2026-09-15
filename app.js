if(process.env.NODE_ENV !="production"){
    require("dotenv").config();
}

const express=require("express");
const app=express();
const mongoose=require("mongoose");
const path=require("path");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");
const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const session=require("express-session");
const { MongoStore } = require("connect-mongo");
const flash=require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user.js");

const List = require("./models/listing.js");
const reviewRouter=require("./routes/review.js");
const listingRouter=require("./routes/listing.js");
const userRouter=require("./routes/user.js");

// const MONGO_URL="mongodb://127.0.0.1:27017/wanderlust";
const dbUrl=process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(dbUrl);

    console.log("================================");
    console.log("MONGODB CONNECTED");
    console.log("Ready State:", mongoose.connection.readyState);
    console.log("================================");

    const testListings = await List.find({});

    console.log("SUCCESS!");
    console.log("Listings found:", testListings.length);
}

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"/public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600
});

store.on("error", (err) => {
    console.log("ERROR IN MONGO SESSION STORE", err);
});


const sessionOptions={
    store,
    secret: process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        httpOnly:true,
        expires:Date.now()+1000*60*60*24*7,
        maxAge:1000*60*60*24*7
    }
};


// app.get("/",(req,res)=>{
//  res.send("Hi,Im root!!!")
// })


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    console.log(res.locals.success);
    res.locals.error=req.flash("error");
    res.locals.currentUser=req.user;
    next();
});


app.use("/listings", listingRouter);
app.use("/listings", reviewRouter);
app.use("/", userRouter);


app.use((req,res,next)=>{
    next(new ExpressError("Page Not Found", 404));
});


app.use((error, req, res, next) => {
    let {statusCode = 500, message = "Something went wrong!"}=error;
    res.status(statusCode).render("listings/error.ejs", {message});
});


main()
    .then(() => {
        console.log("DB setup complete");

        app.listen(8080, () => {
            console.log("Server is listening to the port");
        });
    })
    .catch((err) => {
        console.log("DATABASE ERROR:");
        console.log(err);
    });