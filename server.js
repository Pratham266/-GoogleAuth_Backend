const express = require("express");
require('dotenv').config();
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const cookieParser = require("cookie-parser");
const cors = require('cors');
app.use(cookieParser());

app.use(cors());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


//passport session code
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  //mongoose connection
mongoose.connect(
    'mongodb://localhost:27017/GoogleAuth',
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
);
mongoose.connection.on('connected', () => {
    console.log('Connected to the database');
});
mongoose.connection.on('error', (err) => {
    console.log('Error connecting to the database:', err);
});

//user schema
const userSchema = new mongoose.Schema ({
    username: String,
    googleId: String,
  });

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id)
      .then((user) => {
        done(null, user);
      })
      .catch((err) => {
        done(err);
      });
  });
  
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google/callback",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    User.findOrCreate({username: profile.emails[0].value,googleId:profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//ROUTE MIDDLWARE
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile","email"],prompt: "select_account" })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "http://localhost:3000" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    console.log(req.user.username);
    // res.cookie("user_email",req.user.username,{maxAge:86400000})//cookie set for the 1 day
    res.redirect("http://localhost:3000/home");
  }
);

//LOGOUT OPTION
app.get("/logout", function(req, res){
  console.log("in logout")
    // res.clearCookie("connect.sid");
    // res.clearCookie('connect.sid', { domain: 'localhost', path: '/' });
    res.redirect("http://localhost:3000/");
    console.log("below logout")
  });

app.listen((process.env.BACKEND_PORT),()=>{
    console.log("app is running on port number",process.env.BACKEND_PORT)
})