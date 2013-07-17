'use strict';

define([
	'BrowserDetect',
	'jquery',
	'base',
	'fsm',
],
function(BrowserDetect, FSM){

// This Module uses ideas from madrobby's keymaster script,
// which was made available under the MIT License.
// Please see the project on github for more information:
// https://github.com/madrobby/keymaster/


// WRAP everything in another function which will create
// an instance.  This ensures proper data encapsulation/privacy
// while allowing for instancing of the uimap module!
function create(canvas) {

// MODULE VARIABLES...

var mousedown_handlers = [];
var mouseup_handlers = [];
var mousemove_handlers = [];

var keydown_handlers = [];
var keyup_handlers = [];

var ui_key_update_callbacks = [];

var prevX = 0;
var prevY = 0;

var diffX = 0;
var diffY = 0;

// assign this value if a MAP lookup fails
var invalid = -1;

// stole maps mostly from madrobby/keymaster
var MOD_MAP = {
    '⇧': 16, shift: 16,
    '⌥': 18, alt: 18, option: 18, opt: 18,
    '⌃': 17, ctrl: 17, control: 17,
    '⌘': 91, command: 91, cmd: 91,
};

var KEY_MAP = {
    backspace: 8, tab: 9, clear: 12,
    enter: 13, 'return': 13,
    esc: 27, escape: 27, space: 32,
    left: 37, up: 38,
    right: 39, down: 40,
    del: 46, 'delete': 46,
    home: 36, end: 35,
    pageup: 33, pagedown: 34,
    ',': 188, '.': 190, '/': 191,
    '`': 192, '-': 189, '=': 187,
    ';': 186, '\'': 222,
    '[': 219, ']': 221, '\\': 220,
};

var BUTTON_MAP = {
    left: 0,
    middle: 1,
    right: 2,
};

var button_status = { 0: false, 1: false, 2: false };
function button_proto() {
    return { 0: false, 1: false, 2: false };
};
//var mod_status = { 16: false, 17: false, 18: false, 91: false };
function mod_proto() {
    return { 16: false, 17: false, 18: false, 91: false };
};

// END MODULE VARIABLES


function modMatch(mods, event) {
    /*if(BrowserDetect.OS == "Mac" &&
       BrowserDetect.browser == "Firefox")
    {
        event.ctrlKey = false; // suppress control key on Mac/Firefox
    }*/
    return (mods[MOD_MAP['alt']] == event.altKey) &&
           (mods[MOD_MAP['ctrl']] == event.ctrlKey) &&
           (mods[MOD_MAP['shift']] == event.shiftKey) &&
           (mods[MOD_MAP['cmd']] == event.metaKey);
}

function buttonMatch(buttons) {
    for (var key in button_status) {
        if(button_status[key] !== buttons[key])
            return false;
    }
    return true;
}

function arrayRemove(array, item) {
    for(var i=0; i<array.length; i++) {
        if(array[i] === item) {
            array.splice(i,1);
            break;
        }
    }
}

function setModifiersFromEvent(event) {
/*    if(event.shiftKey === undefined)    return;
    mod_status[MOD_MAP.shift] = event.shiftKey;
    mod_status[MOD_MAP.ctrl] = event.ctrlKey;
    mod_status[MOD_MAP.alt] = event.altKey;*/
}



function install()
{
    installHandlers();
}

function installHandlers()
{
    canvas = canvas || $('#canvas')[0];
    function inCanvas(event) {
        return event.target == canvas;
    }
    
    function dispatchEvent(handler_list, event) {
        var list_copy = [];
        handler_list.forEach(function(x) { list_copy.push(x); });
        // We make a copy to ensure that there are no conflicts
        // if handlers are removed from their own list during processing
        list_copy.forEach(function(handler) {
            handler(event);
        });
    }
    
    function anyButtonDown() {
        return button_status[0] ||
               button_status[1] ||
               button_status[2];
    }
    
    $(document).mousedown(function(event) {
        setModifiersFromEvent(event);
        button_status[event.button] = true;
        // check if a button is already down? nah.
        prevX = event.clientX;
        prevY = event.clientY;
        if(inCanvas(event))
            dispatchEvent(mousedown_handlers, event);
    });
    
    $(document).mouseup(function(event) {
        setModifiersFromEvent(event);
        button_status[event.button] = false;
        //if(inCanvas(event))
        // ALWAYS dispatch mouse up events
            dispatchEvent(mouseup_handlers, event);
        // NOTE: This is currently error-prone, since
        // not every mouseup event is guaranteed to be preceeded
        // by an opening mousedown event...
    });
    
    $(document).mousemove(function(event) {
        setModifiersFromEvent(event);
        diffX = event.clientX - prevX;
        diffY = event.clientY - prevY;
        if(inCanvas(event))
            dispatchEvent(mousemove_handlers, event);
        // update after dispatch
        prevX = event.clientX;
        prevY = event.clientY;
    });
    
    $(document).mouseenter(function(event) {
        // make sure we don't get jumpiness from
        // moving the cursor outside the canvas...  ?
        prevX = event.clientX;
        prevY = event.clientY;
    });
    
    $(canvas).keydown(function(event) {
        dispatchEvent(keydown_handlers, event);
        ui_key_update_callbacks.forEach(function(callback) {
            callback();
        });
        //console.log('keydown in canvas: ' + event.which);
    });
    $(canvas).keyup(function(event) {
        dispatchEvent(keyup_handlers, event);
        ui_key_update_callbacks.forEach(function(callback) {
            callback();
        });
    });
}














var outputs = {
    mousedown:  [],
    mousemove:  [],
    mouseup:    [],
    keydown:    [],
    keyup:      [],
};

function on(output, callback)
{
    if(outputs[output] === undefined)  return;
    outputs[output].push(callback);
}

var fsm_spoof_methods = 
{
    outputs:        outputs,
    on:             on,
    onmousedown:    on.partial('mousedown'),
    onmouseup:      on.partial('mouseup'),
    onmousemove:    on.partial('mousemove'),
    onkeydown:      on.partial('keydown'),
    onkeyup:        on.partial('keyup'),
};

// install handlers to drive the fsm-like uimap interface
function eventToParams(event, extension) {
    var params = {
        which:      event.which,
        altKey:     event.altKey,
        ctrlKey:    event.ctrlKey,
        shiftKey:   event.shiftKey,
        metaKey:    event.metaKey,
        x:          event.clientX,
        y:          event.clientY,
        preventDefault: function() {
                event.preventDefault();
            },
    };
    for(var field in extension)
        params[field] = extension[field];
    return params;
}
mousedown_handlers.push(function(event) {
    outputs.mousedown.forEach(function(callback) {
        var params = eventToParams(event, {
        });
        callback(params);
})});
mouseup_handlers.push(function(event) {
    outputs.mouseup.forEach(function(callback) {
        var params = eventToParams(event, {
            x: prevX, y: prevY,
        });
        callback(params);
})});
mousemove_handlers.push(function(event) {
    outputs.mousemove.forEach(function(callback) {
        var params = eventToParams(event, {
            dx: diffX, dy: diffY,
        });
        callback(params);
})});
keydown_handlers.push(function(event) {
    outputs.keydown.forEach(function(callback) {
        var params = eventToParams(event, {
            x: prevX, y: prevY,
        });
        callback(params);
})});
keyup_handlers.push(function(event) {
    outputs.keyup.forEach(function(callback) {
        var params = eventToParams(event, {
            x: prevX, y: prevY,
        });
        callback(params);
})});












install(); // installs the entire uimap

return fsm_spoof_methods;

} // END create(canvas)

// Exports
return {
    create: create,
};

});