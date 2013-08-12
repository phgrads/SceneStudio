'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
var app;
define(function(require) {
    require(['./SceneViewer'], function(SceneViewer) {
	    app = new SceneViewer(id('canvas'));
	    app.Launch();
    })
});