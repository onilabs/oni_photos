@ = require([
  'mho:std',
  'mho:app',
  {id:'./backfill', name:'backfill'}
]);

//----------------------------------------------------------------------
// helpers

// replaces image with a clone for the duration of 'block':
function withClonedImage(node, block) {
  var clone = node.cloneNode(true);
  clone.classList.add('story-image-zoomed');
  clone.style.top = (window.pageYOffset + node.getBoundingClientRect().top) + 'px';
  clone.style.left = (window.pageXOffset + node.getBoundingClientRect().left) + 'px';
  clone.style.width = node.clientWidth + 'px';
  clone.style.height = node.clientHeight + 'px';
  clone.style.padding = '0px';
  try {
    node.style.visibility = 'hidden';
    document.body.appendChild(clone);
    block(clone);
  }
  finally {
    node.style.visibility = 'visible';
    document.body.removeChild(clone);
  }
}

// restore node's current style after block returns:
function saveStyle(node, block) {
  var originalStyle = node.style.cssText;
  try {
    block(node);
  }
  finally {
    node.style.cssText = originalStyle;
  }
}

//----------------------------------------------------------------------

function lightboxBehavior(selector) {
  document .. @events('click') .. @each {
    |ev|
    var shot = ev.target;
    if (!shot .. @dom.matchesSelector(selector)) continue;

    var width = parseInt(shot.getAttribute('data-width'), 10);
    var height = parseInt(shot.getAttribute('data-height'), 10);
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;

    // maximum zoom in width & height:
    var maxWidthZoom = windowWidth/width;
    var maxHeightZoom = windowHeight/height;

    // take the smaller of the two (because we don't want to overflow!):
    var zoom = Math.min(maxWidthZoom, maxHeightZoom);

    // now determine the w/h from that:
    var zoomedWidth = width*zoom;
    var zoomedHeight = height*zoom;

    document.body .. @appendContent(`<div class='story-fog hidden'></div>`) {
      |fog|
      
      shot .. withClonedImage {
        |clone|
        
        // make sure cloned image is displayed before we modify style:
        @backfill.waitforAnimationFrame();

        fog.classList.remove('hidden');
        
        clone .. saveStyle {
          ||
          
          // move the cloned photo
          clone.style.top = '0px';
          clone.style.left = '0px';
          clone.style.width = zoomedWidth + 'px';
          clone.style.height = zoomedHeight + 'px';
          clone.style.marginLeft = (window.pageXOffset + (windowWidth - zoomedWidth) / 2) + 'px';
          clone.style.marginTop = (window.pageYOffset + (windowHeight - zoomedWidth) / 2) + 'px';
          
          // wait until user clicks or scrolls:
          var ev = document .. @events(['click', 'scroll']) .. @wait();
          @dom.stopEvent(ev);
        } /* clone .. saveStyle */

        fog.classList.add('hidden');
        
        // give the return animation some time:
        hold(400);      
      } /* shot .. withClonedImage */
    } /* body .. appendContent(fog) */
  } /* click event loop */
}
exports.lightboxBehavior = lightboxBehavior;
