'use strict';

define([
	'PubSub',
],
function(PubSub){

/**
 * Undo stack encapsulation class
 **/
function UndoStack(app, maxSize)
{
	// Extend PubSub
	PubSub.call(this);
	
    this.app = app;
    this.maxSize = maxSize;
    this.states = []; // Array of pre command states in historical order
    this.pos = -1;      // Pointer to the last state
	
	this.clear();
}

// Extend PubSub
UndoStack.prototype = Object.create(PubSub.prototype);

UndoStack.prototype.clear = function()
{
    this.states = [];
    this.pos = 0;
    this.states[0] = this.createSaveState(CMDTYPE.INIT, -1);
};

// Command type enum
var CMDTYPE = Object.freeze({
    INSERT      : "INSERT",
    DELETE      : "DELETE",
    MOVE        : "MOVE",
    ROTATE      : "ROTATE",
    SCALE       : "SCALE",
    SWITCHFACE  : "SWITCHFACE",
    INIT        : "INIT",
    NULL        : "NULL"
});

// Constructor to save scene state snapshot before a command of cmdType is applied to targetModel
function SavedState(cmdType, targetModelIndex, app, serializedScene, selectedIndex)
{
    this.cmdType = cmdType;
    this.targetModelIndex = targetModelIndex;
    this.app = app;
	this.serializedScene = serializedScene;
	this.selectedIndex = selectedIndex;
}

SavedState.prototype.restore = function()
{
	var app = this.app;
	var scene = app.scene;
	
	scene.LoadFromLocalSerialized(this.serializedScene, app.assman);
	app.SelectInstance(scene.IndexToObject(this.selectedIndex));
};

UndoStack.prototype.createSaveState = function(cmdType, targetModelIndex)
{
    var scene = this.app.scene;
	var selectedInst = this.app.uistate.selectedInstance;
	var selectedIndex = scene.ObjectToIndex(selectedInst);
    return new SavedState(cmdType, targetModelIndex, this.app, scene.SerializeForLocal(), selectedIndex);
};

UndoStack.prototype.undo = function()
{
    // Return if empty stack
    if (this.pos === 0) return;

    //console.log("UndoStack: undo " + this.states[this.pos].cmdType + ", pos=" + this.pos);
    this.pos--;
    this.states[this.pos].restore();
	
	this.Publish('RestoredSavedState');
	if (this.pos === 0)
		this.Publish('ReachedBeginning');
};

UndoStack.prototype.redo = function()
{
    // If at the end of the stack (no next state) then return
    if (this.pos === (this.states.length - 1)) return;

    this.pos++;
    this.states[this.pos].restore();
    //console.log("UndoStack: redo " + this.states[this.pos].cmdType + ", pos=" + this.pos);
	
	this.Publish('RestoredSavedState');
	if (this.pos === (this.states.length - 1))
		this.Publish('ReachedEnd');
};

// Delete all future states beyond current pos
UndoStack.prototype.forgetFuture = function()
{
    this.states = this.states.slice(0, this.pos + 1);
};

UndoStack.prototype.last = function()
{
    return this.states[this.pos];
};

UndoStack.prototype.pushCurrentState = function(cmdType, targetModel)
{
	var targetModelIndex = this.app.scene.ObjectToIndex(targetModel);

    // Pop oldest state off if stack is maxed out
    if (this.states.length === this.maxSize)
    {
        this.states.shift();
        this.pos--;
    }

    this.forgetFuture();

    // Push current state onto stack and move pos forward
    this.states.push(this.createSaveState(cmdType, targetModelIndex));
    this.pos++;
	
	this.Publish('RecordedNewState');

    //console.log("UndoStack: add " + cmdType + ", pos=" + this.pos);

};

// Exports
return {
    UndoStack: UndoStack,
    CMDTYPE: CMDTYPE
};

});