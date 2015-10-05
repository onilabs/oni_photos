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
  },
  {id:'./navigation', name: 'navigation'}

]);

//----------------------------------------------------------------------

function do_index() {

  @env('Session') .. @each.track {
    |session|
    if (!session) 
      do_index_no_session();
    else
      do_index_with_session(session);
  }
}

function do_index_no_session() {
  @mainContent .. @replaceContent(
    require('lib:static_html').index()
  );
}

function do_index_with_session(session) {
  @mainContent .. @replaceContent(
    @Div() ::
      [
        @widgets.Action('add_story') :: 'Create new story',

        session.Stories() .. @transform(function(stories) {
          var arr = stories ..
            @map(id -> @Li(` ${id} 
                             <a href="/story/${id}/edit">edit</a>
                             &nbsp;
                             <a href="/story/${id}">public url</a>
                           `
                           ));
          
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
      ]
  ) {
    ||
    @backfill.cmd.stream(['add_story']) .. @each {
      |[cmd, param]|
      if (cmd === 'add_story') {
        var id = session.createStory();
        @navigation.navigate("/story/#{id}/edit");
        return;
      }
    }
  }  
}

//----------------------------------------------------------------------

function do_show_story(url,story_id) {
  var story_content = @env('api').getPublicStory(story_id).content;
  @mainContent .. @replaceContent(
    require('lib:static_html').publishedStory(story_content)
  ) {
    ||
    console.log('content replaced');
    hold();
  }
}

//----------------------------------------------------------------------

function do_edit_story(url, story_id) {
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
      display: flex;
      flex-direction: column;
      flex-wrap: nowrap;
    }

    .body {
      flex-grow: 1;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      padding: 10px;
    }

    .toolbox {
      flex-shrink: 0;
      background-color: #1e1e1e;
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
    console.log('starting API loop');
    @withResumingAPI(require.url('./main.api')) {
      |api|
      @env.set('api',api);
      
      waitfor {
        // this will fill in @env('Session') when we have an authenticated session:
        @auth.doSessionMenu();
      }
      or {
        // main ui dispatcher:
        @navigation.route([

          ["/", do_index],
          [/^\/story\/([^\/]+)$/, do_show_story],
          [/^\/story\/([^\/]+)\/edit$/, do_edit_story]

        ]);
      }
    }
  }
};
exports.main = main;
