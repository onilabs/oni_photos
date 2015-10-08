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
  // XXX we could make this 'live'
  var story = @env('api').getPublicStory(story_id);
  @mainContent .. @replaceContent(
    require('lib:static_html').publishedStory(story.content)
  ) {
    ||

    @contextMenu .. @replaceContent(
      @env('Session') .. 
        @transform(session ->
                   session ?
                   `<a class="menubar-button" href="/story/${story_id}/edit">Edit</a>`)
    ) {
      ||
      hold();
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
          [/^\/story\/([^\/]+)\/edit$/, (url, story_id) -> require('./editor').do_edit_story(story_id)]

        ]);
      }
    }
  }
};
exports.main = main;
