'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['./DescribeSceneTask','./../gl_app/App'], function(DescribeSceneTask, SceneViewer) {
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
      var describeSceneTask = new DescribeSceneTask({
        app: app,
        entries: window.globals.entries,
        conf: window.globals.conf
      });
      app.autoSaveOnClose = true;
      app.onSaveCallback = describeSceneTask.saveSceneCallback.bind(describeSceneTask);
      app.onCloseCallback = describeSceneTask.closeSceneCallback.bind(describeSceneTask);
      app.toolbar.LabelButton("Close", "Done", "Done with scene", "done");

      describeSceneTask.Launch();
      app.Launch();
    } );
  })
});
