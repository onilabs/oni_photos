/**
   @summary User-related db access
   @desc
     ### Data Model

     All in global subspace 'users':

         [EMAIL, 'account'] = { id: EMAIL,
                                token: string
                              }

         [EMAIL, 'credentials'] : service credentials (google, etc) subspace

*/

@ = require([
  'mho:std',
  {id:'mho:flux/kv', name:'kv'},
  {id:'mho:server/random', name:'random'}
]);

// XXX could cache value
var USERS = -> @env('services').db .. @kv.Subspace('users');

//----------------------------------------------------------------------

/**
   @function findAccount
   @summary Retrieve an existing user account
   @param {String} [id] Account id (email)
*/
function findAccount(id) {
  var record = USERS() .. @kv.get([id, 'account'], undefined);
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
   @param {String} [user]
   @param {String} [credentials_key]
*/
function getCredentials(user, credentials_key) {
  return USERS() .. @kv.get([user, 'credentials', credentials_key], undefined); 
}
exports.getCredentials = getCredentials;
