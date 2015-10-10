/**
   @summary User-related db access
   @desc
     ### Data Model

     All in global subspace 'users':

         [USER_ID, 'account'] = { id: USER_ID,
                                  access_token: string,
                                  name: string,
                                  avatar: string (url)
                                }

         [USER_ID, 'credentials'] : service credentials (google, etc) subspace

         [USER_ID, 'stories_index', STORY_ID*] = true

*/

@ = require([
  'mho:std',
  {id:'mho:flux/kv', name:'kv'},
  {id:'lib:datastructures', name:'data'}
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
   @param {Object} [record] { id, access_token, ... } object
   @param {Object} [credentials] Keyed object with credentials records
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
   @function modifyAccount
   @summary Modify an existing account
   @param {Object} [record] 
*/
function modifyAccount(record) {
  if (!record.id) 
    throw new Error("invalid record format");
  
  USERS() .. @kv.Subspace([record.id]) .. @kv.withTransaction {
    |T|
    T .. @kv.get(['account']); // throws if account doesn't exist
    T .. @kv.set(['account'], record);
  }
}
exports.modifyAccount = modifyAccount;

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
      return {id: record.id, name: record.name, avatar: record.avatar};
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
      return {
        id: key,
        title: story_data.title,
        // XXX the trycatch is just because i have some broken data in my db
        thumbnail: @fn.trycatch(@data.titleThumb, -> null)(story_data)
      }
    }));
}
exports.Stories = Stories;
