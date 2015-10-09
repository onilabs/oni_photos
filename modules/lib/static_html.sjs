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
  <h1>Create photo based stories with friends & family</h1>
  `;


exports.publishedStory = function(story_content) {

  function StoryRow(descriptor) {
    var rv;
    var count = descriptor .. @filter(b -> !b.hidden && b.type) .. @count();
    return descriptor .. @map(b -> StoryBlock(b.hidden || !b.type,count===1, StoryBlockContent(b, StaticBlockContentConstructors)));
  }

  return @Div() .. @Class('story-wrapper') ::
      `
      <div class="story-header">
        <div class="story-author">
          <span class="story-author-face"><img src="https://pbs.twimg.com/profile_images/606752573341601792/NNL4kd5v.jpg"/></span>
          <span class="story-author-name">Farah Chan</span>
        </div>
        <h1 class="story-title">That time we went to the India</h1>
      </div>
      <div class="story-content">
      ${
        story_content .. @map(StoryRow)
      }
      </div>
      <div class="story-footer">
        The End
      </div>
      `;
};
