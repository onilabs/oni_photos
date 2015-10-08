@ = require([
  'mho:std',
  {id: 'mho:services/google_api/REST/picasawebV2', name: 'picasa'}
]);


function query(google_oauth_session, settings) {

  settings = {
    filter: '',
    size:750
  } .. @override(settings);
  
  // XXX size of photos is currently hardcoded
  return @batchN(20) ::
    @Stream(function(r) {
      var photos = google_oauth_session .. @picasa.recentPhotos({
        thumbsize: "#{settings.size}c",
        q: settings.filter
      });
      photos .. @each {
        |entry|
        var thumbnail = entry["media$group"]["media$thumbnail"] .. @find(item -> item.height == settings.size || item.width == settings.size, null);
        if (thumbnail)
          r(thumbnail);
      }
    });
}
exports.query = query;
