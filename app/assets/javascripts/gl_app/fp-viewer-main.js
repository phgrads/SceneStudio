'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
var app;
define(function(require) {
    require(['./SceneViewer'], function(SceneViewer) {
      app = new SceneViewer({
        canvas: id('canvas'),
        includeToolbar: true
      });
	    app.Launch();
      app.EnterFullScreen();
    })
});