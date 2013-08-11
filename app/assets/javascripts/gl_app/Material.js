'use strict';

define([
	'./Constants'
],
function(Constants){

//// ModelMaterial ////

function ModelMaterial(gl, options)
{
	this.gl = gl;
	this.color = options.color;
	this.alpha = 1 - options.transparency;
	this.isTransparent = options.transparency > 0;
	this.texture = options.texture;
}

ModelMaterial.prototype.Bind = function(program, options)
{
	var gl = this.gl;
	
	// Inserting objects should be semi-transparent
	var alpha = (options.isInserting ? Constants.insertingObjectAlpha : this.alpha);
	
	var colLoc = program.uniformLocs.u_color;
	if (colLoc)
		gl.uniform4f(colLoc, this.color[0], this.color[1], this.color[2], alpha);
	
	this.texture.Bind(program);
}


//// ManipulatorMaterial ////

function ManipulatorMaterial(gl, options)
{
	this.gl = gl;
	this.UpdateColor(options.color);
}

ManipulatorMaterial.prototype.UpdateColor = function(color)
{
	this.color = color;
	this.isTransparent = this.color[3] < 1;
}

ManipulatorMaterial.prototype.Bind = function(program, options)
{
	var gl = this.gl;
	var colLoc = program.uniformLocs.u_color;
	if (colLoc)
		gl.uniform4fv(colLoc, this.color);
}


// Exports
return {
	ModelMaterial: ModelMaterial,
	ManipulatorMaterial: ManipulatorMaterial
};

});