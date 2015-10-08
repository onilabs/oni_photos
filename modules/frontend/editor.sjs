@ = require([
  'mho:std',
  'mho:app',
  {id:'./widgets', name:'widgets'},
  {id:'./backfill', name:'backfill'},
  {id:'mho:surface/field', name:'field'}
]);


//----------------------------------------------------------------------

function do_edit_story(story_id) {
console.log(arguments .. @inspect);
  var session = @env('Session') .. @filter(x->!!x) .. @first();

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

  var EditorCSS = @CSS("
    {
      height: 100%;
    }

    .body {
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      padding: 10px;
    }

    .toolbox {
      position: fixed;
      right: 0; bottom: 0; left: 0;
      background-color: rgba(0, 0, 0, .9);
    }
  ");
  
  @mainContent .. @replaceContent(
    @field.Field({Value:Story}) ..
      @field.FieldMap() ::
        @Div() .. EditorCSS ::
          [ 
            @Div() .. @Class('body') ::
              @widgets.StoryEditWidget(Story, Selection),
            @Div() .. @Class('toolbox') ::
              @widgets.StoryEditPalette(session, Selection)
          ]
  ) {
    ||
    waitfor {
      synchronize_from_upstream();
    }
    or {
      @backfill.cmd.stream(['done']) .. @wait();
    }
    or {
      @contextMenu .. @replaceContent(
        `<a href="/story/${story_id}">View published story</a>`
      ) {
        ||
        hold();
      }
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
exports.do_edit_story = do_edit_story;
