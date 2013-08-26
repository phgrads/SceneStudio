'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
var app;
define(function(require) {
    require(['./AnalyticsViewer'], function(AnalyticsViewer) {
	    app = new AnalyticsViewer(id('canvas'));
	    app.Launch();
    })
});