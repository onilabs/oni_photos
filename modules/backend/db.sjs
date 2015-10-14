/**
   @summary Low-level DB access
   desc
     ### DATA MODEL

         STORIES
         -------

         ['stories', STORY_ID, 'data'] = { 
                                           ...
                                         }

         ['stories', STORY_ID, 'owner'] = USER_ID

         ['stories', STORY_ID, 'editors_index', USER_ID*] = true

         

         USERS
         -----

         ['users', USER_ID, 'account'] = { id: USER_ID,
                                           access_token: string,
                                           name: string,
                                           avatar: string (url)
                                         }

         ['users', USER_ID, 'credentials'] : service credentials (google, etc) subspace

         ['users', USER_ID, 'stories_index', STORY_ID*] = true


*/

@ = require([
  'mho:std',
  {id:'mho:flux/kv', name:'kv'},
  {id:'mho:server/random', name:'random'},
  {id:'lib:datastructures', name: 'data'}
]);

// XXX could cache values
var STORIES = transaction -> (transaction||@env('services').db) .. @kv.Subspace('stories');
var USERS = transaction -> (transaction||@env('services').db) .. @kv.Subspace('users');


//----------------------------------------------------------------------

/**
   @function createStory
   @summary Create a new story owned by the given user
   @param {String} [user_id]
   @return {String} story id
*/
function createStory(user_id) {

  var story_id = @random.createID();
  
  @env('services').db .. @kv.withTransaction {
    |T|
    if (!findAccount(user_id, T))
      throw new Error("Unknown user '#{user_id}'");
    STORIES(T) .. @kv.set([story_id, 'data'], @data.emptyStory());
    STORIES(T) .. @kv.set([story_id, 'owner'], user_id);
    USERS(T) .. @kv.set([user_id, 'stories_index', story_id], true);
  }
  return story_id;
}
exports.createStory = createStory;

/**
   @function Data
   @summary XXX write me
   @param {String} [story_id]
   @param {String} [user_id]
*/
function Data(story_id, user_id) {
  // XXX verify that the user is allowed to view
  return STORIES() ..
    @kv.observe([story_id, 'data']);
}
exports.Data = Data;

/**
   @function getPublicStory
   @summary XXX write me
   @param {String} [story_id]
*/
function getPublicStory(story_id) {
  // XXX verify that the story is public
  var story = STORIES() ..
    @kv.get([story_id, 'data']);
  var owner = STORIES() ..
    @kv.get([story_id, 'owner']);
  var owner_account = findAccount(owner);
  return {
    owner_name: owner_account.name,
    owner_avatar: owner_account.avatar,
    data: story
  };
}
exports.getPublicStory = getPublicStory;

/**
   @function modifyStory
   @summary XXX write me
   @param {String} [story_id]
   @param {Object} [data]
   @param {String} [user_id]
*/
function modifyStory(story_id, data, user_id) {
  @env('services').db .. @kv.withTransaction {
    |T|
    if (STORIES(T) .. @kv.get([story_id, 'owner']) !== user_id)
      throw new Error("not authorized");
    STORIES(T) ..
      @kv.set([story_id, 'data'], data);
  }
}
exports.modifyStory = modifyStory;

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
   @function updateCredentials
   @summary Update a users service credentials
*/
function updateCredentials(user_id, credentials) {
  USERS() .. @kv.Subspace([user_id,'credentials']) .. @kv.withTransaction {
    |T|
    credentials .. @propertyPairs .. @each {
      |[key, val]|
      T .. @kv.set(key, val);
    }
  }
}
exports.updateCredentials = updateCredentials;

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
      //XXX getPublicStory does too much; we want '@stories.data'
      var story_data = getPublicStory(key).data;
      return {
        id: key,
        title: story_data.title,
        // XXX the trycatch is just because i have some broken data in my db
        thumbnail: @fn.trycatch(@data.titleThumb, -> null)(story_data)
      }
    }));
}
exports.Stories = Stories;
