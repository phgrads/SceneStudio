'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
var app;
define(function(require) {
    require(['./SelectViewTask'], function(SelectViewTask) {
	    app = new SelectViewTask({
          canvas: id('canvas'),
          entries: window.globals.entries,
          conf: window.globals.conf
      });
	    app.Launch();
    })
});