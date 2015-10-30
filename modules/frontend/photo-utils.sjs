
@ = require([
  'mho:std',
  'mho:app',
  // this installs the global symbol 'loadImage':
  'lib:external/load-image/js/load-image.all.min.js',
  // this polyfills 'canvas.toBlob':
  'lib:external/canvas-to-blob/js/canvas-to-blob.min.js'
]);

function resizeImage(file) {
  //console.log("resizing #{file.name}");
  waitfor (var canvas) {
    loadImage(file,
              resume,
              {
                maxWidth: 1800,
                maxHeight: 1800,
                canvas: true
              });
  }
  if (canvas.type === 'error')
    throw new Error("Error loading image #{file.name}");
  //console.log("got resized canvas for #{file.name}");
  waitfor (var blob) {
    canvas.toBlob(resume, 'image/jpeg', 0.7);
  }
  //console.log("#{file.name} converted to blob");

  return blob;
}
exports.resizeImage = resizeImage;
