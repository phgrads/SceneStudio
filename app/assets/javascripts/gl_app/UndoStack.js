'use strict';

define([
  './Constants',
	'./PubSub',
  './PackedModelsSceneLoader'
],
function(Constants, PubSub, PackedModelsSceneLoader){

/**
 * Undo stack encapsulation class
 **/
function UndoStack(app, maxSize) {
	// Extend PubSub
	PubSub.call(this);
	
  this.app = app;
  this.maxSize = maxSize;
  this.states = []; // Array of pre command states in historical order
  this.pos = -1;      // Pointer to the last state
  this.loader = new PackedModelsSceneLoader();
	
	this.clear();
}

// Extend PubSub
UndoStack.prototype = Object.create(PubSub.prototype);

UndoStack.prototype.clear = function() {
  this.states = [];
  this.pos = 0;
  this.states[0] = this.createSaveState(Constants.CMDTYPE.INIT, -1);
};

// Constructor to save scene state snapshot before a command of cmdType is applied to targetModel
function SavedState(cmdType, targetModelIndex, serializedScene, selectedIndex) {
  this.cmdType = cmdType;
  this.targetModelIndex = targetModelIndex;
	this.serializedScene = serializedScene;
	this.selectedIndex = selectedIndex;
}

UndoStack.prototype.restoreSaveState = function(saveState) {
	var app = this.app;
  var scene = app.scene;
	
	this.loader.LoadFromLocalSerialized(scene, saveState.serializedScene, app.assman);
	app.SelectInstance(scene.IndexToObject(saveState.selectedIndex));
};

UndoStack.prototype.createSaveState = function(cmdType, targetModelIndex) {
  var scene = this.app.scene;
	var selectedInst = this.app.uistate.selectedInstance;
	var selectedIndex = scene.ObjectToIndex(selectedInst);
  var serializedScene = this.loader.SerializeForLocal(scene);
  return new SavedState(cmdType, targetModelIndex, serializedScene, selectedIndex);
};

UndoStack.prototype.undo = function() {
  // Return if empty stack
  if (this.pos === 0) return;

  //console.log("UndoStack: undo " + this.states[this.pos].cmdType + ", pos=" + this.pos);
  this.pos--;
  this.restoreSaveState(this.states[this.pos]);

	this.Publish('RestoredSavedState');
	if (this.pos === 0) {
    this.Publish('ReachedBeginning');
  }
};

UndoStack.prototype.redo = function() {
  // If at the end of the stack (no next state) then return
  if (this.pos === (this.states.length - 1)) return;

  this.pos++;
  this.restoreSaveState(this.states[this.pos]);
  //console.log("UndoStack: redo " + this.states[this.pos].cmdType + ", pos=" + this.pos);

	this.Publish('RestoredSavedState');
	if (this.pos === (this.states.length - 1)) {
    this.Publish('ReachedEnd');
  }
};

// Delete all future states beyond current pos
UndoStack.prototype.forgetFuture = function() {
    this.states = this.states.slice(0, this.pos + 1);
};

UndoStack.prototype.last = function() {
    return this.states[this.pos];
};

UndoStack.prototype.pushCurrentState = function(cmdType, targetModel) {
	var targetModelIndex = this.app.scene.ObjectToIndex(targetModel);

  // Pop oldest state off if stack is maxed out
  if (this.states.length === this.maxSize) {
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

UndoStack.prototype.isEmpty = function() {
  return this.pos === 0;
};

// Exports
return UndoStack;
});