/**
   @summary Google account management
*/

@ = require([
  'mho:std',
  {id: 'backend:db/users', name: 'users'},
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
    var account = @users.findAccount(id_token.email);

    if (!account) {
      // nope -> let's create one with a random access token
      account = @users.createAccount({id: id_token.email,
                                      access_token: @random.createID()
                                     },
                                     {
                                       google_tokens: google_tokens
                                     });
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

