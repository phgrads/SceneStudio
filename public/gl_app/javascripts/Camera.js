'use strict';

define([
	'Constants',
	'Ray',
	'gl-matrix',
	'gl-matrix-ext',
	'jquery'
],
function(Constants, Ray){

function Camera(eye, lookAt, up)
{
	this.eyePos = vec3.create();
	this.lookAtPoint = vec3.create();
	this.upVec = vec3.create();
	this.lookVec = vec3.create();
	this.leftVec = vec3.create();
	this.Reset(eye, lookAt, up);
	
	this.savedState = null;
	this.sceneBounds = null;
}

Camera.prototype.UpdateSceneBounds = function(bbox)
{
	this.sceneBounds = bbox;
}

Camera.prototype.CalculatePitchYaw = function()
{
	var worldZ = vec3.create([0, 0, 1]);
	
	// Pitch
	var axis = vec3.create();
    vec3.cross(worldZ, this.upVec, axis);
	var pitch = vec3.signedAngleBetween(worldZ, this.upVec, axis);
	
	// Transform lookVec by the matrix that aligns up with world z.
	// Yaw is the angle between this vector and world y.
	var xform = mat4.identity(mat4.create());
	mat4.face(this.upVec, worldZ, xform);
	var rotLookVec = vec3.create();
	mat4.multiplyVec3(xform, this.lookVec, rotLookVec);
	var yaw = vec3.signedAngleBetween([0, 1, 0], rotLookVec, worldZ);
	
	return [pitch, yaw];
}

Camera.prototype.State = function()
{
	var state = {};
	state.eyePos = vec3.create(this.eyePos);
	state.lookAtPoint = vec3.create(this.lookAtPoint);
	var py = this.CalculatePitchYaw();
	state.pitch = py[0];
	state.yaw = py[1];
	return state;
}

Camera.prototype.SaveStateForReset = function()
{
	this.savedState = this.State();
}

Camera.prototype.ResetSavedState = function()
{
	if (this.savedState)
	{
		this.ResetFromPitchYaw(this.savedState.eyePos, this.savedState.lookAtPoint, this.savedState.pitch, this.savedState.yaw);
	}
}

Camera.prototype.Reset = function(eye, lookAt, up)
{
	if (eye)
		vec3.set(eye, this.eyePos);
	else
		vec3.set([0, 0, 0], this.eyePos);
	
	if (lookAt)
		vec3.set(lookAt, this.lookAtPoint);
	else
		vec3.set([0, 1, 0], this.lookAtPoint);
	
	if (up)
	{
		vec3.set(up, this.upVec);
		vec3.normalize(this.upVec);
	}
	else
		vec3.set([0, 0, 1], this.upVec);
	
	vec3.subtract(this.lookAtPoint, this.eyePos, this.lookVec);
	vec3.normalize(this.lookVec);
	
	vec3.cross(this.upVec, this.lookVec, this.leftVec);
	
	vec3.cross(this.lookVec, this.leftVec, this.upVec);
}

// In this version, the arguments are *NOT* optional
Camera.prototype.ResetFromPitchYaw = function(eye, lookAt, pitch, yaw)
{
	this.Reset();
	this.PanUp(pitch);
	this.PanLeft(yaw);
	vec3.set(eye, this.eyePos);
	vec3.set(lookAt, this.lookAtPoint);
}

Camera.prototype.LookAtMatrix = function()
{
	return mat4.lookAt(this.eyePos, this.lookAtPoint, this.upVec);
}

Camera.prototype.DollyLeft = function(dist)
{
	var offset = vec3.create();
	vec3.scale(this.leftVec, dist, offset);
	vec3.add(this.eyePos, offset);
	vec3.add(this.lookAtPoint, offset);
}

Camera.prototype.DollyUp = function(dist)
{
	var offset = vec3.create();
	vec3.scale(this.upVec, dist, offset);
	vec3.add(this.eyePos, offset);
	vec3.add(this.lookAtPoint, offset);
}

Camera.prototype.DollyForward = function(dist)
{
	var offset = vec3.create();
	vec3.scale(this.lookVec, dist, offset);
	vec3.add(this.eyePos, offset);
	vec3.add(this.lookAtPoint, offset);
}

Camera.prototype.PanLeft = function(theta)
{	
	var rotmat = mat4.create(); mat4.identity(rotmat); mat4.rotateZ(rotmat, theta);
	var lookdir = vec3.create(); vec3.subtract(this.lookAtPoint, this.eyePos, lookdir);
	mat4.multiplyVec3(rotmat, lookdir);
	vec3.add(this.eyePos, lookdir, this.lookAtPoint);
	vec3.normalize(lookdir, this.lookVec);
	mat4.multiplyVec3(rotmat, this.upVec);
	mat4.multiplyVec3(rotmat, this.leftVec);
}

Camera.prototype.PanUp = function(theta)
{	
	var rotmat = mat4.create(); mat4.identity(rotmat); mat4.rotate(rotmat, theta, this.leftVec);
	// first, we'll try to rotate the up vector.  If this causes the
    // up vector to point downwards, then we abort the pan.
    // This effectively clamps the vertical rotation and prevents
    // the user from flipping the model upside down
    var newUp = vec3.create(); vec3.set(this.upVec, newUp);
    mat4.multiplyVec3(rotmat, newUp);
    // throw in the second part of the check to prevent sticking
    if(newUp[2] < 0.0 && this.upVec[2] >= 0.0)  {
        return;
    }
	var lookdir = vec3.create(); vec3.subtract(this.lookAtPoint, this.eyePos, lookdir);
	mat4.multiplyVec3(rotmat, lookdir);
	vec3.add(this.eyePos, lookdir, this.lookAtPoint);
	vec3.normalize(lookdir, this.lookVec);
	mat4.multiplyVec3(rotmat, this.upVec);
}

Camera.prototype.OrbitLeft = function(theta)
{	
	var rotmat = mat4.create(); mat4.identity(rotmat); mat4.rotateZ(rotmat, theta);
	var invlookdir = vec3.create(); vec3.subtract(this.eyePos, this.lookAtPoint, invlookdir);
	mat4.multiplyVec3(rotmat, invlookdir);
	vec3.add(this.lookAtPoint, invlookdir, this.eyePos);
	vec3.negate(invlookdir, this.lookVec);
	vec3.normalize(this.lookVec);
	mat4.multiplyVec3(rotmat, this.upVec);
	mat4.multiplyVec3(rotmat, this.leftVec);
}

Camera.prototype.OrbitUp = function(theta)
{
	var rotmat = mat4.create(); mat4.identity(rotmat); mat4.rotate(rotmat, theta, this.leftVec);
	// first, we'll try to rotate the up vector.  If this causes the
    // up vector to point downwards, then we abort the orbit.
    // This effectively clamps the vertical rotation and prevents
    // the user from flipping the model upside down
    var newUp = vec3.create(); vec3.set(this.upVec, newUp);
    mat4.multiplyVec3(rotmat, newUp);
    // throw in the second part of the check to prevent sticking
    if(newUp[2] < 0.0 && this.upVec[2] >= 0.0)  {
        return;
    }
	var invlookdir = vec3.create(); vec3.subtract(this.eyePos, this.lookAtPoint, invlookdir);
	mat4.multiplyVec3(rotmat, invlookdir);
	vec3.add(this.lookAtPoint, invlookdir, this.eyePos);
	vec3.negate(invlookdir, this.lookVec);
	vec3.normalize(this.lookVec);
	mat4.multiplyVec3(rotmat, this.upVec);
}

Camera.prototype.Zoom = function(dist)
{
	var offset = vec3.create(); vec3.scale(this.lookVec, dist, offset);
	var oldlookdir = vec3.create(); vec3.subtract(this.lookAtPoint, this.eyePos, oldlookdir);
	vec3.add(this.eyePos, offset);
	var lookdir = vec3.create(); vec3.subtract(this.lookAtPoint, this.eyePos, lookdir);
	
	// Have to keep the look at point in front of the eye at all times.
	if (vec3.dot(lookdir, oldlookdir) < 0)
		vec3.add(this.lookAtPoint, offset);
		
	// Make sure that the camera is no farther than Constants.zFar from the farthest
	// point in the scene (to avoid showing clipping artifacts to the user)
	var c = this.sceneBounds.Centroid();
	var r = this.sceneBounds.Radius();
	var farpoint = vec3.create(); vec3.scale(this.lookVec, r, farpoint); vec3.add(farpoint, c);
	var farDist = vec3.dist(farpoint, this.eyePos);
	var look2eye = vec3.create(); vec3.subtract(this.eyePos, this.lookAtPoint, look2eye);
	var lookDist = vec3.length(look2eye);
	var fixedDist = farDist - lookDist;
	if (farDist > Constants.zFar)
	{
		var newLookDist = Constants.zFar - fixedDist;
		vec3.scale(look2eye, newLookDist/lookDist);
		vec3.add(this.lookAtPoint, look2eye, this.eyePos);
	}
}

Camera.prototype.TrackTo = function(newPos)
{
	this.Reset(newPos, this.lookAtPoint, this.upVec);
}

Camera.prototype.MakePickRay = function(x, y, renderer)
{
	var screenV = vec3.create([x, y, 0.5]);
	var unprojV = renderer.UnprojectVector(screenV);
	
	var o = this.eyePos;
	var d = vec3.create();
	vec3.subtract(unprojV, o, d);
	vec3.normalize(d);
	var ray = new Ray(o, d);
	
	return ray;
}

// Exports
return Camera;

});