'use strict'

define([
],
function() {



var Filter = Object.create(Object);

function create()
{
    var filter = Object.create(Filter);
    filter.outputs = {};
    filter.filters = {};
    return filter;
}

Filter.output = function()
{
    if(arguments.length < 1)    return this;
    
    // normalize input into an array of names
    var args = (arguments[0] instanceof Array)?
                            arguments[0] :
                            Array.prototype.slice.call(arguments);
    var outputs = this.outputs;
    args.forEach(function(out_name) {
        if((typeof out_name) == 'string' && !outputs[out_name])
            outputs[out_name] = [];
    });
    
    return this;
};

Filter.filter = function(signal, filter_fn)
{
    if(!this.outputs[signal])
        this.output(signal);
    
    this.filters[signal] = filter_fn;
    return this;
};

Filter.dispatch = function(input, params)
{
    var handlers = this.outputs[input];
    if(handlers === undefined)    return this;
        
    // actual dispatch
    function next(parameters) {
        //console.dir(handlers);
        handlers.forEach(function(handler) {
            handler(parameters);
        });
    }
    
    // whether to filter or not
    if(this.filters[input])
        this.filters[input](params, next);
    else
        next(params);
    
    return this;
};

Filter.on = function(output, callback)
{
    if(this.outputs[output])
        this.outputs[output].push(callback);
    return this;
};

Filter.listen = function(src, signals)
{
    if(signals === undefined) {
        signals = [];
        for(var out_name in src.outputs)
            signals.push(out_name);
    }
    else if((typeof signals) == 'string')
        signals = [signals];
    
    this.output(signals); // make sure all of these signals are being published
    signals.forEach(function(signal) {
        src.on(signal, Filter.dispatch.partial(signal).bind(this));
    }.bind(this));
    
    return this;
};


return {
    create: create,
};




});