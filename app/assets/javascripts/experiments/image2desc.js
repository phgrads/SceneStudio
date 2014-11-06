'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['./DescribeImageTask'], function(DescribeSceneTask) {
    $(document).ready(function() {
      $("img.enlarge").hover(function(){
        showLarge($(this));
      },function() {
      } );

      var showEntryCallback = function(entry) {
        $('#sentence').text(entry['description']);
      };
      var describeSceneTask = new DescribeSceneTask({
        entries: window.globals.entries,
        conf: window.globals.conf
      });

      describeSceneTask.Launch();
    } );
  })
});
