@ = require([
  'mho:std',
  {id: 'mho:services/google_api/REST/picasawebV2', name: 'picasa'}
]);


function query(google_oauth_session, settings) {

  settings = {
    filter: '',
    size:750
  } .. @override(settings);
  
  return @batchN(20) ::
    @Stream(function(r) {

      // the picasa api is very slow and cannot be paged. to speed things up, we do
      // 2 request: 1 limited to the first 20 photos, and one for an unlimited number
      
      var fast_request_done = @Condition();
      
      waitfor {
        
        // fast request
        
        var photos_fast = google_oauth_session .. @picasa.recentPhotos({
          thumbsize: "#{settings.size}c",
          q: settings.filter,
          'max-results': 25
        });
        var fast_count = 0;
        photos_fast .. @each {
          |entry|
          ++fast_count;
          var thumbnail = entry["media$group"]["media$thumbnail"] .. @find(item -> item.height == settings.size || item.width == settings.size, null);
          if (thumbnail)
            r(thumbnail);
        }
        

        // XXX you would think this holds, but no... :/
        // if (fast_count < 20) return; // there won't be more photos, so might as well return now
        
        // fast request is done; ok to emit from slow request now:
        fast_request_done.set();
        
      }
      and {

        // slow request
        
        var photos_slow = google_oauth_session .. @picasa.recentPhotos({
          thumbsize: "#{settings.size}c",
          q: settings.filter
        });

        // start playback of stream now (because the request actually only goes out
        // when we play back the stream), but wait with emitting until the fast request
        // above is done
        photos_slow
          .. @each {
            |entry|

            // only start emitting if fast request done:
            fast_request_done.wait();

            // skip images from fast request, as we cannot set a start index in the picasa api
            if (fast_count > 0) {
              -- fast_count;
              continue;
            }
            
            var thumbnail = entry["media$group"]["media$thumbnail"] .. @find(item -> item.height == settings.size || item.width == settings.size, null);
            if (thumbnail)
              r(thumbnail);
          } 
      }
    });
}
exports.query = query;
