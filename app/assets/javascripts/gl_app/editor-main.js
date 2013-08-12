'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
var app;
define(function(require) {
    require(['./App'], function(SceneEditor) {
	    app = new SceneEditor(id('canvas'));
	    app.Launch();
    })
});