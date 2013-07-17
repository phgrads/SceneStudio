
// Taken from John Resig:
// http://ejohn.org/blog/partial-functions-in-javascript/
Function.prototype.partial = function(){
    var fn = this;
    var args = Array.prototype.slice.call(arguments);
    return function(){
        var merged = Array.prototype.slice.call(args); // make copy
        var arg = 0;
        for ( var i = 0; i < merged.length && arg < arguments.length; i++ )
            if ( merged[i] === undefined )
                merged[i] = arguments[arg++];
        while ( arg < arguments.length )
            merged.push(arguments[arg++]);
        return fn.apply(this, merged);
    };
};
