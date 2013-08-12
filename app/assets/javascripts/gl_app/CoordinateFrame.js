'use strict';

define([
	'gl-matrix',
	'gl-matrix-ext'
],
function(){
	
/**
 * The arguments are all vec3 and are assumed to be orthonormal
 **/
function CoordinateFrame(opt_u, opt_v, opt_w)
{
	this.u = (opt_u && vec3.create(opt_u)) || vec3.createFrom(1,0,0);
	this.v = (opt_v && vec3.create(opt_v)) || vec3.createFrom(0,1,0);
	this.w = (opt_w && vec3.create(opt_w)) || vec3.createFrom(0,0,1);
}

CoordinateFrame.prototype.FromCoordinateFrame = function(frame)
{
	vec3.set(frame.u, this.u);
	vec3.set(frame.v, this.v);
	vec3.set(frame.w, this.w);
};

CoordinateFrame.prototype.Transform = function(xform)
{
	var m = mat4.toMat3(xform);
	mat3.multiplyVec3(m, this.u);
	mat3.multiplyVec3(m, this.v);
	mat3.multiplyVec3(m, this.w);
	vec3.normalize(this.u);
	vec3.normalize(this.v);
	vec3.normalize(this.w);
};

CoordinateFrame.prototype.Face = function(vec)
{
	var facemat = mat4.identity(mat4.create());
	mat4.face(this.w, vec, facemat);
	this.Transform(facemat);
};

CoordinateFrame.prototype.ToBasisMatrix = function()
{
	var m = mat4.createFrom(this.u[0], this.v[0], this.w[0], 0.0,
						    this.u[1], this.v[1], this.w[1], 0.0,
						    this.u[2], this.v[2], this.w[2], 0.0,
						    0.0,       0.0,       0.0,       1.0);
	mat4.transpose(m);
	return m;
};

CoordinateFrame.prototype.toJSON = function()
{
    return {u: vec3.toJSON(this.u), v: vec3.toJSON(this.v), w: vec3.toJSON(this.w)};
};

CoordinateFrame.prototype.fromJSON = function(json)
{
    this.u = vec3.create(json.u);
    this.v = vec3.create(json.v);
    this.w = vec3.create(json.w);
};

CoordinateFrame.ChangeOfBasis = function(cfsrc, cfdst)
{
	var msrc = cfsrc.ToBasisMatrix();
	mat4.inverse(msrc);
	var mdst = cfdst.ToBasisMatrix();
	mat4.multiply(mdst, msrc);
	return mdst;
};


// Exports
return CoordinateFrame;
	
});