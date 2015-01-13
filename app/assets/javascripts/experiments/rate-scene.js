'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['./RateSceneTask'], function(RateSceneTask) {
    $(document).ready(function() {
      $("img.enlarge").hover(function(){
        showLarge($(this));
      },function() {
      } );

      var rateSceneTask = new RateSceneTask({
        base_url: window.globals.base_url,
        entries: window.globals.entries,
        conf: window.globals.conf
      });

      $( '#instructionsToggle' ).click(function() { $( '#instructionsTextDiv' ).toggle(); });
      $('#help').show();
      rateSceneTask.Launch();
    } );
  })
});
