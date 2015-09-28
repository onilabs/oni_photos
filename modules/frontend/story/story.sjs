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
          top: '50%',
          left: '50%',
          width: 800,
          height: 600,
          margin: '-300px 0 0 -400px'});
        $('div', clone).removeClass('hidden');
        // setTimeout(function(){
        //   clone.css({'background-image': 'url(' + shot.image_url + ')'});
        // }, 0);
      },100);
    });

  });
}
