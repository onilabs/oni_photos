/**
   @summary Main frontend application logic
*/

@ = require([
  'mho:std',
  'mho:app',
  {id:'./auth', name:'auth'},
  {id:'./widgets', name:'widgets'},
  {id:'./backfill', name:'backfill'},
  {id:'mho:surface/field', name:'field'}
]);

//----------------------------------------------------------------------

function do_index(session) {
  document.body .. @appendContent(
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


function do_edit_story(session, story_id) {

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
  
//  var Story = @ObservableVar(session.StoryData(story_id) .. @current);

  
  document.body .. @appendContent(
    @field.Field({Value:Story}) ..
      @field.FieldMap() ::  
        @widgets.Page({
          title:        'STORY',
          title_action: @Span() .. @backfill.cmd.Click('done') :: 'Done',
          
          body: @widgets.StoryEditWidget(Story),
          
          footer: @Div ..@Style('margin:10px;') ::
            @widgets.HorizontalPhotoStream(session)      
        })
  ) {
    ||
    waitfor {
      editing_logic();
    }
    or {
      synchronize_from_upstream();
    }
  }

  function editing_logic() {
    var selected_block;
    @backfill.cmd.stream(['done', 'select-block', 'click-photo']) .. @each {
      |[cmd,param]|
      
      if (cmd === 'select-block') {
        if (selected_block)
          selected_block.removeAttribute('selected');
        selected_block = param;
        selected_block.setAttribute('selected', true);
      }
      
      if (cmd === 'click-photo') {
        if (selected_block)
          (selected_block .. @field.Value()).set({type:'img', url:param});
      }
      
      if (cmd === 'done') return;
    }
  }

  function synchronize_from_upstream() {
    Upstream .. @each {
      |upstream|
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
exports.main = function(api) {

  var session = @auth.login(api);

  while (1) {
    var story_id = session .. do_index();
    session .. do_edit_story(story_id);
  }
};
