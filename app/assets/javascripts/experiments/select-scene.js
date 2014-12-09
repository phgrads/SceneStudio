'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['./SelectSceneTask','./../gl_app/App'], function(SelectSceneTask, SceneViewer) {
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
      var selectSceneTask = new SelectSceneTask({
        app: app,
        entries: window.globals.entries,
        conf: window.globals.conf
      });
      app.autoSaveOnClose = true;
      app.onSaveCallback = selectSceneTask.saveSceneCallback.bind(selectSceneTask);
      app.onCloseCallback = selectSceneTask.closeSceneCallback.bind(selectSceneTask);
      app.toolbar.LabelButton("Close", "Done", "Done with scene", "done");
      if (window.globals.conf['loadViewIndex']) {
        app.onLoadViewIndex = window.globals.conf['loadViewIndex'];
      } else {
        app.onLoadViewIndex = 0;
      }

      $( '#instructionsToggle' ).click(function() { $( '#instructionsTextDiv' ).toggle(); });
      $('#help').show();
      selectSceneTask.Launch();
      app.Launch();
    } );
  })
});
