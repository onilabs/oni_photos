/**
   @summary Utilities for manipulating our internal datastructures
*/

@ = require(
  [
    'mho:std'
  ]
);

//----------------------------------------------------------------------
/*

  STORY_DATA = { content: [ ROW* ] }
  ROW        = [ BLOCK, BLOCK, BLOCK ]
  BLOCK      = { type: TYPE, ... other fields depending on type }
  TYPE       = 'blank' | 'img' | 'txt' 

*/

var isRowEmpty = row -> row .. @all(block -> block.type=='blank');
exports.isRowEmpty = isRowEmpty;

// retrieve a title thumb from a story (null if nothing found)
function titleThumb(story_data) {
  story_data.content .. @each {
    |row|
    row .. @each {
      |block|
      if (block.type === 'img')
        return block.url;
    }
  }
  return null;
}
exports.titleThumb = titleThumb;
