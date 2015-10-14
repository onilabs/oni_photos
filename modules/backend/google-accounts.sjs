/**
   @summary Google account management
*/

@ = require([
  'mho:std',
  {id: 'backend:db', name: 'db'},
  {id: 'mho:server/random', name: 'random'}
]);


// additional google scopes we're authenticating with:
var google_scopes = [
  'https://picasaweb.google.com/data/'
];

exports.login = function(origin, redirect) {
  var authentication_scopes = google_scopes.concat(['openid email profile']);
  var google_oauth_session = @env('services').google_api_oauth.APISession();
  var google_tokens = google_oauth_session.promptUserAuthorization(authentication_scopes, redirect, origin);

  if (!google_tokens.id_token) return false;
  
  // parse the id token:
  try {
    // id_token is header.payload.signature - see https://tools.ietf.org/html/rfc7519
    var id_token = google_tokens.id_token.split('.')[1] .. @base64ToOctets .. @utf8ToString;
    // replace trailing '0' bytes
    id_token = id_token.replace(/\0+$/, '');
    id_token = id_token .. JSON.parse;
  }
  catch (e) {
    console.log("failure parsing id token (#{e})");
    return false;
  }
  if (!id_token.email) return false;


  // XXX the following two should be transactional!
  try {
    // ok, we've got an authenticated email. check if we've got an account for it already:
    var account = @db.findAccount(id_token.email);

    if (!account) {
      // nope -> let's create one with a random access token

      var user_info = getUserInfo(google_tokens);

      account = @db.createAccount(
        {
          id: id_token.email,
          access_token: @random.createID(),
          name:  user_info.name,
          avatar: user_info.picture
        },
        {
          google_tokens: google_tokens
        });
    }
    else {
      @db.updateCredentials(
        id_token.email,
        {
          google_tokens: google_tokens
        });

      if (!account.name) {
        // XXX this is just to patch up our existing db with missing data
        var user_info = getUserInfo(google_tokens);
        account.name = user_info.name;
        account.avatar = user_info.picture;
        @db.modifyAccount(account);
      }
    }
  }
  catch (e) {
    console.log("Error in finding/creating account (#{e})");
    return false;
  }

  return { id:    account.id,
           access_token: account.access_token
         } .. JSON.stringify;
  
};

function getUserInfo(google_tokens) {
  // see https://developers.google.com/+/web/api/rest/openidconnect/getOpenIdConnect
  return @http.request("https://www.googleapis.com/oauth2/v3/userinfo",
                       {
                         headers: {
                           'Authorization': 'Bearer '+google_tokens.access_token 
                         }
                       }) .. JSON.parse;
  
}
