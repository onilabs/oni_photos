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
        session.Stories() .. @transform(function(stories) {
          var arr = stories ..
            @map(story -> @Div(`
                             <a class="project-image"
                                href="/story/${story.id}"
                                style="background-image:url(${story.thumbnail||'/frontend/assets/empty-story.svg'})">
                                <div class="project-title">${story.title}</div>
                             </a>
                           `
                           ) .. @Class('project-block'));
          
          if (!arr.length) {
            return `<p>You do not have any photo stories yet.</p>
                    <hr>
                    <p>Photo stories allows you to create simple and beautiful photo & text based
                    albums using your existing photos in the cloud.</p>
                   `
          }
          else
            return @Div([@Div("Your stories") .. @Class('projects-title'), arr]) .. @Class('projects-wrapper');
        })
      ]
  ) {
    ||
    
    @contextMenu .. @replaceContent(
      @Div('Create new story') .. @Class('menubar-button') ..
        @OnClick(function() {
          var id = session.createStory();
          @navigation.navigate("/story/#{id}/edit");
        })
    ) {
      ||
      hold();
    }
  }
}

//----------------------------------------------------------------------

function do_show_story(url,story_id) {
  // XXX we could make this 'live'
  var story = @env('api').getPublicStory(story_id);
  @mainContent .. @replaceContent([
    require('lib:static_html').publishedStory(story),
    `
      <div class="story-footer">
        <label class="story-uploader">
          <div class="story-uploader-title">Upload photos to this story</div>
          <p>Only ${story.owner_name} will see your uploads and will be able to add your photos to this story.</p>
          ${@widgets.PhotoUploader((meta, stream)-> @env('api').uploadToStory(story_id, meta, stream))}
        </label>
      </div>
    `]
  ) {
    ||

    @contextMenu .. @replaceContent(
      @env('Session') .. 
        @transform(session ->
                   session ?
                   `<a class="menubar-button" href="/story/${story_id}/edit">Edit</a>`)
    ) {
      ||
      require('./lightbox').lightboxBehavior('.story-image');
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
