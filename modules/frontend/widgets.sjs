@ = require([
  'mho:std',
  'mho:app',
  {id:'./backfill', name:'backfill'}
]);

//----------------------------------------------------------------------
// Action

function Action(content, cmd, param) {
  return @Span(content) ..
    @Class('action') ..
    @backfill.cmd.Click(cmd, param);
}
exports.Action = Action;
  
//----------------------------------------------------------------------
// Page

var PageStyle = @CSS("
  {
    height: 100%;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .body{
    flex-grow: 1;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    background-color: #2f2e2e;
    color: #6b6b6b;
    padding: 10px;
  }

  .footer {
    flex-shrink: 0;
    background-color: #1e1e1e;
    color: #6b6b6b;
  }

  .titlebar {
    flex-shrink: 0;
    padding: 10px;
    text-align: center;
    color: white;
    background-color: #1e1e1e;
  }

  .action {
    cursor: pointer;
    color: #29c5f4;
  }

  .action[disabled] {
    color: #6b6b6b;
  }

  .left-action {
    float: left;
  }

  .right-action {
    float: right;
  }
");

/**
   @function Page
   @summary A 'page' in our application
   @param {Object} [settings]
   @setting {sjs:surface::HtmlFragment} [title]
   @setting {sjs:surface::HtmlFragment} [title_action]
   @setting {sjs:surface::HtmlFragment} [body]
   @setting {sjs:surface::HtmlFragment} [footer]
*/
function Page(settings) {
  return @Div() .. PageStyle ::
    [
      @Div() .. @Class('titlebar') ::
        [
          Action('hamburger') .. @Class('left-action action') :: `&#9776;`,
          settings.title,
          settings.title_action ? settings.title_action .. @Class('right-action action')
        ],
      @Div() .. @Class('body') ::
        [
          settings.body
        ],
      @Div() .. @Class('footer') ::
        [
          settings.footer
        ]
    ]
}
exports.Page = Page;


//----------------------------------------------------------------------

function VerticalPhotoStream(session) {
  var width = document.body.clientWidth-20;
  var image_size = Math.min(288, Math.floor(width/2-4));

  var ImageCSS = @CSS("
    img {
      width:  #{image_size}px;
      height: #{image_size}px;
      margin: 2px;
    }
  ");
  
  return @Div .. ImageCSS ::
    @ScrollStream(session.photos() .. 
                  @transform(x -> @Img() .. @Attrib('src', x.url)));
}
exports.VerticalPhotoStream = VerticalPhotoStream;

//----------------------------------------------------------------------

function HorizontalPhotoStream(session) {
  var width = document.body.clientWidth;
  var image_size = Math.min(288, Math.floor(width/2.5-4));

  var CSS = @CSS("
    {
      -webkit-overflow-scrolling: touch;
      white-space:nowrap;
      overflow-x:scroll;
    }
    img {
      width: #{image_size}px;
      height: #{image_size}px;
      margin: 2px;
    }
  ");

  // just taking 50 most recent photos for now
  return @Div .. CSS ::
    session.photos() .. @take(50) .. @transform(x -> @Img() .. @Attrib('src', x.url)) .. @toArray();
}
exports.HorizontalPhotoStream = HorizontalPhotoStream;
