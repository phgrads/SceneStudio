'use strict';

define([
	'./Constants',
	'jquery'
],
function(Constants){
	
function Toolbar(app, allowEdit)
{
	this.app = app;
	this.elem = $('#toolbar');
  this.elem.hide();
	this.buttons = {};

  this.AddButton('Help', 'Help',
    'help', function() {
    app.Help();
  });

  this.AddButton('Edit Meta', 'Edit Meta',
    'editmeta', function() {
    app.EditMeta();
  });

  this.AddButton('Undo', 'Undo (Ctrl+Z)',
	               'undo', function(evt) {
		app.Undo(evt);
	});
	this.AddButton('Redo', 'Redo (Ctrl+Y)',
	               'redo', function(evt) {
		app.Redo(evt);
	});
	
	this.AddSpacer();
	
	this.AddButton('Copy', 'Copy selected model (Ctrl+C)',
	               'copy', function(evt) {
		app.Copy(evt);
	});
	this.AddButton('Paste', 'Paste copied model (Ctrl+V)',
	               'paste', function(evt) {
		app.Paste(evt);
	});
	this.AddButton('Delete', 'Delete selected model (Delete)',
	               'delete', function(evt) {
		app.Delete(evt);
	});
	this.AddButton('Tumble', 'Tumble selected model (Ctrl+M)',
	               'tumble', function(evt) {
		app.Tumble(evt, this.app.uistate.selectedInstance, true);
	}.bind(this));
	
	this.AddSpacer();
	
	this.AddButton('Save', 'Save scene (Ctrl+S)',
	               'save', function() {
	   app.SaveScene();
    });
	this.AddButton('Close', 'Close the editor',
	               'close', function() {
	   app.Close();
    });
	
	// Disable buttons in the initial state
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

  if (this.app.undoStack) {
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

  if (!allowEdit) {
    this.DisableButton('Save');
    // Hide every button except for close and help
    for (var name in this.buttons) {
      if (name !== 'Close' && name !== 'Help') {
        this.buttons[name].hide();
      }
    }
  }
  this.elem.show();
}

Toolbar.prototype.SetIcon = function(button, iconName)
{
  var iconURL = Constants.resourceDir + 'toolbar_icons/' + iconName;
  button.css('background-image', 'url(' + iconURL + '_normal.png)');

  // Change the icon color when the button is active
  button.mousedown(function() {
    button.css('background-image', 'url(' + iconURL + '_active.png)');
    var mouseup = function() {
      button.css('background-image', 'url(' + iconURL + '_normal.png)');
      $(document).unbind('mouseup', mouseup);
    };
    $(document).mouseup(mouseup);
  });
};

Toolbar.prototype.AddButton = function(name, tooltip, iconName, callback)
{
	var button = $('<div class="button"></div>');
	button.attr('title', tooltip);
	button.append($('<span class="buttonLabel">' + name + '</span>'));
  this.SetIcon(button, iconName);
	
	// Click callback
	button.click(function(event) {
		if (!button.hasClass('disabled')) {
      event['inputType'] = 'toolbar';
      callback(event);
    }
	});
	
	this.elem.append(button);
	this.buttons[name] = button;
};

// Function to relabel a existing button (used for mturk tasks)
Toolbar.prototype.LabelButton = function(name, label, tooltip, iconName) {
  var button = this.buttons[name];
  if (button) {
    button.attr('title', tooltip);
    button.find(".buttonLabel").text(label);
    if (iconName) {
      this.SetIcon(button, iconName);
    }
  }
};

Toolbar.prototype.AddSpacer = function()
{
	this.elem.append($('<div class="spacer"></div>'));
};

Toolbar.prototype.EnableButton = function(name)
{
	var button = this.buttons[name];
	button && button.removeClass('disabled');
};

Toolbar.prototype.DisableButton = function(name)
{
	var button = this.buttons[name];
	button && button.addClass('disabled');
};

Toolbar.prototype.ShowButton = function(name)
{
  var button = this.buttons[name];
  button && button.show();
};

Toolbar.prototype.HideButton = function(name)
{
  var button = this.buttons[name];
  button && button.hide();
};

Toolbar.prototype.Hide = function()
{
	this.elem.hide();
};

Toolbar.prototype.Show = function()
{
	this.elem.show();
};


// Exports
return Toolbar;
	
});