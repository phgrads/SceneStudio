'use strict';

define([
	'Framebuffer'
],
function(Framebuffer){

function Picker(gl)
{
    this.gl_ = gl;
};

/**
 * Pack two uint16s from array values into a 4 element Float32Array containing normalized byte values.
 * Returns: 4 element float array.
 **/
Picker.PackIDs = function(values)
{
	var bytes = new ArrayBuffer(4);
	var uint16View = new Uint16Array(bytes);
	uint16View[0] = values[0];
	uint16View[1] = values[1];
        var uint8View = new Uint8Array(bytes);
        var floats = new Float32Array(4);
        for (var i=0; i<4; i++) floats[i] = uint8View[i] / 255.0;
	return floats;
};

/**
 * Unpack two uint16s from 4 bytes in rgba.
 * Returns: 2 element array with the integers.
 **/
Picker.UnpackIDs = function(rgba)
{
	var uint16view = new Uint16Array(rgba.buffer);
	var v1 = uint16view[0];
	var v2 = uint16view[1];
	return [v1, v2];
};

Picker.generalUnpackIDs = function(array)
{
    var ids = []; 
    var uint16view = new Uint16Array(array.buffer);
    for( var i = 0; i < uint16view.length; i+=2){
        var v1 = uint16view[i];
        var v2 = uint16view[i+1];
        ids.push([v1,v2]);
    }
    return ids; 
}
/**
 * Read pick buffer at pixel coordinates (x,y).
 * Returns: 2 element array with integers [modelID, subgeometryID].
 **/
Picker.prototype.PickModelGeoIDs = function(x,y)
{
    var gl = this.gl_;

    var pixel = new Uint8Array(4);
    this.pickAfbo.bind(gl);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
   
    this.pickAfbo.unbind(gl);

    // NOTE: subtract 1 to handle background pixels
    var ids = Picker.UnpackIDs(pixel);
    ids[0] -= 1;
    ids[1] -= 1;
    
    return ids;
};

Picker.prototype.BrowserYToGLY = function(y)
{
	var canvas = this.gl_.canvas;
	var rect = canvas.getBoundingClientRect();
    return canvas.height - y + rect.top;
}

/**
 * Pick render.scene at canvas coordinates (x,y) from camera's viewpoint.
 * Returns: a scene object id.
 **/
Picker.prototype.PickObject = function(x, y, renderer)
{
	var gl = this.gl_;
    
    // Flip and adjust Y coord
    y = this.BrowserYToGLY(y);
	
	var ids = this.PickModelGeoIDs(x, y);
	return renderer.scene.IndexToObject(ids[0]);
}

/**
 * Pick render.scene at canvas coordinates (x,y) from camera's viewpoint.
 * Returns: IntersectionRecord with modelID, geoID, triI, uv, position, normal, distance fields
 **/
Picker.prototype.PickTriangle = function(x, y, camera, renderer)
{
    var gl = this.gl_;
    
    // Flip and adjust Y coord
    y = this.BrowserYToGLY(y);
    
    // Get model and geo IDs from pick buffer
    var modelGeoIDs = this.PickModelGeoIDs(x,y);
    var obj = renderer.scene.IndexToObject(modelGeoIDs[0]);
    
    // Bail if nothing clicked
    if (!obj) return undefined;
    
    // Make pick ray
    var ray = camera.MakePickRay(x, y, renderer);
    
    // Intersect with subgeometry
    var intersects = ray.intersectObject(obj, modelGeoIDs[1]);
	
	// It should be impossible for there to be no intersection; the pick buffer
	// had something at this location, so there should be something to intersect.
    // TODO: This is most likely due to asynchronous postRedisplay calls resulting in out-of-sync pick buffers
    // However, it should be safe to ignore such out-of-sync intersections
	if (intersects.length == 0) {
        return undefined;
        //console.log(obj);
        //console.log(modelGeoIDs);
        //throw new Error('IMPOSSIBRU! 0 ray intersections found for a non-background pickbuffer pixel belonging to above obj and IDs!');
    }
    
    // Pull out closest intersection and augment with model,geo ids
    var intersect = intersects[0];
    intersect.modelID = modelGeoIDs[0];
    intersect.geoID = modelGeoIDs[1];
    
    return intersect;
}

/**
 * Pick at canvas coordinates (x,y) from camera's viewpoint.
 * Returns: the intersection point witht the plane defined by point 'pp' and normal 'pn'
 **/
Picker.prototype.PickPlane = function(x, y, pp, pn, camera, renderer)
{
	// Flip and adjust Y coord
    y = this.BrowserYToGLY(y);
	
	// Make pick ray
    var ray = camera.MakePickRay(x, y, renderer);
	
	// Intersect ray with plane
	return ray.intersectPlane(pp, pn);
}

Picker.prototype.HandleResize = function(newWidth, newHeight)
{
	this.pickAfbo = new Framebuffer(this.gl_, {width: newWidth, height: newHeight});
}

Picker.prototype.PrepareForPicking = function()
{
	this.pickAfbo.bind(this.gl_);
}

Picker.prototype.CleanupAfterPicking = function()
{
	this.pickAfbo.unbind(this.gl_);
}


// Exports
return Picker;

});