'use strict';

define([
	'./ModelInstance',
	'./BBox',
	'jquery',
	'async'
],
function(ModelInstance, BBox){

function Scene()
{
    this.root = null;
	this.modelList = [];
	this.manipulators = [];
}

Scene.prototype.Reset = function (root)
{
    this.modelList.forEach( function(model) { model.Remove(); } );
    this.modelList = [];
    this.root = null;

    if (root)
    {
        this.root = root;
        this.modelList[0] = root;
        this.root.renderState.isSelectable = false;
    }
};

Scene.prototype.Bounds = function()
{
	var bbox = new BBox();
	bbox.FromBBox(this.modelList[0].Bounds());
	for (var i = 1; i < this.modelList.length; i++)
		bbox.ExpandBBox(this.modelList[i].Bounds());
	return bbox;
};

Scene.prototype.AddManipulator = function (manip)
{
    this.manipulators.push(manip);
};

Scene.prototype.UpdateModelList = function ()
{
	if (!this.root)
	{
		this.modelList = [];
	}
	else
	{
		var insts = [this.root];
		for (var iM = 0; iM < insts.length; iM++) { insts = insts.concat(insts[iM].children); }
		for (var i = 0; i < insts.length; i++) { insts[i].index = i; }
		this.modelList = insts;
	}
};

Scene.prototype.ObjectToIndex = function(obj)
{
	if (!obj) return -1;
	
	var modelIndex = $.inArray(obj, this.modelList);
	if (modelIndex !== -1)
		return modelIndex;
	var manipIndex = $.inArray(obj, this.manipulators);
	if (manipIndex !== -1)
		return this.modelList.length + manipIndex;
	return -1;
};

Scene.prototype.IndexToObject = function(index)
{
	if (index < 0 || index > this.modelList.length + this.manipulators.length)
		return null;
	if (index < this.modelList.length)
		return this.modelList[index];
	return this.manipulators[index - this.modelList.length];
};

Scene.prototype.AttachManipulators = function(mInst)
{
	this.manipulators.forEach(function(m) {
		m.Attach(mInst);
	});
};

Scene.prototype.DetachManipulators = function()
{
	this.manipulators.forEach(function(m) {
		m.Detach();
	});
};

Scene.prototype.DrawPass = function(renderer, renderTransparent)
{
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

Scene.prototype.Draw = function (renderer)
{
	if (!this.root) return;
	
    // PASS 1: Draw all fully opaque objects
    this.DrawPass(renderer, false);

    // PASS 2: Draw all transparent objects
    this.DrawPass(renderer, true);
};

Scene.prototype.Pick = function(renderer)
{
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

Scene.prototype.SerializeBare = function()
{
	// Just serializes model ids and transforms; enough to render
	// the scene correctly in a different application
	var mlist = [];
	this.modelList.forEach(function(model) {
		model.UpdateTransform();
		mlist.push({ modelID: model.modelID, transform: model.transform});
	});
	return JSON.stringify(mlist);
};

Scene.prototype.SerializeForLocal = function()
{
	var packedModels = [];
  var modelMap = [];
	this.modelList.forEach(function(model){
		packedModels.push(model.toJSONString());
        modelMap[model.model.id] = model.model;
	});
	return { packedModels: packedModels, modelMap: modelMap };
};

Scene.prototype.LoadFromLocalSerialized =
    function(serializedScene, assman, top_level_callback)
{
    top_level_callback = top_level_callback || function(){};
    this.Reset();

    var getModelFromJSON = function(packedModel, callback) {
        ModelInstance.fromJSONString(
            packedModel,
            assman,
            serializedScene.modelMap,
            function(model) {
                if (model.index === -1) // Root model
                {
                    this.modelList[0] = model;
                }
                else
                {
                    this.modelList[model.index] = model;
                }
                callback(); // can report errors via this ...
            }.bind(this)
        );
    }.bind(this);
    
    async.forEach(serializedScene.packedModels, getModelFromJSON,
    function(err){
        this.modelList.forEach(function(model){
            if (model.parentIndex >= 0)
                model.SetParent(this.modelList[model.parentIndex]);

            // If transform is pre-loaded and baked in, compute here
            if (!model.bakedTransform) {
                model.UpdateTransform();
            }
            
            delete model.parentIndex;
        }.bind(this));
        
        this.root = this.modelList[0];
        this.root.renderState.isSelectable = false;

        top_level_callback(err); // pass the error along I guess?
    }.bind(this));
};

Scene.prototype.SerializeForNetwork = function()
{
    var pair = this.SerializeForLocal();
    return pair.packedModels;
};

Scene.prototype.LoadFromNetworkSerialized =
    function(serialized, assman, callback)
{
    var pair = { packedModels: serialized };
    this.LoadFromLocalSerialized(pair, assman, callback);
};


// Exports
return Scene;

});