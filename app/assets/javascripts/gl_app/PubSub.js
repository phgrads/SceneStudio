'use strict';

define(function(){
	
/**
 * PubSub defines a publisher/subscriber model. An object that extends PubSub can
 * register subscribers (functions) that will be called whenever the object 'publishes'
 * an event with a particular name. Published events can also come with an arbitrary
 * list of arguments which are passed to the subscriber functions.
**/
	
function PubSub()
{
	this.subscribers = {};
}

PubSub.prototype.Subscribe = function(eventname, contextObj, callback)
{
	var subs = this.subscribers;
	if (!subs[eventname])
		subs[eventname] = [];
	var esubs = subs[eventname];
		
	// Only add the callback if it hasn't already been added
	var found = false;
	for (var i = 0; i < esubs.length; i++)
	{
		var entry = esubs[i];
		if (entry.ctx === contextObj && entry.func === callback)
		{
			found = true;
			break;
		}
	}
	if (!found)
		esubs.push({ ctx: contextObj, func: callback });
}

PubSub.prototype.Unsubscribe = function(eventname, contextObj, opt_callback)
{
	var subs = this.subscribers;
	var esubs = subs[eventname];
	if (!esubs) return;
	
	var newsubs = [];
	for (var i = 0; i < esubs.length; i++)
	{
		var entry = esubs[i];
		if (entry.ctx !== contextObj || (opt_callback && (entry.func !== opt_callback)))
			newsubs.push(entry);
	}
	subs[eventname] = newsubs;
}

PubSub.prototype.Publish = function(eventname)
{
	var esubs = this.subscribers[eventname];
	var optargs = Array.prototype.slice.call(arguments, 1);
	if (esubs)
	{
		// Notify all subscribers
		esubs.forEach(function(entry) {
			entry.func.apply(entry.ctx, optargs);
		});
	}
}


// Exports
return PubSub;
	
});