'use strict'

define([
	'Constants',
	'jquery-ui',
],
function(Constants){
	
	
function MakeSplitView(options)
{
	var l = options.leftElem;
	var r = options.rightElem;
	
	// Add CSS
	l.css('position', 'absolute');
	l.css('top', '0');
	l.css('left', '0');
	l.css('bottom', '0');
	r.css('position', 'absolute');
	r.css('top', '0');
	r.css('right', '0');
	r.css('bottom', '0');
	
	// Make things jQuery UI resizable
	var opts = {
		handles: 'w',
		minWidth: options.rightMinWidth,
		maxWidth: options.rightMaxWidth,
	};
	if (options.snapToGrid)
		opts.grid = options.snapToGrid;
	r.resizable(opts);
	
	
	// Make the left element resize along with the
	// right one
	function resizeLeft()
	{
		var leftStart = l.offset().left;
		var rightStart = r.offset().left;
		var leftNewWidth = rightStart - leftStart;
		l.width(leftNewWidth);
	}
	r.bind('resize', resizeLeft);
	
	// Correct both left + right in response to a window
	// resize
	function windowResize()
	{
		r.css('left', '');
		
		resizeLeft();
	}
	$(window).bind('resize', windowResize);
	
	// Set up the initial state
	r.width(options.rightMinWidth);
	windowResize();
}


// Exports
return {
	MakeSplitView : MakeSplitView
};
	
});