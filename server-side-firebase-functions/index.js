const functions = require('firebase-functions');

var SpotifyWebApi = require('spotify-web-api-node');
var origins = [ ]; //list possible domains of the app for CORS request
const cors = require('cors')({origin: origins});

var credentials = {
  clientId : 'SPOTIFY APP CLIENTID',
  clientSecret : 'SPOTIFY APP CLIENT SECRET',
  redirectUri : 'APP URL'
};

var scopes = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-modify-playback-state'
];



// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.getAuthUrl = functions.https.onRequest((request, response) => {
    var spotifyApi = new SpotifyWebApi(credentials);
    var authorizeURL = spotifyApi.createAuthorizeURL(scopes, new Date().getTime());
    response.redirect(authorizeURL);
});

exports.getAccessToken = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        if(request.method==='POST'){
            var spotifyApi = new SpotifyWebApi(credentials);
            var code = request.body.code;
            spotifyApi.authorizationCodeGrant(code)
                .then(function(data) {
                    response.status(200).send(data.body);
                }, function(err) {
                    response.status(500).send({error: err});
                });
            }
    });
});

exports.refreshAccessToken = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        if(request.method==='POST'){
            credentials.redirectUri = getRedirectUri(request.body.from);
            var spotifyApi = new SpotifyWebApi(credentials);
            var accessToken = request.body.access_token;
            var refreshToken = request.body.refresh_token;
            spotifyApi.setAccessToken(accessToken);
            spotifyApi.setRefreshToken(refreshToken);
            spotifyApi.refreshAccessToken()
                .then(function(data) {
                    response.status(200).send(data.body);
                }, function(err) {
                    response.status(500).send({error: err});
                });
            }
    });
});
