@ = require(
  [
    'mho:std',
    {id:'mho:server/random', name: 'random'},
    {id:'path', name:'path'},
    {id:'backend:db', name: 'db'}
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

  try {
    @db.createUploadForStory(filename, story_id, meta);
  }
  catch (e) {
    console.log("Error adding upload #{filename} to db: #{e}");
    // XXX delete upload file
  }
};
exports.uploadToStory = uploadToStory;
