'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
var app;
define(function(require) {
  require(['./UpdateScenesApp','./../gl_app/App'], function(UpdateScenesApp, SceneEditor) {
    var app = new SceneEditor({
      canvas: id('canvas'),
      allowEdit: false
    });

    var updateScenesApp = new UpdateScenesApp({
      app: app,
      updateUrl: window.globals.updateUrl,
      entries: window.globals.entries
    });
    app.onLoadCallback = updateScenesApp.loadSceneCallback.bind(updateScenesApp);

    updateScenesApp.Launch();
    app.Launch();
  } );
});