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

  /* TOM'S TEST CODE <<<< */
  story_content.splice(2, 0, [{}, {
    type: 'txt',
    content: 'Toddling up the mountain he plants his feet in the mountain soil to rise like a mountain in the land of mountains. \n The whole mountain lives inside the mountain child And in the lap of the mountain lives the scurrying mountain child.'
  }]);
  story_content[4][1] = {};
  story_content[6][1] = {};
  /* >>>> TOM'S TEST CODE */

  function StoryRow(descriptor) {
    var rv;
    var count = descriptor .. @filter(b -> !b.hidden && b.type) .. @count();
    return descriptor .. @map(b -> StoryBlock(b.hidden || !b.type,count===1, StoryBlockContent(b, StaticBlockContentConstructors)));
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
      <div class="story-content">
      ${
        story_content .. @map(StoryRow)
      }
      </div>
      <div class="story-footer">
        Were you there? Help Eytan tell this story by dropping related pictures on this page.
        <img class="story-footer-connect" src="/frontend/assets/connect.svg" width="80"/>
      </div>
      `;
};
