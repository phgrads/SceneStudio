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
            base_url: window.globals.base_url, // empty, in this case
            entries: window.globals.entries, // nScenes-long array of scene-pairs to test
            conf: window.globals.conf // information from conf file
        });

        describeInteractionTask.Launch();
    } );
})
});
