'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['./AlignTextTask','./../gl_app/App'], function(AlignTextTask, SceneViewer) {
    $(document).ready(function() {
      $("img.enlarge").hover(function(){
        showLarge($(this));
      },function() {
      } );

      var app = new SceneViewer({
        canvas: id('canvas'),
        allowEdit: false
      });

      var showEntryCallback = function(entry) {
        $('#sentence').text(entry['description']);
      };
      var alignTextTask = new AlignTextTask({
        app: app,
        entries: window.globals.entries,
        conf: window.globals.conf
      });
      app.autoSaveOnClose = true;
      app.onSaveCallback = alignTextTask.saveSceneCallback.bind(alignTextTask);
      app.onCloseCallback = alignTextTask.closeSceneCallback.bind(alignTextTask);
      app.toolbar.LabelButton("Close", "Done", "Done with scene", "done");
      if (window.globals.conf['loadViewIndex']) {
        app.onLoadViewIndex = window.globals.conf['loadViewIndex'];
      } else {
        app.onLoadViewIndex = 0;
      }

      $( '#instructionsToggle' ).click(function() { $( '#instructionsTextDiv' ).toggle(); });
      $('#help').show();
      alignTextTask.Launch();
      app.Launch();
    } );
  })
});
