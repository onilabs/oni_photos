/**
   @summary User authentication
*/

@ = require([
  'mho:std',
  'mho:app',
  {id:'./widgets', name: 'widgets'},
  {id:'./backfill', name:'backfill'}
]);

var CREDENTIALS_KEY = 'oni_photos_creds';

//----------------------------------------------------------------------
/**
   @function login
   @summary Login the user, potentially displaying a login/oauth dialog
   @param {Object} [api] Connected [main.api::] object
   @return {Object} Authenticated [main.api::Session] object
*/
function login(api) {
  if (localStorage[CREDENTIALS_KEY]) {
    try {
      // try stored credentials:
      return api.Session(window.location.origin, localStorage[CREDENTIALS_KEY]);
    }
    catch (e) {
      console.log(e);
      // error parsing credentials, or not authorized
      delete localStorage[CREDENTIALS_KEY];
    }
  }

  // if we're here, the user needs to log in
  document.body .. @appendContent(
    @widgets.Page({
      title: 'PHOTO STORIES',
      body: [
        @widgets.Action('google_login') :: "Log in with Google"
      ]
    })
  ) {
    ||
    @backfill.cmd.stream(['google_login']) .. @each {
      |[command, param]|
      var credentials = undefined;
      if (command === 'google_login') {
        @backfill.withPopupWindow {
          |redirect|
          credentials = api.loginGoogle(window.location.origin, redirect);
        }
        if (credentials) {
          try {
            var session = api.Session(window.location.origin, credentials);
            // success; we've got a session
            // remember credentials for next time
            localStorage[CREDENTIALS_KEY] = credentials;
            return session;
          }
          catch (e) {
            console.log("Failure obtaining session for credentials #{e}");
            // go round loop again
          }
        }
      }
    }
  }
}
exports.login = login;


//----------------------------------------------------------------------

function authenticateGoogle(session) {
  
  @mainContent .. @appendContent(    
    @Btn('primary block', 'Authenticate with Google') ..
      @backfill.cmd.Click('authenticate')
  ) {
    ||
    
    @backfill.cmd.stream() .. @each {
      |[command, param]|
      if (command === 'authenticate') {

        @backfill.withPopupWindow {
          |redirect|
          if (session.authorizeGoogle(redirect))
            return; // successfully authorized
        }
        
      }
    }
    
  }
}
exports.authenticateGoogle = authenticateGoogle;
