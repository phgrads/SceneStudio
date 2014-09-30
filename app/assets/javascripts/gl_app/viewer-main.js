'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
var app;
define(function(require) {
    require(['./App'], function(SceneViewer) {
      app = new SceneViewer({
        canvas: id('canvas'),
        allowEdit: false
      });
	    app.Launch();
    })
});