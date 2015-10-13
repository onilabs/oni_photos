@ = require(
  [
    'mho:std',
    {id:'mho:server/random', name: 'random'},
    {id:'path', name:'path'}
  ]
);

function uploadToStory(story_id, meta, stream) {
  // just upload to uploads/ directory for now

  var filename = @random.createID() + meta.name .. @path.extname;

  // XXX stream to filename
  
  var path = @env.configRoot() + 'uploads/' + filename;

/*  stream .. @each {
    |x|
    console.log(typeof x);
  }
*/
  @fs.withWriteStream(path) {
    |dest|
    stream .. @stream.pump(dest);
  }


  // XXX make an entry in the db
  
};
exports.uploadToStory = uploadToStory;
