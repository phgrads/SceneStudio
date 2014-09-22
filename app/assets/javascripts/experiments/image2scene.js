'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['./EditSceneTask','./../gl_app/App'], function(EditSceneTask, SceneEditor) {
    $(document).ready(function() {
      var app = new SceneEditor(id('canvas'));

      var showEntryCallback = function(entry) {
        $('#targetImage').attr('src', entry['url']);
      };
      var editSceneTask = new EditSceneTask({
        app: app,
        entries: window.globals.entries,
        conf: window.globals.conf,
        showEntryCallback: showEntryCallback
      });
      app.onSaveCallback = editSceneTask.saveSceneCallback.bind(editSceneTask);

      editSceneTask.Launch();
      app.Launch();
    } );
  })
});
