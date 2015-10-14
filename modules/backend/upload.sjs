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

  var path = @env.configRoot() + 'uploads/' + filename;

  @fs.withWriteStream(path) {
    |dest|
    stream .. @stream.pump(dest);
  }


  // XXX make an entry in the db
  
};
exports.uploadToStory = uploadToStory;
