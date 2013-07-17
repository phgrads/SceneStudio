
'use strict';

UILog = { log_buffer: [] };

UILog.log = function(entry) {
    UILog.log_buffer.push(entry);
}

// this function can be extended later to perform basic compression
UILog.extractLog = function() {
    var buffer_string = JSON.stringify(UILog.log_buffer);
    UILog.log_buffer = [];
    return buffer_string;
}