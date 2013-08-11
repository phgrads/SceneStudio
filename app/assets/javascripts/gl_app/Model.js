'use strict';

define([
	'./BBox',
	'./Picker'
],
function(BBox, Picker){

// 'components' is an array of { mesh, material, optional_attribs } tuples
function Model(id, components)
{
    var self = this;

	this.id = id;
	this.components = components;

	this.bbox = new BBox();
    this.bbox.FromBBox(components[0].mesh.bbox);

    this.components.forEach(
		function (component)
		{
		    self.bbox.ExpandBBox(component.mesh.bbox);
		}
	);
}

Model.prototype.ListTexturesUsed = function()
{
	var texlist = [];
	var numcomps = this.components.length;
	for (var i = 0; i < numcomps; i++)
	{
		var tex = this.components[i].material.texture.url;
		texlist.push(tex);
	}
	return texlist;
}

Model.ComponentShouldBeDrawn = function(comp, options)
{
	var should = false;
	
	// Transparency of the material matches the current render pass
	// (inserting status overrides this)
	should |= (comp.material.isTransparent == options.renderTransparent &&
			   !options.isInserting);
	
	// This is the transparent pass and the model is inserting
	should |= (options.isInserting && options.renderTransparent); 
	
	return should;
}

Model.prototype.Draw = function(renderer)
{
	var options = renderer.Options();
	var program = renderer.activeProgram_;
	var gl = program.gl_;
	var numComps = this.components.length;
	for (var i = 0; i < numComps; i++)
	{
		var comp = this.components[i];
		if (Model.ComponentShouldBeDrawn(comp, options))
		{
			comp.material.Bind(program, options);
			Model.ProcessAttribs(comp.attribs, renderer);
			comp.mesh.bindAndDraw(program);
		}
	}
}

Model.prototype.Pick = function(renderer, instanceID)
{
	var program = renderer.activeProgram_;
	var gl = program.gl_;
	var numComps = this.components.length;
	for (var i = 0; i < numComps; i++)
	{
		var comp = this.components[i];
		
		// Pass packed model+geo IDs to shader
		var ids = [instanceID + 1 , i + 1];
		var floats = Picker.PackIDs(ids);
		gl.uniform4fv(program.uniformLocs.u_idBytes, floats);
		
		Model.ProcessAttribs(comp.attribs, renderer);
		comp.mesh.bindAndDraw(program);
	}
}

Model.ProcessAttribs = function(attribs, renderer)
{
	var gl = renderer.gl_;
	
	if (attribs && attribs.bothFaces)
		gl.disable(gl.CULL_FACE);
	else
		gl.enable(gl.CULL_FACE);
}

Model.prototype.EvaluateSurface = function(meshI, triI, uv)
{
	return this.components[meshI].mesh.EvaluateSurface(triI, uv);
}



// Exports
return Model;

});