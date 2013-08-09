// TODO: Global scope for runtime debugging, pull declaration into scope below
var app;
// Application entry point
require(['App'], function(App) {
    app = new App(id('canvas'));
    app.Launch();
});