'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['./DescribeInteractionTask','jquery','base'], function(DescribeInteractionTask) {
    $(document).ready(function() {
      $("img.enlarge").hover(function(){
        showLarge($(this));
      },function() {
      } );

      var showEntryCallback = function(entry) {
        $('#sentence').text(entry['description']);
      };
      var describeInteractionTask = new DescribeInteractionTask({
        base_url: window.globals.base_url,
        entries: window.globals.entries,
        conf: window.globals.conf
      });

      describeInteractionTask.Launch();
    } );
  })
});
