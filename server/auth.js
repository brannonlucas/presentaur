
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy; //OAuth 2.0
var LinkedInStrategy = require('passport-linkedin').Strategy;
var User = require('./userHelpers.js');
if(!process.env.DEPLOYED) {var Config = require('./config.js');}

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    if (err){console.log("unable to find user by id ", err);}
    done(err, user);
  });
});


// Google OAuth 2.0
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENTID || Config.GOOGLE_CLIENTID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || Config.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK || "http://localhost:5000/auth/google/return"
  },
  function(accessToken, refreshToken, profile, done) {
    var newUser = {
      displayName: profile.displayName,
      name: profile.name,
      email: profile.emails[0].value.toLowerCase(),
      headline: null,
      pictureUrl: profile._json.picture
    };
    User.findOrCreate(newUser, function(err, user) {
      if (err){console.log("unable to find or create  a user after logging in with google ",err);}
      return done(err, user);
    });
  }
));


passport.use(new LinkedInStrategy({
    consumerKey: process.env.LINKEDIN_API_KEY || Config.LINKEDIN_API_KEY,
    consumerSecret: process.env.LINKEDIN_SECRET_KEY || Config.LINKEDIN_SECRET_KEY,
    callbackURL: process.env.LINKEDIN_CALLBACK || "http://localhost:5000/auth/linkedin/return",
    profileFields: ['id', 'first-name', 'last-name', 'email-address', 'headline','picture-url']
  },
  function(token, tokenSecret, profile, done) {
    var newUser = {
      displayName: profile.displayName,
      name: profile.name,
      email: profile.emails[0].value.toLowerCase(),
      headline: profile._json.headline,
      pictureUrl: profile._json.pictureUrl
    };
    User.findOrCreate(newUser, function (err, user) {
      if (err){console.log("unable to find or create  a user after logging in with LinkedIn ",err);}
      return done(err, user);
    });
  }
));
