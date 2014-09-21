'use strict';

define([
	'gl-matrix'
],
function(){

/**
 * Adapted from THREE.js Ray class
 */

function IntersectionRecord()
{
    this.modelID = -1;
    this.geoID = -1;
    this.triI = -1;
    this.uv = [-1,-1];
    this.position = [-1,-1,-1];
    this.normal = [-1,-1,-1];
    this.distance =-1;
}

IntersectionRecord.prototype.toString = function()
{
    var s = "[ mID=" + this.modelID +
            " , gID=" + this.geoID +
            " , triI=" + this.triI +
            " , uv=(" + this.uv[0] + "," + this.uv[1] + ")" +
            " , pos=(" + this.position[0] + "," + this.position[1] + "," + this.position[2] + ")" +
            " , normal=(" + this.normal[0] + "," + this.normal[1] + "," + this.normal[2] + ")" +
            " , dist=" + this.distance + " ]";
    return s;
}

// Workspace object for Ray intersection computations to avoid ton 'o new vars at every intersection
function RayWorkspace()
{
    var ws = {
        precision: 1e-12,

        rayO: vec3.create(),
        rayD: vec3.create(),
        invTransform: mat4.create(),

        v0: vec3.create(),
        v1: vec3.create(),
        v2: vec3.create(),
        v1_v0: vec3.create(),
        v2_v0: vec3.create(),
        pvec: vec3.create(),
        tvec: vec3.create(),
        qvec: vec3.create(),
        dvec: vec3.create(),
        
        det: -1,
        inv_det: -1,
        u: -1,
        v: -1,
        t: -1,
    };
    return ws;
}

/**
 * Ray starting at origin and pointing in direction.
 **/
function Ray( origin, direction )
{
    this.ws = RayWorkspace();
    this.o = origin || vec3.create();
    this.d = direction || vec3.create();

    this.setPrecision = function ( value ) {
        this.ws.precision = value;
    };
}

/**
 * pp is the point and pn the normal that define the plane
 **/
Ray.prototype.intersectPlane = function(pp, pn)
{
	// reuse some of the workspace vars
	var v0 = this.ws.v0;
	vec3.subtract(pp, this.o, v0);
	var isect = {};
	isect.distance = vec3.dot(pn, v0) / vec3.dot(pn, this.d);
	isect.position = vec3.create(this.d);
	vec3.scale(isect.position, isect.distance);
	vec3.add(isect.position, this.o);
	return isect;
};

/**
 * Intersect ray with subgeometry modelInst.components[geoID].
 * Returns IntersectionRecord array sorted by distance from ray origin.
 **/
Ray.prototype.intersectObject = function ( obj, geoID )
{
    // Call intersect method on relevant mesh and transform
    var intersects = this.intersectMesh(obj.model.components[geoID].mesh, obj.transform, obj.normalTransform);
    intersects.sort( function ( a, b ) { return a.distance - b.distance; } );
    
    return intersects;
};

/**
 * Intersect ray with mesh, applying transform and normalTransform to vertices and normals.
 * Returns unsorted IntersectionRecord array.
 **/
Ray.prototype.intersectMesh = function ( mesh, transform, normalTransform )
{
    var intersects = [];
    var ws = this.ws;
    
    // Apply inverse transform to ray vectors to handle mesh transform
    // Note only rotation applies to direction
    mat4.inverse(transform, ws.invTransform);
    mat4.multiplyVec3(ws.invTransform, this.o, ws.rayO);
    mat4.toRotationMat(ws.invTransform, ws.invTransform);
    mat4.multiplyVec3(ws.invTransform, this.d, ws.rayD);
    
    // Intersect against all tris, collect intersections
    for ( var triI = 0; triI < (mesh.indices.length / 3); triI++)
    {
        // Vertices
        var tri = new Uint16Array(3);
        mesh.GetTriangle(triI, tri);
        mesh.GetVertex(tri[0], ws.v0);
        mesh.GetVertex(tri[1], ws.v1);
        mesh.GetVertex(tri[2], ws.v2);
        
        // Edges
        vec3.subtract(ws.v1, ws.v0, ws.v1_v0);
        vec3.subtract(ws.v2, ws.v0, ws.v2_v0);
        
        // Determinant
        vec3.cross(ws.rayD, ws.v2_v0, ws.pvec);
        ws.det = vec3.dot(ws.v1_v0, ws.pvec);
        
        // Check for ray (nearly) in plane
        if (ws.det < ws.precision) continue;
        
        // Distance from v0 to rayO
        vec3.subtract(ws.rayO, ws.v0, ws.tvec);
        
        // Compute u and do early bail out check
        ws.u = vec3.dot(ws.tvec, ws.pvec);
        if (ws.u < 0 || ws.u > ws.det) continue;
        
        // Compute v and full barycentric check
        vec3.cross(ws.tvec, ws.v1_v0, ws.qvec);
        ws.v = vec3.dot(ws.rayD, ws.qvec);
        if (ws.v < 0 || ws.v + ws.u > ws.det) continue;
        
        // Intersection!!1 So compute t and rescale variables
        ws.t = vec3.dot(ws.v2_v0, ws.qvec);
        ws.inv_det = 1.0 / ws.det;
        ws.t *= ws.inv_det;
        ws.u *= ws.inv_det;
        ws.v *= ws.inv_det;
		
		// If the intersection occurred behind the ray origin, bail
		// out on this computation and continue
		if (ws.t < 0) continue;
        
        // Else, feed all the stuff into IntersectionRecord
        var ir = new IntersectionRecord();
        ir.triI = triI;
        ir.uv = [ws.u, ws.v];
        ir.distance = ws.t;
        vec3.cross(ws.v1_v0, ws.v2_v0, ir.normal);
        mat4.multiplyVec3(normalTransform, ir.normal, ir.normal);
        vec3.normalize(ir.normal);
        vec3.add(this.o, vec3.scale(this.d, ws.t, ws.dvec), ir.position);

        intersects.push(ir);
    }
    return intersects;
};

/**
 * Intersect ray with array of ModelInstances.
 * Returns IntersectionRecord array sorted by distance from ray origin.
 **/
Ray.prototype.intersectModelInstances = function ( modelInsts )
{
    var intersects = [];

    for ( var i = 0, l = modelInsts.length; i < l; i ++ ) {
        Array.prototype.push.apply( intersects, this.intersectModelInstance( modelInsts[ i ] ) );
    }
    intersects.sort( function ( a, b ) { return a.distance - b.distance; } );

    return intersects;
};


// Exports
return Ray;

});