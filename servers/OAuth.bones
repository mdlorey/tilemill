var config = Bones.plugin.config;
var passport = require('passport');
var util = require('util');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;

server = Bones.Server.extend({});
server.prototype.initialize = function(app) {
    var auth = passport.authenticate('mapbox', {
        session: false,
        failureRedirect: '/oauth/mapbox/fail'
    });
    var body = '<script type="text/javascript">parent.postMessage("done", "*");</script>';
    this.use(passport.initialize());
    this.get('/oauth/mapbox', auth);
    this.get('/oauth/mapbox/token', auth, function(req, res) {
        // The user ID is *required* here. If it is not provided
        // (see error "handling" or lack thereof in Strategy#userProfile
        // below) we basically treat it as an error condition.
        new models.Config().save({
            syncAccount: req.user.id ? req.user.id : '',
            syncAccessToken: req.user.id ? req.user.accessToken : ''
        }, {
            success: function() { res.send(body); },
            error: function() { res.send(body); }
        });
    });
    this.get('/oauth/mapbox/fail', function(req, res) {
        new models.Config().save({
            syncAccount: '',
            syncAccessToken: ''
        }, {
            success: function() { res.send(body); },
            error: function() { res.send(body); }
        });
    });
    passport.use(new Strategy());
    passport.serializeUser(function(obj, done) { done(null, obj); });
    passport.deserializeUser(function(obj, done) { done(null, obj); });
};

// Add passport OAuth2 authorization.
function Strategy() {
    OAuth2Strategy.call(this, {
        authorizationURL: config.syncURL + '/oauth/authorize',
        tokenURL:         config.syncURL + '/oauth/access_token',
        clientID:         'tilemill',
        clientSecret:     'tilemill',
        callbackURL:      'http://0.0.0.0:' + config.port + '/oauth/mapbox/token'
    },
    function(accessToken, refreshToken, profile, callback) {
        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;
        return callback(null, profile);
    });
    this.name = 'mapbox';
}
util.inherits(Strategy, OAuth2Strategy);
Strategy.prototype.userProfile = function(accessToken, done) {
    this._oauth2.get(config.syncURL + '/oauth/user', accessToken, function (err, body) {
        // oauth2 lib seems to not handle errors in a way where
        // we can catch and handle them effectively. We attach them
        // to the profile object here for our own custom handling.
        if (err) {
            return done(null, { error:err });
        } else {
            return done(null, JSON.parse(body));
        }
    });
};

