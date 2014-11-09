'use strict';

define([], function() {

    UILog.EVENT = Object.freeze({
        RAW_MOUSE       : "RAW_MOUSE",
        RAW_KEY         : "RAW_KEY",

        STATE_MOUSE     : "STATE_MOUSE",
        STATE_CAMERA    : "STATE_CAMERA",
        STATE_SCENE     : "STATE_SCENE",

        SCENE_CREATE    : "SCENE_CREATE",
        SCENE_LOAD      : "SCENE_LOAD",
        SCENE_SAVE      : "SCENE_SAVE",
        SCENE_CLOSE     : "SCENE_CLOSE",

        CAMERA_ORBIT    : "CAMERA_ORBIT",
        CAMERA_DOLLY    : "CAMERA_DOLLY",
        CAMERA_ZOOM     : "CAMERA_ZOOM",
        CAMERA_RESET    : "CAMERA_RESET",

        MODEL_SELECT    : "MODEL_SELECT",
        MODEL_DESELECT  : "MODEL_DESELECT",
        MODEL_ROTATE    : "MODEL_ROTATE",
        MODEL_SCALE     : "MODEL_SCALE",
        MODEL_TUMBLE    : "MODEL_TUMBLE",
        MODEL_DELETE    : "MODEL_DELETE",
        MODEL_INSERT    : "MODEL_INSERT",
        MODEL_COPY      : "MODEL_COPY",
        MODEL_PASTE     : "MODEL_PASTE",

        SEARCH_QUERY    : "SEARCH_QUERY",
        SEARCH_SCROLL   : "SEARCH_SCROLL",
        SEARCH_SELECT   : "SEARCH_SELECT",
        SEARCH_DESELECT : "SEARCH_DESELECT",

        UNDOSTACK_UNDO  : "UNDOSTACK_UNDO",
        UNDOSTACK_REDO  : "UNDOSTACK_REDO",

        MISC            : "MISC"
    });

    function UIEvent(type, input, data, time) {
        // Event type (see UILog.EVENT)
        this.type = type;
        // Actual user input (keypress, mouse movement, etc)
        this.input = input;
        // Additional data associated with the event
        // modelIndex, scale, rotation, etc
        this.data = data;
        // Event timestamp
        this.time = time;
    }

    function UILog() {
        this.log_buffer = [];
        this.saveToBuffer = false;
    }

    UILog.prototype.log = function(type, rawinput, data) {
      if (this.saveToBuffer) {
        var time = new Date().getTime();
        data = data || "";
        // TODO: Filter important fields from rawinput
        var input = rawinput;
        var evt = new UIEvent(type, input, data, time);
        this.log_buffer.push(evt);
      }
    };

    UILog.prototype.stringify = function() {
        return JSON.stringify(this.log_buffer);
    };

    UILog.prototype.fromJSONString = function(string) {

        this.log_buffer = (string) ? JSON.parse(string) : [];
    };

    UILog.prototype.clear = function() {
        this.log_buffer = [];
    };

    return UILog;
});