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

  ");

  function col_template() {
    var rv = @Div() ..
      @Class('story-block') ..
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

  return @Div() .. @Class('story-wrapper') ::
    `
    <div class="story-header">
      <h1 class="story-title">That time we went to the India</h1>
      <div class="story-author">
        <span class="story-author-face"><img src="https://scontent-lga3-1.cdninstagram.com/hphotos-xfa1/t51.2885-15/e35/11849996_1497391333904305_1121696930_n.jpg"/></span>
        <span class="story-author-name">Photo story by Eytan Daniyalzade</span>
      </div>
    </div>
    ${
      @Div() ..
      @Class("story-content") ..
      @field.Field("content") ..
      @field.FieldArray(row_template)
    }
    <div class="story-footer">
      Were you there? Help Eytan tell this story by dropping related pictures on this page.
      <img class="story-footer-connect" src="/frontend/assets/connect.svg" width="80"/>
    </div>
  `;
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
   @param {sjs:observable::Observable} [Selection]
*/
function StoryEditPalette(session, Selection) {

  var ActiveTool = @ObservableVar(0);

  var tools = [
    { 
      type: 'img',
      title: 'Photos',
      content: HorizontalPhotoStream(session) ..
                 @Mechanism(function() {
                   @backfill.cmd.stream(['click-photo']) .. @each {
                     |[cmd,url]|
                     var selection = Selection .. @current();
                     if (selection)
                       (selection .. @field.Value()).set({type:'img', url:url});
                   }
                 })
    },
    { 
      type: 'txt',
      title: 'Text',
      content: @Div() .. 
                 @Mechanism(function() {
                   var selection = Selection .. @current();
                   if (!selection) return;
                   var field = selection .. @field.Value();
                   if ((field .. @current()).type !== 'txt') {
                     field.set({type:'txt', content:[]});
                   }
                   var editable = selection.querySelector('[contenteditable]');
                   if (editable) 
                     editable.focus();
                 })
    },
    { 
      title: 'Layout',
      content: [
        Action('set-full-width') :: "Full Width",
        @Br(),
        Action('set-split-row') :: "Split"
      ]
    }
  ];

  var ToolbarMechanism = @Mechanism ::
    function(node) {
      waitfor {
        // open tool corresponding to selected cell's type:
        Selection .. @each {
          |selection|
          if (!selection) continue;
          var sel_type = (selection .. @field.Value() .. @current).type;
          var tool_idx = (tools .. @indexed .. @find([,{type}] -> type && (type === sel_type), []))[0];
          if (tool_idx !== undefined)
            ActiveTool.set(tool_idx);
        }
      }
      or {
        // activate tool if the user clicks on it:
        @backfill.cmd.stream(['tool']) .. @each {
          |[cmd, tool_idx]|
          ActiveTool.set(tool_idx);
        }
      }
    };

  var ToolbarCSS = @CSS(
    `
    > div { display: inline-block;
            width: ${100/tools.length}%;
            cursor: pointer;
          }
    > div[active] { color:white; }
    `);

  var rv = 
    @Div ::
    [
      @Div() ::
        ActiveTool .. @transform(index -> tools[index].content),
      
      @Div() .. ToolbarCSS .. ToolbarMechanism ::
        tools .. 
          @indexed ..
          @map([i, {title}] -> @Div(title) ..
                                 @backfill.cmd.Click('tool', i) ..
                                 @Attrib('active', ActiveTool .. @transform(idx -> idx === i))
              )
    ];

  return rv;      
}
exports.StoryEditPalette = StoryEditPalette;

