'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
require(['./DescribeInteractionTask','jquery','slick','base'], function(DescribeInteractionTask) {
    $(document).ready(function() {
        var describeInteractionTask = new DescribeInteractionTask({
            base_url: window.globals.base_url, // empty, in this case
            entries: window.globals.entries, // nScenes-long array of scene-pairs to test
            conf: window.globals.conf // information from conf file
        });

        describeInteractionTask.Launch();
    } );
})
});
