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
      body: `<h1>You do not have any photo stories yet.</h1>
             <hr>
             <p>Photo stories allows you to create simple and beautiful photo & text based
              albums using your existing photos in the cloud.</p>
        `
      })
  ) {
    ||
    @backfill.cmd.stream(['add_story']) .. @each {
      |[cmd, param]|
      return param;
    }
  }  
}

//----------------------------------------------------------------------

var story = {
  content: [
    [{type:'blank'},{type:'blank'}],
    [{type:'blank'},{type:'blank'}],
    [{type:'blank'},{type:'blank'}],
    [{type:'blank'},{type:'blank'}]
  ]
};

var Story = @ObservableVar(story.content);


function do_edit_story(session) {  
  document.body .. @appendContent(
    @widgets.Page({
      title:        'STORY',
      title_action: @Span() .. @backfill.cmd.Click('done') :: 'Done',
      
      body: @widgets.StoryEditWidget(Story),
      
      footer: @Div ..@Style('margin:10px;') ::
        @widgets.HorizontalPhotoStream(session)      
    })
  ) {
    ||
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
}

//----------------------------------------------------------------------

exports.main = function(api) {

  var session = @auth.login(api);

  while (1) {
    var story = session .. do_index();
    session .. do_edit_story(story);
  }
};
