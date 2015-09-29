/**
   @summary SJS code for public stories
*/

$().ready(function() {
  lightboxBehavior('.story-image');
});

var clone;

function clickRef(event){
  event.preventDefault();
  $(clone).remove();
  clone = undefined;
  $('.story-fog').addClass('hidden');
  $(document.body).css({overflow: ''});
}

function lightboxBehavior(selector) {
  $(document.body).append('<div class="story-fog hidden"></div>');
  $(selector).each(function(index, element) {
    var shot = $(element);
    $(shot).click(function() {
      if (clone) {
        return;
      }
      var width = parseInt(shot.attr('data-width'), 10);
      var height = parseInt(shot.attr('data-height'), 10);
      var windowWidth = $(window).width();
      var windowHeight = $(window).height();

      // maximum zoom in width & height:
      var maxWidthZoom = windowWidth/width;
      var maxHeightZoom = windowHeight/height;

      // take the smaller of the two (because we don't want to overflow!):
      var zoom = Math.min(maxWidthZoom, maxHeightZoom);

      // now determine the w/h from that:
      var zoomedWidth = width*zoom;
      var zoomedHeight = height*zoom;

      clone = shot.clone()
        .attr('class','story-image-zoomed')
        .css({
          top: shot.offset().top - $(window).scrollTop() ,
          left: shot.offset().left,
          width: shot[0].clientWidth,
          height: shot[0].clientHeight
        })
        .appendTo(document.body);

      setTimeout(function(){
        $('.story-fog').removeClass('hidden');
        $(document.body).css({overflow: 'hidden'});
        $(document).one('click', clickRef);
      }, 0);
      setTimeout(function() {
        clone.css({
          top: 0,
          left: 0,
          width: zoomedWidth,
          height: zoomedHeight,
          'margin-left': (windowWidth - zoomedWidth) / 2,
          'margin-top': (windowHeight - zoomedHeight) / 2,
        });
        $('div', clone).removeClass('hidden');
        setTimeout(function(){
          clone.css({
            'background-image':
              shot[0].style.backgroundImage.replace('750', '1200') +
              ',' +
              shot[0].style.backgroundImage
          });
        }, 100);
      },100);
    });

  });
}
