const express = require('express');
const app = express();
const session = require('express-session');
const dotenv = require('dotenv');
const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const handlebars  = require('express-handlebars');
var cookieParser = require('cookie-parser');

dotenv.config();

app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.use(cookieParser());

// config express-session
var sess = {
  secret: 'SUPERDUPERRANDOMSECRET3489573948573981209103812',
  cookie: { },
  resave: false,
  saveUninitialized: true
};

if (app.get('env') === 'production') {
  // Use secure cookies in production (requires SSL/TLS)
  app.set('trust proxy', 1);
  sess.cookie.secure = true;
}

// Configure Passport to use Auth0
var strategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL:
      process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
  },
  function (accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile);
  }
);

passport.use(strategy);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

app.use(session(sess));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', require('./routes/index'));


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
});