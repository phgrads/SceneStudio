'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['./SelectSceneTask','./../gl_app/App'], function(SelectSceneTask, SceneViewer) {
    $(document).ready(function() {
      $("img.enlarge").hover(function(){
        showLarge($(this));
      },function() {
      } );

      var selectSceneTask = new SelectSceneTask({
        base_url: window.globals.base_url,
        entries: window.globals.entries,
        conf: window.globals.conf
      });

      $( '#instructionsToggle' ).click(function() { $( '#instructionsTextDiv' ).toggle(); });
      $('#help').show();
      selectSceneTask.Launch();
    } );
  })
});
