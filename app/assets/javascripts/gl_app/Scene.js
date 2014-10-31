'use strict';

define([
	'./ModelInstance',
	'./BBox',
	'jquery',
	'async'
],
function(ModelInstance, BBox){

function Scene() {
  this.root = null;
	this.modelList = [];
	this.manipulators = [];
}

Scene.prototype.Reset = function (root) {
    this.modelList.forEach( function(model) { model.Remove(); } );
    this.modelList = [];
    this.root = null;

    if (root) {
        this.root = root;
        this.modelList[0] = root;
        this.root.renderState.isSelectable = false;
    }
};

Scene.prototype.Bounds = function() {
	var bbox = new BBox();
	bbox.FromBBox(this.modelList[0].Bounds());
	for (var i = 1; i < this.modelList.length; i++)
		bbox.ExpandBBox(this.modelList[i].Bounds());
	return bbox;
};

Scene.prototype.AddManipulator = function (manip) {
    this.manipulators.push(manip);
};

Scene.prototype.UpdateModelList = function () {
	if (!this.root) {
		this.modelList = [];
	} else {
		var insts = [this.root];
		for (var iM = 0; iM < insts.length; iM++) { insts = insts.concat(insts[iM].children); }
		for (var i = 0; i < insts.length; i++) { insts[i].index = i; }
		this.modelList = insts;
	}
};

Scene.prototype.ObjectToIndex = function(obj) {
	if (!obj) return -1;
	
	var modelIndex = $.inArray(obj, this.modelList);
	if (modelIndex !== -1)
		return modelIndex;
	var manipIndex = $.inArray(obj, this.manipulators);
	if (manipIndex !== -1)
		return this.modelList.length + manipIndex;
	return -1;
};

Scene.prototype.IndexToObject = function(index) {
	if (index < 0 || index > this.modelList.length + this.manipulators.length)
		return null;
	if (index < this.modelList.length)
		return this.modelList[index];
	return this.manipulators[index - this.modelList.length];
};

Scene.prototype.AttachManipulators = function(mInst) {
	this.manipulators.forEach(function(m) {
		m.Attach(mInst);
	});
};

Scene.prototype.DetachManipulators = function() {
	this.manipulators.forEach(function(m) {
		m.Detach();
	});
};

Scene.prototype.DrawPass = function(renderer, renderTransparent) {
	var gl = renderer.gl_;
	
	var opts = renderer.Options();
	if (renderTransparent)
	{
		gl.enable(gl.BLEND);
		opts.renderTransparent = true;
	}
	else
	{
		gl.disable(gl.BLEND);
		opts.renderTransparent = false;
	}
	
	// Draw the hierarchy
	renderer.bindModelProgram();
	this.root.Draw(renderer);
	
	// Draw manipulators
	renderer.bindConstantProgram();
	var nummanips = this.manipulators.length;
	for (var i = 0; i < nummanips; i++)
		this.manipulators[i].Draw(renderer);
};

Scene.prototype.Draw = function (renderer) {
	if (!this.root) return;
	
    // PASS 1: Draw all fully opaque objects
    this.DrawPass(renderer, false);

    // PASS 2: Draw all transparent objects
    this.DrawPass(renderer, true);
};

Scene.prototype.Pick = function(renderer) {
	if (!this.root) return;
	
	renderer.bindPickingProgram();
	var gl = renderer.gl_;
	gl.disable(gl.BLEND);
	
	// Pick against the hierarchy
	this.root.Pick(renderer);
	
	// Pick against the manipulators
	// picking ids start where the model instance ids end
	var nummanips = this.manipulators.length;
	var nummodels = this.modelList.length;
	for (var i = 0; i < nummanips; i++)
		this.manipulators[i].Pick(renderer, nummodels+i);
};

// Exports
return Scene;

});