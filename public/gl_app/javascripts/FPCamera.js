'use strict';

define([
	'Constants',
	'Ray',
	'Camera',
	'gl-matrix',
	'gl-matrix-ext',
	'jquery'
],
function(Constants, Ray, Camera){

function FPCamera(scene){
	Camera.call(this);
	this.scene = scene;
	//this.eyePos = vec3.create([0,0,50]);//scene.Bounds().Centroid();
	//this.lookAtPoint = vec3.create([10,0,50]);
	//this.upVec = vec3.create([0,0,1]);
	
}
FPCamera.prototype = new Camera;


FPCamera.prototype.Serialize = function(){
	return {eye:this.eyePos, lookAt:this.lookAtPoint};
}

FPCamera.prototype.Load = function(state){
	this.Reset(state.eye, state.lookAt); 
}

//make sure the new eye position is inside of the room's bounding box
FPCamera.prototype.checkRoomBounds = function(newEye){
	var room = this.scene.modelList[0];
	if(room.Bounds().ContainsPoint(newEye)){
		return true; 
	}
	return false;
}
//check to see whether the new eyeposition is inside of any model's bounding box
FPCamera.prototype.checkObjectCollision = function(newEye){
	for( var i = 1; i < this.scene.modelList.length; i++){
		if (this.scene.modelList[i].Bounds().ContainsPoint(newEye)){
			return false;
		}
	}
	return true;
}
	


//Adds room bounds and object collision checks to Camera implementation
FPCamera.prototype.DollyLeft = function(dist)
{
	//console.log(this.eyePos, this.upVec);
	var offset = vec3.create();
	offset[2] = 0;
	vec3.scale(this.leftVec, dist, offset);
	var newEye = vec3.create();
	vec3.add(this.eyePos, offset, newEye);
	var newLookAt = vec3.create();
	vec3.add(this.lookAtPoint, offset, newLookAt);
	if(this.checkRoomBounds(newEye) && this.checkObjectCollision(newEye)){ 
		this.eyePos = newEye;
		this.lookAtPoint = newLookAt;
	}
}

FPCamera.prototype.DollyForward = function(dist)
{
	var offset = vec3.create();
	vec3.scale(this.lookVec, dist, offset);
	offset[2] = 0;
	var newEye = vec3.create();
	vec3.add(this.eyePos, offset, newEye);
	var newLookAt = vec3.create();
	vec3.add(this.lookAtPoint, offset, newLookAt);
	if(this.checkRoomBounds(newEye) && this.checkObjectCollision(newEye)){ 
		this.eyePos = newEye;
		this.lookAtPoint = newLookAt;
	}
}

//Removed view flipping check from Camera implementation
FPCamera.prototype.PanUp = function(theta)
{	
	var rotmat = mat4.create(); mat4.identity(rotmat); mat4.rotate(rotmat, theta, this.leftVec);
    	var newUp = vec3.create(); vec3.set(this.upVec, newUp);
    	mat4.multiplyVec3(rotmat, newUp);
	var lookdir = vec3.create(); vec3.subtract(this.lookAtPoint, this.eyePos, lookdir);
	mat4.multiplyVec3(rotmat, lookdir);
	vec3.add(this.eyePos, lookdir, this.lookAtPoint);
	vec3.normalize(lookdir, this.lookVec);
	mat4.multiplyVec3(rotmat, this.upVec);
}


return FPCamera;
})

