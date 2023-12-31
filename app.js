require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session  = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");








const app = express();


app.use(express.static("public"));
app.set("view engine", 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

// setting up session
app.use(session({
    secret:"Our little secret.",
    resave: false,
    saveUninitialized: false
}));

// setting up passport
app.use(passport.initialize());
app.use(passport.session());






mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret:String
});




// adding passportLocalMongoose as a plugin to our schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);





const User = new mongoose.model("User", userSchema);



 
// using passportLocalMongoose to create local login strategy
passport.use(User.createStrategy());

// using passportLocalMongoose to serialize and deserialize user
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {

    // console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);











app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",passport.authenticate("google",{scope:["profile"]}));

app.get("/auth/google/secrets",passport.authenticate("google",{failureRedirect:"/login"}),function(req,res){
    res.redirect("/secrets");
});

app.get("/login",function (req,res) {  
    res.render("login");
});

app.get('/register',function (req,res) {
    res.render("register");
});


// redirecting to secret page after checking user is authenticated or not
app.get("/secrets",function(req,res){
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }else{
    //     res.redirect("/login");
    // }
    User.find({"secret":{$ne:null}}).then(function (foundUsers) { 
            if(foundUsers)
            {
                res.render("secrets",{usersWithSecrets:foundUsers})
            }
     });
});
app.get("/submit",function (req,res) {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
})

// logging out
app.get("/logout",function (req,res){
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
});











app.post("/register",function(req,res){
    User.register({username: req.body.username}, req.body.password, function (err,user) {
        if(err)
            res.redirect("/register");
        else   
        {
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        } 
      });
});
app.post("/login",function(req,res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user,function(err)
    {
        if(err)
            console.log(err);
        else
        {
            passport.authenticate("local")(req, res, function () {
              res.redirect("/secrets");
            });
        }
    });
});

app.post("/submit",function (req,res) { 
    const submittedsecret = req.body.secret;
    User.findById(req.user.id).then(function (foundUser) { 
        if(foundUser)
        {
            foundUser.secret = submittedsecret;
            foundUser.save().then(function () {
                res.redirect("/secrets");
              })
        }

     });
 });













app.listen(3000, function(){
    console.log("Server started on port 3000");
});
