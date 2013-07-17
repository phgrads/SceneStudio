// Check if we are being loaded server-side in which case exports should be defined, else stuff definition into global scope

(function(ns){
// ******************* BEGIN MODULE SCOPE **********************

// regular expression fragments
ns.fragGeneric = "[a-zA-Z0-9_\\s]+";
ns.regexGeneric = new RegExp('^' + ns.fragGeneric + '$');

ns.alphaNumPlus  = function(string) {
    return ns.regexGeneric.test(string);
};

ns.fragSceneName = ns.fragGeneric;
ns.sceneName = ns.alphaNumPlus;

ns.fragUserName = ns.fragGeneric;
ns.userName  = ns.alphaNumPlus;

// Client-side jQuery.validator code
if (typeof $ != 'undefined') {
    $.validator.addMethod("alphanumPlus", function(value, element) {
        return this.optional(element) || ns.alphaNumPlus(value);
    }, "\nOnly letters, numbers, spaces, underscores allowed.");
}

// ******************** END MODULE SCOPE ***********************
})( // choose what to bind to ns,
    // depending on whether we are server or client side
    (typeof exports == 'undefined') ?
        (function() { return window['Validator'] = {}; })()
      : exports
);