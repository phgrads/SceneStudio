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

function FPCamera(eye, lookAt, up){
	Camera.call(this);
	
}
FPCamera.prototype = new Camera;

return FPCamera;
})

