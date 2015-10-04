/**
   @summary Main frontend application logic
*/

require('/hubs');

@ = require([
  'mho:std',
  'mho:app',
  {id:'./auth', name:'auth'},
  {id:'./widgets', name:'widgets'},
  {id:'./backfill', name:'backfill'},
  {id:'mho:surface/field', name:'field'},
  {id:'mho:surface/api-connection',
   include: ['withResumingAPI']
  }

]);

//----------------------------------------------------------------------

function do_index() {
  var session = @env('Session') .. @filter(x->!!x) .. @first();
  @mainContent .. @replaceContent(
    @widgets.Page({
      title:        'PHOTO STORIES',
      title_action: @Span() .. @backfill.cmd.Click('add_story') :: '+',
      body:
      session.Stories() .. @transform(function(stories) {
        var arr = stories ..
          @map(id -> @Li([id .. @widgets.Action('edit_story', id),
                          `&nbsp;<a href="${window.location.origin}/story/${id}">public url</a>`
                         ]));

        if (!arr.length) {
          return `<h1>You do not have any photo stories yet.</h1>
                  <hr>
                  <p>Photo stories allows you to create simple and beautiful photo & text based
                   albums using your existing photos in the cloud.</p>
                 `
        }
        else
          return @Ul(arr);
      })
    })
  ) {
    ||
    @backfill.cmd.stream(['add_story', 'edit_story']) .. @each {
      |[cmd, param]|
      if (cmd === 'add_story')
        return undefined;
      if (cmd === 'edit_story')
        return param; // param = story id
    }
  }  
}

//----------------------------------------------------------------------


function do_edit_story(story_id) {
  var session = @env('Session') .. @filter(x->!!x) .. @first();
  if (!story_id) {
    story_id = session.createStory();
  }

  // xxx hack
  var Upstream = session.StoryData(story_id);
  var Story = @ObservableVar(Upstream .. @current);
  var old_set = Story.set;
  var old_modify = Story.modify;
  
  Story.set = function(val) {
    console.log('setting story');
    if (!@eq(val, Story .. @current)) {
      old_set.call(Story, val);
      console.log('setting upstream');
      session.modifyStory(story_id, val);
    }
  };
  Story.modify = function(f) {
    throw new Error("write me");
  };
  
  var Selection = @ObservableVar();

  document.body .. @appendContent(
    @field.Field({Value:Story}) ..
      @field.FieldMap() ::  
        @widgets.Page({
          title:        'STORY',
          title_action: @Span() .. @backfill.cmd.Click('done') :: 'Done',
          
          body: @widgets.StoryEditWidget(Story, Selection),
          
          footer: @widgets.StoryEditPalette(session, Selection)      
        })
  ) {
    ||
    waitfor {
      synchronize_from_upstream();
    }
    or {
      @backfill.cmd.stream(['done']) .. @wait();
    }
  }

  function synchronize_from_upstream() {
    Upstream .. @each.track {
      |upstream|
      // XXX need to fix synchronization for real
      hold(2000);
      if (!@eq(upstream, Story .. @current)) {
        console.log('setting from upstream');
        Story.set(upstream);
      }
    }
  }
  
}

//----------------------------------------------------------------------

/**
   @function main
   @param {Object} [api] Connected [./main.api::] object
   @summary Main frontend application procedure
*/
function main(startup_parameters) {
  console.log(startup_parameters .. @inspect);
  @env.set('api', null);
  @env.set('Session', @ObservableVar());
  while (1) {
    @withResumingAPI(require.url('./main.api')) {
      |api|
      @env.set('api',api);
      
      waitfor {
        // this will fill in @env('Session') when we have an authenticated session:
        @auth.doSessionMenu();
      }
      or {
        // main ui logic
        while (1) {
          var story_id = do_index();
          do_edit_story(story_id);
        }
      }
    }
  }
};
exports.main = main;
