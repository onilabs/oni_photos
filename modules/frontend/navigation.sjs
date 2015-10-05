@ = require([
  'sjs:std'
]);

var NavigationEmitter = @Emitter();

//----------------------------------------------------------------------

function navigate(url) {
  history.pushState(null, '', url);
  NavigationEmitter.emit(url);
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
      var href = ev.target.href .. @url.normalize(location.href);
      var origin = location.origin;
      if (!href .. @startsWith(origin)) continue;

      ev.preventDefault();
      href = href.substring(origin.length);
      NavigationEmitter.emit(href);
    }
}

function dispatchStateChanges() {
  // XXX
  hold();
}

function route(routes) {
  waitfor {
    captureLinks();
  }
  or {
    dispatchStateChanges();
  }
  or {
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

          if (typeof matcher === 'string' &&
              matcher === url) {
            activeRoute = {
              url: url,
              stratum: spawn route_f(url)
            }
            break;
          }
          var matches;
          if ((matches = matcher.exec(url))) {
            matches.shift();
            matches.unshift(url);
            activeRoute = {
              url: url,
              stratum: spawn route_f.apply(null, matches)
            }
            break;
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

}
exports.route = route;
