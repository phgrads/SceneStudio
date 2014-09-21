'use strict';

define([
],
function() {

/*
    ENVISIONED USAGE
    
var mousedrag_template = FSM.template()
    .output('start', 'continue', 'finish'); // defined outputs
    .state('up')
        .step('mousedown', function(fsm, params) {
            fsm.jump('down');
            fsm.emit('start', params);
        })
    .state('down')
        .step('mouseup', function(fsm, params) {
            fsm.jump('up', 'finish', params);
        }
        .step('mousemove', 'down', 'continue', params)
        //.spoof('mousedown', 'mouseup'); // re-route signal
    ;

var mousedrag = mousedrag_template.compile();

// filter all mousedown and mouseup events that do not originate from
// the left mouse button
mousedrag.filter(['mousedown', 'mouseup'], function(params, next) {
    if (params.which == LEFT_BUTTON)
        next(params);
});

// need to hook things up
uimap.on('mousedown', function(params) {
    mousedrag.dispatch('mousedown', params);
});
uimap.onmousedown(function(params) {
    mousedrag.mousedown(params);
});
uimap.onmousedown(mousedrag.mousedown.bind(mousedrag));
mousedrag.listen(uimap, 'mousedown');
mousedrag.listen(uimap); // scans respective I/O names and hooks up matches

*/

function isFunction(obj)
{
    // can be spoofed since duck typed
    return !!(obj && obj.constructor && obj.call && obj.apply);
}



// produce a blank FSM template;
// accumulate the definition in this object,
// and then compile once accumulated
function template()
{
    var template = Object.create(FSMTemplate);
    template.states = {};
    template.outputs = {};
    template.inputs = {};
    template.start_state = undefined;
    // used to maintain scope during specification, not runtime state
    template.curr_state = undefined; 
    
    return template;
}

var FSMTemplate = Object.create(Object);

FSMTemplate.isConflict = function(name)
{
    if([
        'outputs',
        'inputs',
        'curr_state',
        'states',
        'dispatch',
        'emit',
        'jump',
        'on',
        'listen'
    ].indexOf(name) >= 0) {
        throw new Error('cannot use the name ' + name +
                        ' in an FSM, since that name is already reserved.');
    }
};

FSMTemplate.output = function()
{
    if(arguments.length < 1)    return this;
    
    // either take an array of names or turn the arguments into said array
    var args = (arguments[0] instanceof Array)?
                            arguments[0] :
                            Array.prototype.slice.call(arguments);
    // accumulate all well-formed (i.e. string) names in the set of outputs
    var outputs = this.outputs;
    args.forEach(function(out_name) {
        if((typeof out_name) == 'string')
            outputs[out_name] = null; // add name to set
    });
    
    return this;
};

FSMTemplate.state = function(state_name)
{
    if(!this.start_state)
        this.start_state = state_name;
    
    this.curr_state = state_name;
    if(!this.states[state_name])
        this.states[state_name] = {}; // stub if first time spec-ing state
    
    return this;
};

FSMTemplate.step = function(input_name, state_name, output_name)
{
    var handler = state_name;
    var outputs = (output_name instanceof Array)? output_name : [output_name];
    if ((typeof state_name) == 'string') {
        handler = function(fsm, params) {
            fsm.jump(state_name);
            for(var i=0; i<outputs.length; i++)
                fsm.emit(outputs[i], params);
        };
    }
    
    this.inputs[input_name] = null; // add name to set
    this.states[this.curr_state][input_name] = handler;
    
    return this;
};

FSMTemplate.spoof = function(input_name, reroute)
{
    this.inputs[input_name] = null;
    this.states[this.curr_state][input_name] = function(fsm, params) {
        fsm.dispatch(reroute, params);
    };
    
    return this;
};

// handler should have the form: func(fsm, params, next)
FSMTemplate.shim = function(input_names, handler)
{
    if((typeof input_names) == 'string')
        input_names = [input_names];
    
    input_names.forEach(function(in_name) {
        var current = this.states[this.curr_state][in_name];
        if(!current) {
            console.log("ERROR: Tried to shim\n    " + in_name +
                        "\nwhich doesn't have a handler...");
            return;
        }
        this.states[this.curr_state][in_name] =
            handler.partial(undefined, undefined, current);
    }.bind(this));
    
    return this;
};

FSMTemplate.repeat = function()
{
    if(arguments.length < 1)    return this;
    
    // either take an array of names or turn the arguments into said array
    var args = (arguments[0] instanceof Array)?
                            arguments[0] :
                            Array.prototype.slice.call(arguments);
    args.forEach(function(signal) {
        this.step(signal, this.curr_state, signal);
    }.bind(this));
    
    return this;
};



FSMTemplate.compile = function()
{
    var fsm = Object.create(CompiledFSM);
    
    fsm.curr_state      = this.start_state;
    
    fsm.states          = {};
    for(var state_name in this.states) {
        var state = this.states[state_name];
        
        var transitions = fsm.states[state_name] = {};
        
        for(var input in state) {
            transitions[input] = state[input].partial(fsm);
        }
    }
    
    fsm.inputs          = {}; // set of input names
    for(var in_name in this.inputs) {
        fsm.inputs[in_name] = null;
        
        // aliases for dispatch(...)
        if(fsm[in_name]) {
            throw new Error('FSM compilation: the name '+
                            in_name+' conflicts');
        } else {
            fsm[in_name] = fsm.dispatch.partial(in_name);
        }
    }
    
    fsm.outputs         = {}; // handlers
    for(var out_name in this.outputs) {
        fsm.outputs[out_name] = []; // no handlers to begin
        
        // aliases for on(...)
        if(!fsm['on'+out_name]) {
            fsm['on'+out_name] = fsm.on.partial(out_name);
        } else {
            throw new Error('FSM compilation: the name on'+
                            out_name+' conflicts');
        }
    }
    
    // add Moore-machine style output signals...
    for(var state_name in this.states) {
        var out_name = 'state_' + state_name;
        if(fsm.outputs[out_name]) {
            throw new Error('FSM compilation: the output name ' + out_name +
                            ' conflicts');
        } else {
            fsm.outputs[out_name] = [];
            
            // aliases
            fsm['on'+out_name] = fsm.on.partial(out_name);
        }
    }
    
    return fsm;
};



var CompiledFSM = Object.create(Object);

CompiledFSM.dispatch = function(input, params)
{
    var state_table = this.states[this.curr_state];
    if(state_table[input])
        state_table[input](params);
    return this;
};

CompiledFSM.jump = function(next_state, output, params)
{
    var changed = this.curr_state != next_state;
    this.curr_state = next_state;
    if(changed) this.emit('state_'+next_state);
        // emit Moore-machine style message
    if(output) // only emit if parameters are provided
        this.emit(output, params);
    return this;
};

CompiledFSM.emit = function(output, params)
{
    //console.log('emit ' + output);
    var callbacks = this.outputs[output];
    if(callbacks) {
        for(var i = 0; i < callbacks.length; i++)
            callbacks[i](params);
    }
    return this;
};

CompiledFSM.on = function(output, callback)
{
    if(this.outputs[output] !== undefined) {
        this.outputs[output].push(callback);
    }
    return this;
};

CompiledFSM.listen = function(src_fsm, signals)
{
    if(signals === undefined) {
        signals = [];
        for(var out_name in src_fsm.outputs)
            signals.push(out_name);
    }
    else if((typeof signals) == 'string')
        signals = [signals];
    //console.dir(signals);
    
    signals.forEach(function(signal) {
        if(this.inputs[signal] !== undefined)
            src_fsm.on(signal, this.dispatch.partial(signal).bind(this));
    }.bind(this));
    
    return this;
};

CompiledFSM.detach = function(signals)
{
    if(signals === undefined) {
        signals = [];
        for(var out_name in this.outputs)
            signals.push(out_name);
    }
    else if((typeof signals) == 'string')
        signals = [signals];
    
    signals.forEach(function(signal) {
        if(this.outputs[signal])
            this.outputs[signal] = [];
    }.bind(this));
};

// HOW TO MAKE AN OBJECT FOCUSABLE:
//  (1) The object must be pickable
//  (2) The object must supply a 'focus_listener' member object
//  (3) This object must have an FSM-like listen/dispatch interface
//          to which events will be routed during focus
//  (4) Events which will be dispatched:
//          mousedown, mouseup, mousemove,
//          keydown, keyup
//          focus, defocus
// The focus machine built here is responsible for centralizing
// and managing the concept of application focus.
function focusmachine(app) {
    var uimap = app.uimap;

    // hidden state: which object is currently focused on
    var focusedObject = null;
    // hidden state: keep track of mouse position so we can spoof...
    var prevX = null, prevY = null;
    function xyShim(fsm, params, next) {
        prevX = params.x;
        prevY = params.y;
        next(fsm, params);
    }

    // "semaphore" for keeping track of how many extra
    // interruptions are occurring right now.
    var extra_interruptions = 0;

    function augmentShim(fsm, params, next) {
        params.lockFocus = fsm.lock.bind(fsm);
        params.unlockFocus = fsm.unlock.bind(fsm);
        params.app = app;
        next(fsm, params);
    }

    function focusable(obj) {
        return obj && obj.focus_listener;
    }
    function focusOn(fsm, target) {
        if(focusable(target)) {
            focusedObject = target;
            // hook up the new object
            target.focus_listener.listen(fsm);
            // and inform it that it's been focused on
            fsm.emit('focus', {app: app});
        }
    }
    function defocusShim(fsm, params, next) {
        if(focusedObject) {
            fsm.emit('defocus', {app: app});
            fsm.detach();
            focusedObject = null;
        }
        if(next) next(fsm, params); // guard to allow non-shim use
    }
    function updateFocus(fsm, x, y) {
        var oldobj = focusedObject;
        var newobj = app.renderer.picker.PickObject(x, y, app.renderer);
        if (newobj !== oldobj) {
            defocusShim(fsm);
            focusOn(fsm, newobj);
        }
    }
    function reset(fsm, params) {
        fsm.jump('free');
        updateFocus(fsm, prevX, prevY);
    }
    var uimap_signals = ['mousedown', 'mousemove', 'mouseup',
        'keydown', 'keyup'];
    var focus_template = template()
            .output(uimap_signals) // spoof uimap to the object...
            .output('focus', 'defocus') // extra signals
            .state('free')
            .step('mousemove', function(fsm, params) {
                updateFocus(fsm, params.x, params.y);
                fsm.emit('mousemove', params);
            })
            .repeat('mousedown', 'mouseup', 'keydown', 'keyup')
            .shim('mousemove', xyShim)
            .shim(uimap_signals, augmentShim)
            .step('lock', 'locked')
            .step('start_interruption', 'interrupted')
            .shim('start_interruption', defocusShim)
            .state('interrupted')
            // ERROR: need semaphore counter for this state...
            // ALSO: should have some kind of global UI monitor/reset
            //          for safety...
            .step('start_interruption', function(fsm, params) {
                extra_interruptions += 1;
            })
            .step('finish_interruption', function(fsm, params) {
                if(extra_interruptions > 0)
                    extra_interruptions -= 1;
                else
                    reset(fsm, params);
            })
            .step('mousemove', 'interrupted') // jump nowhere
            .shim('mousemove', xyShim) // but update xy data
            .state('locked')
            .step('start_interruption', 'interrupted')
            .shim('start_interruption', defocusShim)
            .repeat(uimap_signals)
            .shim('mousemove', xyShim)
            .shim(uimap_signals, augmentShim)
            // call from focused object to release lock
            .step('unlock', reset)
        ;

    var fsm = focus_template.compile().listen(uimap);

    // non-writable interface
    fsm.isFocused = function() { // not whether it's locked...
        return !!(focusedObject);
    };
    fsm.isLocked = function() {
        return fsm.curr_state == 'locked';
    };
    fsm.instance = function() {
        return focusedObject;
    };

    return fsm;
}


return {
    template: template,
    focusmachine: focusmachine
};



});
