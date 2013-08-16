'use strict';

define([
    './Constants',
    './Camera',
    './uibehaviors',
    'gl-matrix',
    'gl-matrix-ext'
], function(Constants, Camera, Behaviors) {

    function FPCamera(scene) {
        Camera.call(this);
        this.scene = scene;
        this.defaultRoomHeight = 100;
        this.defaultEyeHeight = 72; 
        
        this.minRealHeight = 60; 
        this.maxRealHeight = 90;
    }

    FPCamera.prototype = Object.create(Camera.prototype);

    // Check to see whether the new eyeposition is inside of any model's bounding box
    FPCamera.prototype.noCollisions = function(newEye) {
        for( var i = 1; i < this.scene.modelList.length; i++) {
            // Hack: use bounding sphere since transformed axis aligned bbox (AABB) can be grossly wrong
            // TODO: Recompute AABB from transformed model
            var bbox = this.scene.modelList[i].Bounds();
            var r = bbox.Radius();
            var c = bbox.Centroid();
            var d = vec3.dist(newEye, c);
            if (d < 0.7 * r) return false;
        }
        return true;
    };

    // Returns whether newEye is inside scene AND not inside any model's bounding box
    FPCamera.prototype.isValidPosition = function(newEye) {
        this.virtualRoomHeight = this.scene.modelList[0].Bounds().maxs[2];
        var inScene = this.sceneBounds.ContainsPoint(newEye);
        var virtualHeight = newEye[2];
        var realHeight = virtualHeight/this.virtualRoomHeight * this.defaultRoomHeight;
        var inBuffer = realHeight > this.minRealHeight && realHeight < this.maxRealHeight; 
        return (inScene && this.noCollisions(newEye) && inBuffer);
    };

    // Changes camera only if new position is valid and returns whether we set or not
    FPCamera.prototype.SetIfValidPosition = function(newEye, newLookAtPoint) {
        var valid = this.isValidPosition(newEye);
        if (valid) {
            this.eyePos = newEye;
            this.lookAtPoint = newLookAtPoint;
        }
        return valid;
    };

    // Adds room bounds and object collision checks to Camera implementation
    FPCamera.prototype.DollyLeft = function(dist) {
        var offset = vec3.create();
        offset[2] = 0;
        vec3.scale(this.leftVec, dist, offset);
        var newEye = vec3.create();
        vec3.add(this.eyePos, offset, newEye);
        var newLookAtPoint = vec3.create();
        vec3.add(this.lookAtPoint, offset, newLookAtPoint);
        this.SetIfValidPosition(newEye, newLookAtPoint);
    };

    FPCamera.prototype.DollyForward = function(dist) {
        var offset = vec3.create();
        vec3.scale(this.lookVec, dist, offset);
        offset[2] = 0;
        var newEye = vec3.create();
        vec3.add(this.eyePos, offset, newEye);
        var newLookAtPoint = vec3.create();
        vec3.add(this.lookAtPoint, offset, newLookAtPoint);
        this.SetIfValidPosition(newEye, newLookAtPoint);
    };

    FPCamera.prototype.DollyUp = function(dist) {
        var offset = vec3.create();
        offset[2] = dist;
        var newEye = vec3.create();
        vec3.add(this.eyePos, offset, newEye);
        var newLookAtPoint = vec3.create();
        vec3.add(this.lookAtPoint, offset, newLookAtPoint);
        this.SetIfValidPosition(newEye, newLookAtPoint);
    };

    FPCamera.prototype.SetRandomPositionAndLookAtPointInSceneBounds = function() {
        this.UpdateSceneBounds(this.scene.Bounds());
        var h = this.defaultEyeHeight/this.defaultRoomHeight * this.scene.modelList[0].Bounds().maxs[2];
        var N = 100;
        var i = 0;
        do {
            i += 1;
            var pos = this.sceneBounds.RandomPointInside();
            var eyePos = vec3.create([pos[0], pos[1] , h]);
            var pos2 = this.sceneBounds.RandomPointInside();
            var lookAtPos = vec3.create([pos2[0], pos2[1], h]);
        } while (!this.isValidPosition(eyePos) && i < N);
        this.Reset(eyePos, lookAtPos);
    };

    FPCamera.prototype.AttachControls = function(app) {
        // WASD style movement controls
        var movespeed = 5;
        var up = function() { app.renderer.UpdateView(); };
        var cam = this;
        Behaviors.keyhold(app.uimap, 'W').onhold( function() { cam.DollyForward(movespeed);  up(); } );
        Behaviors.keyhold(app.uimap, 'A').onhold( function() { cam.DollyLeft(movespeed);     up(); } );
        Behaviors.keyhold(app.uimap, 'S').onhold( function() { cam.DollyForward(-movespeed); up(); } );
        Behaviors.keyhold(app.uimap, 'D').onhold( function() { cam.DollyLeft(-movespeed);    up(); } );
        Behaviors.keyhold(app.uimap, 'R').onhold( function() { cam.DollyUp(movespeed);       up(); } );
        Behaviors.keyhold(app.uimap, 'F').onhold( function() { cam.DollyUp(-movespeed);      up(); } );

        // FPCamera looking
        var rotspeed = 1 / (Math.PI * 100);
        app.canvas.addEventListener('mousemove', function(e) {
            cam.PanLeft(-rotspeed * e.movementX);
            cam.PanUp(rotspeed * e.movementY);
            up();
        });
    };

    // Exports
    return FPCamera;
});

