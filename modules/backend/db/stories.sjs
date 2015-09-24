/**
   @summary Stories-related db access
   @desc
     ### Data Model

     All in global subspace 'stories':

         [STORY_ID, 'data'] = { 
                                content: ...
                              }

         [STORY_ID, 'owner'] = USER_ID

         [STORY_ID, 'editors_index', USER_ID*] = true

*/

@ = require([
  'mho:std',
  {id:'mho:flux/kv', name:'kv'},
  {id:'mho:server/random', name:'random'},
  {id:'./users', name:'users'}
]);

// XXX could cache value
var STORIES = transaction -> (transaction||@env('services').db) .. @kv.Subspace('stories');

//----------------------------------------------------------------------

var blank_story = {
  content: [
    [{type:'blank'},{type:'blank'}],
    [{type:'blank'},{type:'blank'}],
    [{type:'blank'},{type:'blank'}],
    [{type:'blank'},{type:'blank'}],
    [{type:'blank'},{type:'blank'}],
    [{type:'blank'},{type:'blank'}],
    [{type:'blank'},{type:'blank'}],
    [{type:'blank'},{type:'blank'}]
  ]
};


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
    if (!@users.findAccount(user_id, T))
      throw new Error("Unknown user '#{user_id}'");
    STORIES(T) .. @kv.set([story_id, 'data'], blank_story);
    STORIES(T) .. @kv.set([story_id, 'owner'], user_id);
    @users.USERS(T) .. @kv.set([user_id, 'stories_index', story_id], true);
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
   @function modifyStory
   @summary XXX write me
   @param {String} [story_id]
   @param {Object} [data]
   @param {String} [user_id]
*/
function modifyStory(story_id, data, user_id) {
  // XXX verify that the user can edit the story
  STORIES() ..
    @kv.set([story_id, 'data'], data);
}
exports.modifyStory = modifyStory;
