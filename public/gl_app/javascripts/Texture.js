'use strict';

define(function(){

function Texture(gl, url, glTexObj)
{
	this.gl = gl;
	this.url = url;
	this.glTexObj = glTexObj;
}

Texture.prototype.Bind = function(program)
{
	var gl = this.gl;
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.glTexObj);
	if (program)
	{
		var texUnitLoc = program.uniformLocs.u_diffuse_sampler;
		if (texUnitLoc)
			gl.uniform1i(texUnitLoc, 0);
	}
}


// Exports
return Texture;

});