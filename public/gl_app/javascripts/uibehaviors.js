'use strict'

define([
    'fsm',
    'uifilter',
    'BrowserDetect',
],
function(FSM, UIFilter, BrowserDetect) {



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
    left: 1,
    middle: 2,
    right: 3,
};

function mod_proto() {
    return { 16: false, 17: false, 18: false, 91: false };
};

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


/*
format for returned criteria chunks:
[ {button: b_id, mods: { mod_id1: false/true, ... }}, ... ]
*/

// Stole this processing mostly from madrobby/keymaster.js
function commonProcessCriterion(criterion, processLastToken, last_token_name) {
    var criteria = criterion.replace(/\s/g,'').split(',');
    var N = criteria.length;
    if(criteria[N-1]=='') {
        criteria[N-2] += ',';   N-=1;
    }
    var result = [];
    for(var i=0; i<N; i++) {
        var tokens = criteria[i].split('+');
        if(tokens.length < 1)   continue;
        
        var last_token = tokens[tokens.length-1];
        // INJECTED CODE HERE
        var last_token_converted = processLastToken(last_token);
        // END INJECTED CODE
        var mods = mod_proto();
        tokens.slice(0,-1).forEach(function(token) {
            var mapped = MOD_MAP[token];
            if(mapped !== undefined)
                mods[mapped] = true;
        });
        
        var chunk = {mods: mods};
        // INJECTED FIELD NAME
        chunk[last_token_name] = last_token_converted;
        result.push(chunk);
    }
    return result;
}

// platform independence wrapping for keys and mice
function localizeModifiers(chunk)
{
    // DO NOTHING
    // Trying to use override default on mac does not work...
    /*var hasCtrl = chunk.mods[MOD_MAP['ctrl']];
    var hasCmd  = chunk.mods[MOD_MAP['cmd']];
    
    if(hasCtrl && hasCmd) {
        console.log("UIMap Error: Platform Independency Conflict!");
        console.log("Cannot specify both control and command modifier keys.");
        console.log("Collapsing both into a single modifier.");
    }
    if(hasCtrl || hasCmd) {
        if(BrowserDetect.OS == "Mac") {
            chunk.mods[MOD_MAP['ctrl']] = false;
            chunk.mods[MOD_MAP['cmd']]  = true;
        } else {
            chunk.mods[MOD_MAP['ctrl']] = true;
            chunk.mods[MOD_MAP['cmd']]  = false;
        }
    }*/
}

function localizeMouse(chunk)
{
    if(chunk.button == BUTTON_MAP["middle"]) {
        console.log("UIMap Error: Platform Independency Conflict!");
        console.log("No Middle click available on Mac");
    }
    if(chunk.mods[MOD_MAP['ctrl']]) {
        console.log("UIMap Error: Platform Independency Conflict!");
        console.log("ctrl click on mac is right click!");
    }
    // handle right mouse button fiasco on mac
    if(BrowserDetect.OS == "Mac") {
        if (chunk.button == BUTTON_MAP["right"]) {
            chunk.mods[MOD_MAP['ctrl']] = true;
            if(BrowserDetect.browser != "Firefox")
                chunk.button = BUTTON_MAP["left"];
        }
    }
}

function processMouseCriterion(criterion) {
    var chunks = commonProcessCriterion(criterion, function(last_token) {
        var button = BUTTON_MAP[last_token];
        if(button === undefined) button = invalid;
        return button;
    }, 'button');
    chunks.forEach(localizeModifiers);
    chunks.forEach(localizeMouse); // must come second
    return chunks;
}

function processKeyCriterion(criterion) {
    var chunks = commonProcessCriterion(criterion, function(last_token) {
        var key = KEY_MAP[last_token];
        if(key === undefined) {
            if(last_token.length > 1)
                key = invalid;
            else
                key = last_token.charCodeAt(0);
        }
        return key;
    }, 'key');
    chunks.forEach(localizeModifiers);
    return chunks;
}

function createFilter(mouseFilter, keyFilter)
{
    var filter = UIFilter.create();
    
    if(mouseFilter) {
        var criteria = processMouseCriterion(mouseFilter);
        //console.dir(criteria);
        filter.filter('mousedown', function(params, next) {
            var pass = false;
            criteria.forEach(function(chunk) {
                if(params.which == chunk.button &&
                   modMatch(chunk.mods, params)) {
                    pass = true;
                }
            });
            //console.log('down? ' + pass);
            if(pass)
                next(params);
        }).filter('mouseup', function(params, next) {
            var pass = false;
            criteria.forEach(function(chunk) {
                if(params.which == chunk.button)
                    pass = true;
            });
            //console.log('up? ' + pass);
            if(pass)
                next(params);
        });
    }
    if(keyFilter) {
        var criteria = processKeyCriterion(keyFilter);
        filter.filter('keydown', function(params, next) {
            var pass = false;
            criteria.forEach(function(chunk) {
                if(params.which == chunk.key &&
                   modMatch(chunk.mods, params))
                    pass = true;
            });
            //console.log(pass);
            if(pass)
                next(params);
        }).filter('keyup', function(params, next) {
            var pass = false;
            criteria.forEach(function(chunk) {
                //console.log(params.which + ' : ' + chunk.key);
                if(params.which == chunk.key)
                    pass = true;
            });
            if(pass)
                next(params);
        });
    }
    
    return filter;
    
    /*if(signals)
        filter.listen(uimap, signals);
    else
        filter.listen(uimap);
    return filter;*/
}





var mousedrag_template = FSM.template()
    .output('start', 'drag', 'finish')
    .state('up')
        .step('mousedown', 'down', 'start')
    .state('down')
        .step('mouseup', 'up', 'finish')
        .step('mousemove', 'down', 'drag')
    ;

function mousedrag(uimap, mouseFilter)
{
    var fsm = mousedrag_template.compile();
    var filter = createFilter(mouseFilter, '')
        .listen(uimap, ['mousedown', 'mouseup', 'mousemove']);
    fsm.listen(filter);
    
    return fsm;
}

var mousepress_template = FSM.template()
    .output('press')
    .state('up')
        .step('mousedown', 'down')
    .state('down')
        .step('mouseup', 'up', 'press')
    ;

function mousepress(uimap, mouseFilter)
{
    var fsm = mousepress_template.compile();
    var filter = createFilter(mouseFilter, '')
        .listen(uimap, ['mousedown', 'mouseup']);
    fsm.listen(filter);
    
    return fsm;
}

var keypress_template = FSM.template()
    .output('press')
    .state('up')
        .step('keydown', 'down')
    .state('down')
        .step('keyup', 'up', 'press')
    ;

function keypress(uimap, keyFilter)
{
    var filter = createFilter('', keyFilter)
        .listen(uimap, ['keydown', 'keyup']);
    return keypress_template.compile().listen(filter);
}

var mousehover_template = FSM.template()
    .output('hover')
    .state('one')
        .step('mousemove', 'one', 'hover')
    ;

function mousehover(uimap)
{
    return mousehover_template.compile().listen(uimap);
}

var keyhold_template = FSM.template()
    .output('hold', 'finish')
    .state('up')
        .step('keydown', 'down', 'hold')
    .state('down')
        .step('keydown', 'down', 'hold')
        .step('keyup',   'up', 'finish')
    ;

function keyhold(uimap, keyFilter)
{
    var filter = createFilter('', keyFilter)
        .listen(uimap, ['keydown', 'keyup']);
    return keyhold_template.compile().listen(filter);
}



return {
    createFilter: createFilter,
    
    mousedrag:      mousedrag,
    mousepress:     mousepress,
    mousehover:     mousehover,
    keypress:       keypress,
    keyhold:        keyhold,
};

});