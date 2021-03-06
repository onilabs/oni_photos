/**
   @summary User authentication
*/

@ = require([
  'mho:std',
  'mho:app',
  {id:'./widgets', name: 'widgets'},
  {id:'./backfill', name:'backfill'}
]);

var CREDENTIALS_KEY = 'oni_photos_creds2';

//----------------------------------------------------------------------

/**
   @variable Session
   @summary Authenticated Session object
*/
var Session = @ObservableVar();

//----------------------------------------------------------------------
/**
   @function doSessionMenu
   @summary xxx write me
*/
function doSessionMenu() {
  try {
    while (1) {
      doUserLogin();
      doUserLogout();
    }
  }
  catch (e) {
    console.log("Session Loop: #{e}");
    // just return to main caller; this will effectively 'restart' our app
    return;
  }
  finally {
    @env('Session').set(undefined);
  }
}
exports.doSessionMenu = doSessionMenu;


function doUserLogin() {
  // try to log in with stored credentials:
  if (localStorage[CREDENTIALS_KEY]) {
    try {
      // try stored credentials:
      @env('Session').set(@env('api').Session(window.location.origin, localStorage[CREDENTIALS_KEY]));
      // we succeeded to obtain a session with stored credentials:
      return;
    }
    catch (e) {
      console.log(e);
      // error parsing credentials, or not authorized
      delete localStorage[CREDENTIALS_KEY];
    }
  }

  // if we're here, the user needs to log in explicitly
  @sessionMenu .. @replaceContent(
    @widgets.Action('google_login') :: `<div class="menubar-button">Log in with Google</div>`
  ) {
    ||
    @backfill.cmd.stream(['google_login']) .. @each {
      |[command, param]|
      var credentials = undefined;
      if (command === 'google_login') {
        @backfill.withPopupWindow {
          |redirect|
          credentials = @env('api').loginGoogle(window.location.origin, redirect);
        }
        if (credentials) {
          try {
            var session = @env('api').Session(window.location.origin, credentials);
            // success; we've got a session
            // remember credentials for next time
            localStorage[CREDENTIALS_KEY] = credentials;
            @env('Session').set(session);
            return;
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

function logout() {
  delete localStorage[CREDENTIALS_KEY];
  throw new Error('logout'); // this will effectively restart the app
}

function doUserLogout() {
 @sessionMenu .. @replaceContent(
     @Div() ..
       @Class('menubar-menu-session-avatar') .. 
       @Style("background-image: url(#{(@env('Session') .. @current).user.avatar})") ..
       @backfill.DropdownMenu([
         @A('Stories') .. @Attrib('href', '/'),
         @A('Sign out') .. @Attrib('href', '#') .. @OnClick(logout)
       ])
  ) {
   ||
   hold();
  }
}


//----------------------------------------------------------------------
// authenticate the user with google:
function authenticateGoogle(session) {
  
  @mainContent .. @appendContent(    
    @Btn('primary block', 'Authenticate with Google') ..
      @backfill.cmd.Click('authenticate')
  ) {
    ||
    
    @backfill.cmd.stream() .. @each {
      |[command, param]|
      if (command === 'authenticate') {

        if (session .. authorizeGoogle())
          return true;
      }
    }
  }
}
exports.authenticateGoogle = authenticateGoogle;

//----------------------------------------------------------------------
// authorize will google scopes:
function authorizeGoogle(session) {

  @backfill.withPopupWindow {
    |redirect|
    if (session.authorizeGoogle(redirect))
      return true;
    return false;
  }
}
exports.authorizeGoogle = authorizeGoogle;
