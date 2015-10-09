/**
   @summary User-related db access
   @desc
     ### Data Model

     All in global subspace 'users':

         [USER_ID, 'account'] = { id: USER_ID,
                                token: string
                              }

         [USER_ID, 'credentials'] : service credentials (google, etc) subspace

         [USER_ID, 'stories_index', STORY_ID*] = true

*/

@ = require([
  'mho:std',
  {id:'mho:flux/kv', name:'kv'}
]);

// XXX could cache value
var USERS = transaction -> (transaction||@env('services').db) .. @kv.Subspace('users');
exports.USERS = USERS;

//----------------------------------------------------------------------

/**
   @function findAccount
   @summary Retrieve an existing user account
   @param {String} [user_id] user id (email)
   @param {optional Object} [transaction] 
*/
function findAccount(user_id, transaction) {
  var record = USERS(transaction) .. @kv.get([user_id, 'account'], undefined);
  return record;
}
exports.findAccount = findAccount;

/**
   @function createAccount
   @summary Create a new account; throw if account already exists
   @param {Object} [record] { id, access_token } object
*/
function createAccount(record, credentials) {
  if (!record.id || !record.access_token)
    throw new Error("invalid record format for creating account");
  
  USERS() .. @kv.Subspace([record.id]) .. @kv.withTransaction {
    |T|
    if (T .. @kv.get(['account'], undefined))
      throw new Error("Account already exists");
    T .. @kv.set(['account'], record);

    if (credentials) {
      credentials .. @propertyPairs .. @each {
        |[key, val]|
        T .. @kv.set(['credentials', key], val);
      }
    }
  }
  return record;
}
exports.createAccount = createAccount;

/**
   @function verifyAccount
   @summary Check that an account with the given credentials exists
   @param {String} [credentials]
*/
function verifyAccount(credentials) {
  try {
    if (!credentials) throw new Error('empty credentials');
    var creds = credentials .. JSON.parse;
    if (!creds.id || !creds.access_token)
      throw new Error("credentials missing fields");

    var record = USERS() .. @kv.get([creds.id, 'account']);
    if (record.access_token !== creds.access_token)
      throw new Error("invalid credentials");
    else
      return creds.id;
  }
  catch (e) {
    console.log("verifyAccount: #{e}");
    return false;
  }
}
exports.verifyAccount = verifyAccount;

/**
   @function getCredentials
   @summary Return the stored service credentials for the current user (or undefined)
   @param {String} [user_id]
   @param {String} [credentials_key]
*/
function getCredentials(user_id, credentials_key) {
  return USERS() .. @kv.get([user_id, 'credentials', credentials_key], undefined); 
}
exports.getCredentials = getCredentials;

/**
   @function Stories
   @summary XXX write me
   @param {String} [user_id]
*/
function Stories(user_id) {
  return USERS() ..
    @kv.Subspace([user_id, 'stories_index']) ..
    @kv.observeQuery(@kv.RANGE_ALL) ..
    @transform(kvs -> kvs .. @project(function([key,val]) {
      var story_data = require('./stories').getPublicStory(key);
      var thumbnail = story_data && story_data[0] ? story_data[0][0] : undefined;
      return {
        id: key,
        title: 'Black Widow Pt.2',
        thumbnail: thumbnail
      }
    }));
}
exports.Stories = Stories;
