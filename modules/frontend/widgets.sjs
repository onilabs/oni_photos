/**
   @summary UI widgets
*/

@ = require([
  'mho:std',
  'mho:app',
  {id:'./backfill', name:'backfill'},
  {id:'mho:surface/nodes', name:'nodes'},
  {id:'mho:surface/field', name:'field'},
  {id:'lib:static_html', name:'static'},
  {id:'lib:datastructures', name:'data'}
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
   @function HorizontalPhotoStream
   @param {Object} [session]
   @summary XXX write me
*/
function HorizontalPhotoStream(PhotosObservable) {
  var image_size = 120;

  var CSS = @CSS("
    {
      -webkit-overflow-scrolling: touch;
      white-space: nowrap;
      overflow-x: scroll;
      height: 123px;
    }
    :hover {
      -webkit-filter: brightness(.95);
    }
    :active {
      transform: scale(.96);
    }
    div {
      width: #{image_size}px;
      height: #{image_size}px;
      margin: 0 2px;
      display: inline-block;
      background-size: cover;
    }
  ");

  return @Div() .. CSS() ::
    PhotosObservable ..
      @transform(photo_stream ->               
           @ScrollStream({tolerance:1000}) ::
                             photo_stream .. 
                             @transform(x -> @Div() ..
                                        @Style('background-image:url('+ x.url+')') ..
                                        @backfill.cmd.Click('click-photo', x.url)
                                       )
                );
};


//----------------------------------------------------------------------
/**
   @function GooglePhotoStream
   @param {Object} [session]
   @summary XXX write me
*/
function GooglePhotoStream(session) {
  
  var Filter = @ObservableVar('');

  var SearchCSS = @CSS("
      {
        border: 0;
        border-bottom: 1px solid #eee;
        background: #fff;
        color: #171616;
        outline: 0;
        min-width: 260px;
        margin: 2px;
        padding: 4px;
        font-size: 14px;

        position: absolute; /* XXX hack for now */
        top: 0;
        right: 0;
      }
  ");  

  var SearcheablePhotoStream = @Div() ::
                                 [
                                   @Input({type: 'search', value: Filter}) ..
                                     @Attrib('placeholder', 'Search') ..
                                     SearchCSS,
                                   Filter ..
                                     @transform(filter -> HorizontalPhotoStream(session.GooglePhotos(filter)))
                                 ];

  // authorization notice to show if we're not authorized for the photos api:
  var AuthorizationNotice = @Div .. @Style('text-align:center') ::
                              @Button('Authorize Google Photo Access') .. 
                                @Class('menubar-button') ..
                                @Style('margin:30px') ..
                                @OnClick(->require('./auth').authorizeGoogle(session))

  
  return session.GoogleAuthorized ..
    @transform(authorized -> authorized ?
               SearcheablePhotoStream : AuthorizationNotice);
}

//----------------------------------------------------------------------

function AnonymousPhotoStream(session, story_id) {
  return HorizontalPhotoStream(session.AnonymousPhotos(story_id));
}

//----------------------------------------------------------------------
/**
   @function StoryEditWidget
   @summary XXX write me
*/


var BlockContentConstructors = @static.StaticBlockContentConstructors .. @clone;
// override 'txt' block to make it editable:
BlockContentConstructors['txt'] = descriptor ->
                                   @field.FieldMap() ::
                                     @Div() .. @Class('story-txt') ::
                                       [
                                         // xxx the span is a hack to keep the 'type' value
                                         @Span() .. @field.Field('type'),
                                         @field.Field('content') ::
                                           @Div .. @backfill.PlainTextEditable() ..
                                           @Style('height:100%')
                                       ];
// override 'img' block to take image from Value:
BlockContentConstructors['img'] =
  descriptor ->
    @Div()
    .. @Class('story-image')
    .. @Attrib('style', @field.Value() .. @transform(b->'background-image: url(' + b.url + ')'))
    .. @Attrib('data-width', 800)
    .. @Attrib('data-height', 800);


function StoryEditWidget(Selection) {

  var SelectionMechanism = @Mechanism(function(node) {
    @backfill.cmd.stream(['select-block']) .. @each {
      |[cmd, block]|
      var selected_block = Selection .. @current();
      if (selected_block) {
        selected_block.removeAttribute('selected');

        // remove the focus if we're moving from contenteditable to not-contenteditable:
        var old_editable = selected_block.querySelector('[contenteditable]');
        var new_editable = block.querySelector('[contenteditable]');

        if (old_editable && !new_editable) {
          // see http://stackoverflow.com/questions/4878713/how-can-i-blur-a-div-where-contenteditable-true
          old_editable.blur();
          window.getSelection().removeAllRanges();
          hold(0);
        }
      }

      if (new_editable) {
        new_editable.focus();
      }
      Selection.set(block);
      block.setAttribute('selected', true);
    }
  });
  
  function col_template() {
    var rv =
      @static.StoryBlock(@field.Value() .. @transform(b->!b.hidden && b.type),
                         @field.Value('.')
                         .. @transform(row -> row
                                       .. @filter(b -> !b.hidden && b.type)
                                       .. @count() === 1),
                         @Stream(function(receiver) {
                           var current_type;
                           @field.Value() .. @each {
                             |descriptor|
                             if (descriptor.type === current_type)
                               continue;
                             current_type = descriptor.type;

                             receiver(@static.StoryBlockContent(descriptor,
                                                                BlockContentConstructors))
                           }
                         })
                        )
      .. @backfill.cmd.Click('select-block', ev -> ev.currentTarget);

    return rv;
  }

  
  function row_template() {
    return @Div() ..
      @field.FieldArray(col_template);
  }

  var CompromisedRowMechanism = @Mechanism(function() { 
    // if the last row contains at least one empty block, we'll add another row
    // also, if the last 2 rows become empty, remove last row
    @field.Value() .. @each.track {
      |rows|
      hold(100); // small delay before we do anything
      if (!rows.length) {
        @field.Value().set([[{type:'blank'},{type:'blank'},{type:'blank'}]]); 
      }
      else if (rows.length > 1 &&
               @data.isRowEmpty(rows[rows.length-1]) &&
               @data.isRowEmpty(rows[rows.length-2])) {
        // remove last row
        @field.Value().set(rows.slice(0,rows.length-2));
      }
      else if (!@data.isRowEmpty(rows[rows.length-1])) {
        // add a new blank row
        @field.Value().set(rows.concat([[{type:'blank'},{type:'blank'},{type:'blank'}]]));
      }        
    }
  });
  
  return @Div() .. @Class('story-wrapper') .. SelectionMechanism ::
    `
    <div class="story-header">
      <div class="story-author">
        <span class="story-author-face">${@Img()..@Attrib("src",(@env("Session") .. @current).user.avatar)}</span>
        <span class="story-author-name">${(@env("Session") .. @current).user.name}</span>
      </div>
      <h1 class="story-title">
        ${
            @field.Field('title') ::
              @Span() .. @Class("story-title-content") .. @backfill.PlainTextEditable()
         }
      </h1>
    </div>
    ${
      @Div() ..
      @Class("story-content") ..
      @field.Field("content") ..
      @field.FieldArray(row_template) ..
      CompromisedRowMechanism  
    }
    <div class="story-footer"></div>
  `;
}
exports.StoryEditWidget = StoryEditWidget;

//----------------------------------------------------------------------

/**
   @function storyEditPalette
   @summary Tools palette for editing stories
   @param {Object} [session]
   @param {sjs:observable::Observable} [Selection]
*/
function StoryEditPalette(session, Selection, story_id) {

  var ActiveTool = @ObservableVar(0);

  var PhotoClickMechanism = @Mechanism(function() {
    @backfill.cmd.stream(['click-photo']) .. @each {
      |[cmd,url]|
      var selection = Selection .. @current();
      if (selection) {
        // XXX We should find a better place for this
        // <<<
        selection.classList.add('block-changed');
        selection.addEventListener('animationend', function() {
          selection.classList.remove('block-changed');
        });
        // >>>
        (selection .. @field.Value()).set({type:'img', url:url});
      }
    }
  });
  
  var tools = [
    { 
      type: 'img',
      title: 'Photos',
      content: @backfill.TabWidget() .. PhotoClickMechanism ::
                 [
                   { title: 'Google',
                     content: GooglePhotoStream(session)
                   },
                   { title: 'Inbox',
                     content: AnonymousPhotoStream(session, story_id)
                   }
                 ] 
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
    {
      display: none;
    }
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

//----------------------------------------------------------------------

function upload(input, upload_function) {

  input.files .. @each {
    |file|
    spawn doImageUpload(input, file, upload_function);
  }
  input.value = '';
}

function doImageUpload(ui_parent, file, upload_function) {

  var UploadPercentage = @ObservableVar(0);
  var Fill = UploadPercentage  .. @transform(p -> p * 100 + '%');
  var LeftPosition = UploadPercentage  .. @transform(p -> p < 1 ? '50px' : 'calc(100% - 120px)');
  var ProgressOpacity = UploadPercentage  .. @transform(p -> p < 1 ? 1 : 0);
  var Rotation = UploadPercentage  .. @transform(p -> p < 1 ? -10 : 10);

  ui_parent .. @insertAfter(
    @Div() .. @CSS(`{
        position: absolute;
        left: $LeftPosition;
        transition: all 500ms ease;
        transform: translateZ(0) rotate(${Rotation}deg);
      }`) ::
      [
        @Div() .. @CSS(`{
          border: 3px solid #fff;
          box-shadow: 0 3px 6px rgba(0, 0, 0, .2);
          width:80px; height:80px;
          background-size: cover;
          background-image: url("${file .. @backfill.fileToDataURL}");
        }`) :: 
        @Div() ..
          @OnClick({|ev| ev.preventDefault(); return}) ::
          [
            @Div() .. @CSS(`{
              position: absolute;
              top: 50%;
              left: 50%;
              margin: -4px 0 0 -15px;
              height: 8px;
              width: 30px;

              transition: opacity 500ms ease;
              background: rgba(255, 255, 255, 0.2);
              border: 1px solid #fff;
              border-radius: 2px;
              opacity: $ProgressOpacity;
            }`) ::
              @Div() .. @CSS(`{
                background: #fff;
                width: $Fill;
                height: 100%;
              }`)
          ]
      ]
  ) {
    ||
    for (var i = 0; i <= 200; i++) {
      UploadPercentage.set(i/200);
      hold(5)
    }
    hold(); // forever show the uploaded images

    // upload_function({name: file.name},
    //                 @backfill.VariableApertureStream(file .. @backfill.fileToArrayBuffer,
    //                                                  { progress_observer: p -> UploadPercentage.set(p) }));
  }
}

function StoryUploader(upload_function) {
  doImageUpload(document.body);
  return @Input() ..
    @Style("display: none; position: relative;") ..
    @Attrib('type','file') ..
    @Attrib('accept', 'image/*') ..
    @Attrib('multiple') ..
    @On('change', ev -> upload(ev.currentTarget, upload_function));
  
}
exports.StoryUploader = StoryUploader;
