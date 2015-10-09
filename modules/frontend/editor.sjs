@ = require([
  'mho:std',
  'mho:app',
  {id:'./widgets', name:'widgets'},
  {id:'./backfill', name:'backfill'},
  {id:'mho:surface/field', name:'field'}
]);


//----------------------------------------------------------------------

function do_edit_story(story_id) {

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
    }

    .toolbox {
      position: fixed;
      right: 0; bottom: 0; left: 0;
      background-color: #fff;
      box-shadow: 0px -1px 8px 0px rgba(78,45,45,0.12);
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
        `<a class="menubar-button is-save" href="/story/${story_id}">Stop editing</a>`
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
