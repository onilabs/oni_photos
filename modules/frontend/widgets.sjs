/**
   @summary UI widgets
*/

@ = require([
  'mho:std',
  'mho:app',
  {id:'./backfill', name:'backfill'},
  {id:'mho:surface/nodes', name:'nodes'},
  {id:'mho:surface/field', name:'field'}
]);

//----------------------------------------------------------------------
/**
   @function Action
   @summary XXX write me
   @param {mho:surface::HtmlFragment} [content]
   @param {String} [cmd]
   @param {Object|Function} [param]
*/
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
   @setting {mho:surface::HtmlFragment} [title]
   @setting {mho:surface::HtmlFragment} [title_action]
   @setting {mho:surface::HtmlFragment} [body]
   @setting {mho:surface::HtmlFragment} [footer]
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
/**
   @function VerticalPhotoStream
   @param {Object} [session]
   @summary XXX write me
*/
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

/**
   @function HorizontalPhotoStream
   @param {Object} [session]
   @summary XXX write me
*/
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
  
  var Filter = @ObservableVar('');

  return @Div() :: 
    [
      'Filter:',
      @Input(Filter),
      @Div() .. CSS() ::
        Filter .. @transform(filter ->
                             @ScrollStream({tolerance:1000}) ::
                             session.photos(filter) .. 
                             @transform(x -> @Img() ..
                                        @Attrib('src', x.url) ..
                                        @backfill.cmd.Click('click-photo', x.url)
                                       )
                            )
    ];
}
exports.HorizontalPhotoStream = HorizontalPhotoStream;

//----------------------------------------------------------------------
/**
   @function StoryEditWidget
   @summary XXX write me
   @param {sjs:observable::Observable} [story_content]
*/
function StoryEditWidget(StoryContent, Selection) {
  var width = document.body.clientWidth-20;
  var image_size = Math.min(288, Math.floor(width/2-8));
  
  var CSS = @CSS("
    .block {
      width: #{image_size}px;
      height: #{image_size}px;
      margin: 2px;
      background-color: #2d3c42;
      border: 2px solid #2d5665;
      display: inline-block;
    }
    .block[selected] {
      background-color: #2b5667;
      border: 2px solid #29c4fb;
    }
    .block > img {
      width: 100%;
      height: 100%;
    }
    .block > div {
      overflow: auto;
      height: 100%;
    }
  ");

  function col_template() {
    var rv = @Div() ..
      @Class('block') ..
      @backfill.cmd.Click('select-block', ev -> ev.currentTarget) ..
        @Mechanism(function(node) {
          var current_type;
          @field.Value() .. @each {
            |descriptor|
            if (descriptor.type === current_type) 
              continue;
            current_type = descriptor.type;
            if (descriptor.type === 'img') {
              node .. @replaceContent(
                @Img() .. 
                  @Attrib('src', 
                          @field.Value() .. @transform({url} -> url)
                         )
              );
            }
            else if (descriptor.type === 'txt') {
              node .. @replaceContent(
                @field.FieldMap() ::
                  @Div() ::
                    [
                      // xxx the span is a hack to keep the 'type' value
                      @Span() .. @field.Field('type'),
                      @field.Field('content') ::
                        @backfill.PlainTextEditor() ..
                        @Style('height:100%')
                    ]
              )                
            }
            else {
              node .. @replaceContent(@Div() :: 'unknown block');
            }
                  
          } /* @each */
        });

    return rv .. @Mechanism(function(node) {
      @backfill.cmd.stream(['select-block']) .. @each {
        |[cmd, cell]|
        var selected_cell = Selection .. @current();
        if (selected_cell) {
          selected_cell.removeAttribute('selected');
          
          // remove the focus if we're moving from contenteditable to not-contenteditable:
          var old_editable = selected_cell.querySelector('[contenteditable]');
          var new_editable = cell.querySelector('[contenteditable]');

          if (old_editable && !new_editable) {
            // see http://stackoverflow.com/questions/4878713/how-can-i-blur-a-div-where-contenteditable-true
            old_editable.blur();
            window.getSelection().removeAllRanges();
            hold(0);
          }

        }
        Selection.set(cell);
        cell.setAttribute('selected', true);
          
      }
    });
  }
  
  function row_template() {
    return @Div() .. @field.FieldArray(col_template);
  }
  
  return @Div() ..
    CSS ..
    @field.Field('content') ..
    @field.FieldArray(row_template);

  
}
exports.StoryEditWidget = StoryEditWidget;


// tabs: [{ title, content }]
function TabWidget(tabs) {

  var l = tabs .. @count;

  var TabHeaderCSS = @CSS(
    `
    > div { display: inline-block;
            width: ${100/l}%;
            cursor: pointer;
          }
    > div[active] { color:white; }
    `)

  var ActiveTab = @ObservableVar(0);

  var CmdHandler = @Mechanism(function(node) {
    @backfill.cmd.stream(['tab']) .. @each {
      |[cmd, param]|
      ActiveTab.set(param);
    }
  });

  var rv =
    @Div ::
    [
      // tab content
      @Div() .. @Class('tab-content') ::
        ActiveTab .. @transform(index -> tabs[index].content),

      // tab footer
      @Div .. TabHeaderCSS .. @Class('tab-header') .. CmdHandler ::
        tabs ..
          @indexed ..
          @map([i, {title}] -> @Div(title) ..
                                 @backfill.cmd.Click('tab', i) ..
                                 @Attrib('active', ActiveTab .. @transform(tab -> tab == i))
              )                               
    ];

  return rv;
}

/**
   @function storyEditPalette
   @summary Tools palette for editing stories
   @param {Object} [session]
   @desc
     Emits the commands:

     'set-text' -> set current selection to 'text'
     'click-photo' -> set current selection to photo url given as parameter
     'set-full-width' -> set current row to 'full-width' layout
     'set-split-row' -> set current row to split layout
*/
function StoryEditPalette(session, Selection) {

  var PaletteCSS = @CSS(
    `
       .tab-header {
         padding:20px;
         text-align: center;
       }

       .tab-content {
         text-align: center;
       }
    `);

  return TabWidget .. PaletteCSS ::
    [
      {
        title:   'Photos',
        content: HorizontalPhotoStream(session)
      },
      { title: 'Text',
        content: Action('set-text') :: "Text"
      },
      { title: 'Layout',
        content: [ Action('set-full-width') :: "Full Width",
                  @Br(),
                  Action('set-split-row') :: "Split"
                 ]
      }
    ];
}
exports.StoryEditPalette = StoryEditPalette;

