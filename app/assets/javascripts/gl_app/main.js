'use strict';

//// Set up names and dependencies for non-module scripts
//requirejs.config({
//    baseUrl: window.globalViewData.base_url + '/gl_app/javascripts',
//	paths: {
//		'async' : 'async.min',
//		'jquery' : 'jquery-ui/js/jquery-1.7.2.min',
//		'jquery-ui': 'jquery-ui/js/jquery-ui-1.8.21.custom.min',
//		'gl-matrix': 'gl-matrix-min',
//        'game-shim': 'game-shim'
//	},
//	shim: {
//		'jquery.debouncedresize' : ['jquery'],
//		'jquery-ui' : ['jquery'],
//		'gl-matrix-ext' : ['gl-matrix'],
//		'loader' : ['base']
//	}
//});



// TODO: Global scope for runtime debugging, pull declaration into scope below
var app;
// Application entry point
//define(function(require) {
//    var app = require('./SceneViewer');
//    app.Launch();
//});
define(function(require) {
    require(['./App','./SceneViewer'], function(App,SceneViewer) {
	    app = new SceneViewer(id('canvas'));
        //app = new App(id('canvas'));
	    app.Launch();
    })
});
