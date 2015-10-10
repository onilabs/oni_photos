@ = require([
  'mho:std',
  'mho:surface/html'
]);

//----------------------------------------------------------------------
// building blocks


var StaticBlockContentConstructors = {
  'img': descriptor -> 
           @Div()
           .. @Class('story-image')
           .. @Attrib('style', 'background-image: url(' + descriptor.url + ')')
           .. @Attrib('data-width', 800)
           .. @Attrib('data-height', 800),

  'blank': descriptor -> 
          @Div()
          .. @Class('story-blank'),

  'txt': descriptor ->
           @Div()
           .. @Class('story-txt')
           :: descriptor.content
};
exports.StaticBlockContentConstructors = StaticBlockContentConstructors;


function StoryBlockContent(descriptor, ContentConstructors) {
  if (descriptor.hidden || !descriptor.type) 
    return undefined;

  var ctor = ContentConstructors[descriptor.type];
  if (!ctor) throw new Error("Unknown block type '#{descriptor.type}'");

  return ctor(descriptor);
}
exports.StoryBlockContent = StoryBlockContent;

function StoryBlock(hidden, isFullwidth, content) {

  var rv = @Div()
           .. @Class('story-block')
           .. @Class('hidden', hidden)
           .. @Class('is-fullwidth', isFullwidth);

  rv = rv .. @Content(content);

  return rv;
}
exports.StoryBlock = StoryBlock;


//----------------------------------------------------------------------
// static pages

exports.index = -> `
  <div class="intro">
    <h2 class="intro-title">What’s this all about?</h2>
    <p>
    Our goal is to make it really easy for <span style="white-space:nowrap">friends &amp; family</span>
    to create collections of pictures together.
    We avoid uploading to social networks and device specific tools.</span>
    </p>
  </div>
  `;


exports.publishedStory = function(story) {

  function StoryRow(descriptor) {
    var rv;
    var count = descriptor .. @filter(b -> !b.hidden && b.type) .. @count();
    return descriptor .. @map(b -> StoryBlock(b.hidden || !b.type,count===1, StoryBlockContent(b, StaticBlockContentConstructors)));
  }

  return @Div() .. @Class('story-wrapper') ::
      `
      <div class="story-header">
        <div class="story-author">
          <span class="story-author-face"><img src="${story.owner_avatar}"/></span>
          <span class="story-author-name">${story.owner_name}</span>
        </div>
        <h1 class="story-title">${story.data.title}</h1>
      </div>
      <div class="story-content">
      ${
        story.data.content .. @map(StoryRow)
      }
      </div>
      <div class="story-footer">
        <label class="story-uploader">
          <p class="story-uploader-title">Help upload more relevant pictures to this story.<p>
          <p>Only ${story.owner_name} will see the uploaded pictures and can add them to this story.</p>
          <input type="file" accept="image/*" capture="camera" multiple>
        </label>
      </div>
      `;
};
