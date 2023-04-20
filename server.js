const express = require("express");
require("dotenv").config();
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
var GoogleStrategy = require("passport-google-oauth2").Strategy;
const cookieParser = require("cookie-parser");
const cors = require("cors");

app.use(session({ secret: "mysecretkeyforgoogleauth" }));
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

//app.use(cors());
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
var data=null;
app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/GoogleAuth", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to database");
  })
  .catch((err) => {
    console.log("Error in connecting to the database : ", err);
  });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    maxLength: [30, "Name cannot exceed 30 characters"],
    minLength: [4, "Name should have more than 4 characters"],
  },
  email: {
    type: String,
    unique: true,
  },
  googleId: {
    type: String,
    default: null,
  },
});

const User = mongoose.model("User", userSchema);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:4000/auth/google/callback",
      passReqToCallback: true,
    },
    function (request, accessToken, refreshToken, profile, done) {
      // Find or Create user here
      User.findOne({ email: profile.email }).then((currentUser) => {
        if (currentUser) {
          // already have this user
          // console.log('user is: ', profile);
          done(null, currentUser);
        } else {
          // if not, create user in our db
          new User({
            name: profile.displayName,
            email: profile.email,
            googleId: profile.id,
          })
            .save()
            .then((newUser) => {
              // console.log('created new user: ', newUser);
              done(null, newUser);
            });
        }
      });
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get("/auth/google", (req, res) => {
  console.log("In googlelogin 1");
  res.set("Access-Control-Allow-Origin", "http://localhost:3000");
  res.set("Access-Control-Allow-Credentials", "true");
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })(req, res);
});

app.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect("/login");
    }
    console.log("in callback");
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      console.log("User authenticated:", req.user);
      res.status(200).send({ user: req.user });
    });
  })(req, res, next);
});


app.get("/logout", async (req, res) => {
  console.log("In logout");
  res.set("Access-Control-Allow-Origin", "http://localhost:3000");
  res.set("Access-Control-Allow-Credentials", "true");
  console.log("In logout if", req.user);
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .send({ success: "false", message: "Unable to logout user" });
    }
    return res
      .status(200)
      .send({ success: "true", message: "Successfully Logged Out" });
  });
  console.log("at the end");
});

app.post("/isLoggedIn", async (req, res) => {
  console.log("req.user is : ", req.user);
  if (req.user) {
    return res.send({ success: "true", message: "Logged in", user: req.user });
  } else {
    res
      .status(200)
      .send({ success: "false", message: "Not logged in", user: req.user });
  }
});

app.listen(process.env.BACKEND_PORT, () => {
  console.log("app is running on port number", process.env.BACKEND_PORT);
});
