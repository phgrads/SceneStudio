'use strict';

define([
    'Constants',
    'Camera',
    'gl-matrix',
    'gl-matrix-ext'
], function(Constants, Camera) {

    function FPCamera(scene) {
        Camera.call(this);
        this.scene = scene;
    }

    FPCamera.prototype = Object.create(Camera.prototype);

    // Make sure the new eye position is inside of the room's bounding box
    FPCamera.prototype.checkRoomBounds = function(newEye) {
        return this.sceneBounds.ContainsPoint(newEye);
    };

    // Check to see whether the new eyeposition is inside of any model's bounding box
    FPCamera.prototype.checkObjectCollision = function(newEye) {
        for( var i = 1; i < this.scene.modelList.length; i++) {
            if (this.scene.modelList[i].Bounds().ContainsPoint(newEye)) {
                return false;
            }
        }
        return true;
    };

    // Adds room bounds and object collision checks to Camera implementation
    FPCamera.prototype.DollyLeft = function(dist) {
        //console.log(this.eyePos, this.upVec);
        var offset = vec3.create();
        offset[2] = 0;
        vec3.scale(this.leftVec, dist, offset);
        var newEye = vec3.create();
        vec3.add(this.eyePos, offset, newEye);
        var newLookAt = vec3.create();
        vec3.add(this.lookAtPoint, offset, newLookAt);
        if(this.checkRoomBounds(newEye) && this.checkObjectCollision(newEye)) {
            this.eyePos = newEye;
            this.lookAtPoint = newLookAt;
        }
    };

    FPCamera.prototype.DollyForward = function(dist) {
        var offset = vec3.create();
        vec3.scale(this.lookVec, dist, offset);
        offset[2] = 0;
        var newEye = vec3.create();
        vec3.add(this.eyePos, offset, newEye);
        var newLookAt = vec3.create();
        vec3.add(this.lookAtPoint, offset, newLookAt);
        if(this.checkRoomBounds(newEye) && this.checkObjectCollision(newEye)) {
            this.eyePos = newEye;
            this.lookAtPoint = newLookAt;
        }
    };

    // Exports
    return FPCamera;
});

