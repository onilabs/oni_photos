@ = require([
  'sjs:std'
]);

var NavigationEmitter = @Emitter();

//----------------------------------------------------------------------

function navigate(url, omit_state_push) {
  var url = url .. @url.normalize(location.href);
  var origin = location.origin;
  if (!url .. @startsWith(origin)) return false;
  url = url.substring(origin.length);

  if (!omit_state_push)
    history.pushState(null, '', url);
  NavigationEmitter.emit(url);
  return true;
}
exports.navigate = navigate;


//----------------------------------------------------------------------


function captureLinks() {
  document .. 
    @events("!click", 
            {
              filter: ev-> ev.target .. @dom.matchesSelector("a:not([data-bypass])")
            }) .. 
    @each {
      |ev|
      if (navigate(ev.target.href))
          ev.preventDefault();
    }
}

function dispatchStateChanges() {
  window ..
    @events("popstate") ..
    @each {
      |ev|
      console.log('nav event');
      navigate(location.href);
    }
}

function route(routes) {
  waitfor {
    var activeRoute; 
      
    try {
      NavigationEmitter .. @each.track {
        |url|
        console.log("Trying to dispatch to #{url}");
        if (activeRoute) {
          if (activeRoute.url === url)
              continue;
          activeRoute.stratum.abort();
          activeRoute = undefined;
        }
        routes .. @each {
          |[matcher, route_f]|

          if (typeof matcher === 'string') {
            if (matcher === url) {
              activeRoute = {
                url: url,
                stratum: spawn (function() {
                  route_f(url);
                  hold();
                })()
              }
              break;
            }
          }
          else {
            var matches;
            if ((matches = matcher.exec(url))) {
              matches.shift();
              matches.unshift(url);
              activeRoute = {
                url: url,
                stratum: spawn (function() {
                  route_f.apply(null, matches);
                  hold();
                })()
              }
              break;
            }
          }
        }
        if (!activeRoute)
          throw new Error("Route #{url} not found");
      }
    }
    finally {
      if (activeRoute) {
        activeRoute.stratum.abort();
        activeRoute = undefined;
      }
    }
  }
  or {
    captureLinks();
  }
  or {
    // goto initial page:
    navigate(location.href);
    dispatchStateChanges();
  }

}
exports.route = route;
