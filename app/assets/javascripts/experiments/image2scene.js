'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['./EditSceneTask','./../gl_app/App'], function(EditSceneTask, SceneEditor) {
    $(document).ready(function() {
      $("img.enlarge").hover(function(){
        showLarge($(this));
      },function() {
      } );

      var app = new SceneEditor({
        canvas: id('canvas'),
        allowEdit: true
      });

      var showEntryCallback = function(entry) {
        $('#targetImage').attr('src', entry['url']);
      };
      var editSceneTask = new EditSceneTask({
        app: app,
        entries: window.globals.entries,
        conf: window.globals.conf,
        showEntryCallback: showEntryCallback
      });
      app.autoSaveOnClose = true;
      app.onSaveCallback = editSceneTask.saveSceneCallback.bind(editSceneTask);
      app.onCloseCallback = editSceneTask.closeSceneCallback.bind(editSceneTask);
      app.toolbar.LabelButton("Close", "Done", "Done with scene");

      editSceneTask.Launch();
      app.Launch();
    } );
  })
});
