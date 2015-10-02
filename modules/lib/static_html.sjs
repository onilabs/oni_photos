@ = require([
  'mho:std',
  'mho:surface/html',
  {id: 'backend:db/stories', name: 'stories'}
]);

exports.index = -> `<h1>Photo Stories</h1>`;


exports.publishedStory = function(story_id) {
    function Block(descriptor, rowSize) {
      var rv = @Div() .. @Class('story-block' + (rowSize === 1 ? ' is-fullwidth' : ''));
      if (descriptor.type === 'img') {
        rv = rv .. @Content(@Div() .. @Class('story-image')
          .. @Attrib('style', 'background-image: url(' + descriptor.url + ')')
          .. @Attrib('data-width', 800)
          .. @Attrib('data-height', 800)
        );
      }
      else if (descriptor.type === 'txt') {
        rv = rv .. @Content(@Div() .. @Class('story-txt') :: descriptor.content);
      }
      return rv;
    }

  var content = @stories.getPublicStory(story_id).content;
  console.log(content);
    content.splice(2, 0, [{
      type: 'txt',
      content: 'Toddling up the mountain he plants his feet in the mountain soil to rise like a mountain in the land of mountains. \n The whole mountain lives inside the mountain child And in the lap of the mountain lives the scurrying mountain child.'
    }]);
    content[4].pop();
    content[6].pop();
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
        content .. @map(
          row -> row .. @map(function(block) {
            return Block(block, row.length)
          })
        )
      }
      </div>
      <div class="story-footer">
        Were you there? Help Eytan tell this story by dropping related pictures on this page.
        <img class="story-footer-connect" src="/frontend/assets/connect.svg" width="80"/>
      </div>
      `;
};
