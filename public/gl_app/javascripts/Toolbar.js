'use strict'

define([
	'Constants',
	'jquery'
],
function(Constants){
	
function Toolbar(app)
{
	this.app = app;
	this.elem = $('#toolbar');
	this.buttons = {};
	
	this.AddButton('Undo', 'Undo (Z)',
	               'undo', function(event) {
		app.Undo();
	});
	this.AddButton('Redo', 'Redo (Y)',
	               'redo', function(event) {
		app.Redo();
	});
	
	this.AddSpacer();
	
	this.AddButton('Copy', 'Copy selected model (C)',
	               'copy', function(event) {
		app.Copy();
	});
	this.AddButton('Paste', 'Paste copied model (V)',
	               'paste', function(event) {
		app.Paste();
	});
	this.AddButton('Delete', 'Delete selected model (Delete)',
	               'delete', function(event) {
		app.Delete();
	});
	this.AddButton('Tumble', 'Tumble selected model (M)',
	               'tumble', function(event) {
		app.Tumble(this.app.uistate.selectedInstance, true);
	}.bind(this));
	
	this.AddSpacer();
	
	this.AddButton('Save', 'Save scene (S)',
	               'save', function(event) {
	   app.SaveScene();
    });
	this.AddButton('Close', 'Close the editor',
	               'close', function(event) {
	   app.ExitTo('scenes/');
    });
	
	// Disable buttons in the intial state
	this.DisableButton('Undo');
	this.DisableButton('Redo');
	this.DisableButton('Copy');
	this.DisableButton('Paste');
	this.DisableButton('Delete');
	this.DisableButton('Tumble');
	
	// Subscribe to app notifications so we can disable/enable/hide as necessary
	this.app.Subscribe('SelectedInstanceChanged', this, function(oldInst, newInst) {
		if (oldInst)
		{
			oldInst.Unsubscribe('Moving', this);
			oldInst.Unsubscribe('StoppedMoving', this);
		}
		if (newInst)
		{
			this.EnableButton('Copy');
			this.EnableButton('Delete');
			this.EnableButton('Tumble');
			newInst.Subscribe('Moving', this, this.Hide);
			newInst.Subscribe('StoppedMoving', this, this.Show);
		}
		else
		{
			this.DisableButton('Copy');
			this.DisableButton('Delete');
			this.DisableButton('Tumble');
		}
	});
	this.app.Subscribe('CopyCompleted', this, function() {
		this.EnableButton('Paste');
	});
	this.app.undoStack.Subscribe('RestoredSavedState', this, function() {
		this.EnableButton('Undo');
		this.EnableButton('Redo');
	});
	this.app.undoStack.Subscribe('ReachedBeginning', this, function() {
		this.DisableButton('Undo');
	});
	this.app.undoStack.Subscribe('ReachedEnd', this, function() {
		this.DisableButton('Redo');
	});
	this.app.undoStack.Subscribe('RecordedNewState', this, function() {
		this.EnableButton('Undo');
	});
}

Toolbar.prototype.AddButton = function(name, tooltip, iconName, callback)
{
	var button = $('<div class="button"><\div>');
	button.attr('title', tooltip);
	button.append($('<span class="buttonLabel">' + name + '<\span>'));
	var iconURL = Constants.resourceDir + 'toolbar_icons/' + iconName;
	button.css('background-image', 'url(' + iconURL + '_normal.png)');
	
	// Change the icon color when the button is active
	button.mousedown(function(event) {
		button.css('background-image', 'url(' + iconURL + '_active.png)');
		var mouseup = function(event) {
			button.css('background-image', 'url(' + iconURL + '_normal.png)');
			$(document).unbind('mouseup', mouseup);
		};
		$(document).mouseup(mouseup);	
	});
	
	// Click callback
	button.click(function(event) {
		if (!button.hasClass('disabled'))
			callback(event);
	});
	
	this.elem.append(button);
	this.buttons[name] = button;
}

Toolbar.prototype.AddSpacer = function()
{
	this.elem.append($('<div class="spacer"><\div>'));
}

Toolbar.prototype.EnableButton = function(name)
{
	var button = this.buttons[name];
	button && button.removeClass('disabled');
}

Toolbar.prototype.DisableButton = function(name)
{
	var button = this.buttons[name];
	button && button.addClass('disabled');
}

Toolbar.prototype.Hide = function()
{
	this.elem.hide();
}

Toolbar.prototype.Show = function()
{
	this.elem.show();
}


// Exports
return Toolbar;
	
});