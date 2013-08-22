'use strict';

define([
	'./BBox',
	'gl-matrix'
],
function(BBox){

function attribBufferData(gl, attribArray) {
  var attribBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, attribBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, attribArray, gl.STATIC_DRAW);
  return attribBuffer;
}

function indexBufferData(gl, indexArray) {
  var indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);
  return indexBuffer;
}

function Mesh(gl, attribArray, indexArray, vertexFormat, bboxen)
{
  this.gl_ = gl;
  this.vertexFormat_ = vertexFormat;
  this.numIndices_ = indexArray.length;

  this.vbo_ = attribBufferData(gl, attribArray);
  this.ibo_ = indexBufferData(gl, indexArray);
  
  // Have to keep some geometry in CPU memory for scene editing.
  var stride = vertexFormat[0].stride
  var numVerts = attribArray.length / stride;
  this.vertices = new Float32Array(3 * numVerts);
  for (var i = 0; i < numVerts; i++)
  {
	var inbase = stride*i;
	var outbase = 3*i;
	this.vertices[outbase] = attribArray[inbase];
	this.vertices[outbase+1] = attribArray[inbase+1];
	this.vertices[outbase+2] = attribArray[inbase+2];
  }
  this.indices = indexArray;
  
  // Bounding box
  this.bbox = new BBox();
  if (bboxen)
	this.bbox.FromCenterRadiusArray(bboxen);
  else
	this.ComputeBoundingBox();
  
  // Allocate storage for intermediate variables that are used during
  // surface evaluation
  this.surfaceEvalWorkspace = {
	tri: new Uint16Array(3),
	v0: vec3.create(),
	v1: vec3.create(),
	v2: vec3.create(),
	tmp: vec3.create(),
	v1_v0: vec3.create(),
	v2_v0: vec3.create()
	};
}

Mesh.DEFAULT_VERTEX_FORMAT = [
  { name: "a_position",
    size: 3,
    stride: 8,
    offset: 0
  }, 
  { name: "a_texcoord",
    size: 2,
    stride: 8,
    offset: 3
  },
  { name: "a_normal",
    size: 3,
    stride: 8,
    offset: 5
  }
];

Mesh.POSITION_ONLY_VERTEX_FORMAT = [
  { name: "a_position",
    size: 3,
    stride: 8,
    offset: 0
  } 
];

Mesh.prototype.Delete = function()
{
	var gl = this.gl_;
	gl.deleteBuffer(this.ibo_);
	gl.deleteBuffer(this.vbo_);
}

Mesh.prototype.bind = function(program) {
  var gl = this.gl_;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo_);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo_);
  program.vertexAttribPointers(this.vertexFormat_);
};

Mesh.prototype.draw = function() {
  var gl = this.gl_;
  gl.drawElements(gl.TRIANGLES, this.numIndices_, gl.UNSIGNED_SHORT, 0);
};

Mesh.prototype.bindAndDraw = function(program, opt_options) {
  this.bind(program);
  this.draw();
};


Mesh.prototype.ComputeBoundingBox = function()
{
	var tmp = vec3.create([this.vertices[0], this.vertices[1], this.vertices[2]]);
	vec3.set(tmp, this.bbox.mins);
	vec3.set(tmp, this.bbox.maxs);
	var numverts = this.vertices.length / 3;
	for (var i = 1; i < numverts; i++)
	{
		var base = 3*i;
		vec3.set([this.vertices[base], this.vertices[base+1], this.vertices[base+2]], tmp);
		this.bbox.ExpandPoint(tmp);
	}
}

Mesh.prototype.EvaluateSurface = function(triI, uv)
{
	// Alias all of the workspace vars
	var v0 = this.surfaceEvalWorkspace.v0;
	var v1 = this.surfaceEvalWorkspace.v1;
	var v2 = this.surfaceEvalWorkspace.v2;
	var tmp = this.surfaceEvalWorkspace.tmp;
	var v1_v0 = this.surfaceEvalWorkspace.v1_v0;
	var v2_v0 = this.surfaceEvalWorkspace.v2_v0;
	var tri = this.surfaceEvalWorkspace.tri;
	
	this.GetTriangle(triI, tri);
	this.GetVertex(tri[0], v0);
	this.GetVertex(tri[1], v1);
	this.GetVertex(tri[2], v2);
	
	var result =
	{
		position: vec3.create(),
		normal: vec3.create()
	};
	
	vec3.subtract(v1, v0, v1_v0);
	vec3.subtract(v2, v0, v2_v0);
	
	vec3.scale(v1_v0, uv[0], tmp);
	vec3.add(v0, tmp, result.position);
	vec3.scale(v2_v0, uv[1], tmp);
	vec3.add(result.position, tmp);
	
	vec3.cross(v1_v0, v2_v0, result.normal);
	vec3.normalize(result.normal);
	
	return result;
}

Mesh.prototype.GetTriangle = function(index, dest)
{
	var base = 3*index;
	dest[0] = this.indices[base];
	dest[1] = this.indices[base+1];
	dest[2] = this.indices[base+2];
}

Mesh.prototype.GetVertex = function(index, dest)
{
	var base = 3*index;
	dest[0] = this.vertices[base];
	dest[1] = this.vertices[base+1];
	dest[2] = this.vertices[base+2];
}


/// Utilities for generating various geometry //

/**
 * Generates a disc with inner radius ri, outer radius ro, discretized
 * using slices. The disc is in the XY plane at z = 0.
 **/
Mesh.GenerateDisc = function(gl, ri, ro, slices, opt_z, opt_startAng, opt_endAng)
{
	var TWOPI = 2*Math.PI;
	var startAng = opt_startAng || 0;
	var endAng = opt_endAng || TWOPI;
	
	var z = opt_z || 0;
	
	// Vertices
	var vertexArray = new Float32Array(2*slices*8);
	for (var slice = 0; slice < slices; slice++)
	{
		var t = slice/slices;
		var phi = (1-t)*startAng + t*endAng;
		var cosphi = Math.cos(phi);
		var sinphi = Math.sin(phi);
		var twoslice = 2*slice;
		var base = 16*slice;
		
		// Inner vertex
		vertexArray[base] = ri*cosphi;
		vertexArray[base+1] = ri*sinphi;
		vertexArray[base+2] = z;
		// (normal, uv info is dummy value)
		vertexArray[base+3] = 0;
		vertexArray[base+4] = 0;
		vertexArray[base+5] = 0;
		vertexArray[base+6] = 0;
		vertexArray[base+7] = 0;
		
		// Outer vertex
		vertexArray[base+8] = ro*cosphi;
		vertexArray[base+9] = ro*sinphi;
		vertexArray[base+10] = z;
		// (normal, uv info is dummy value)
		vertexArray[base+11] = 0;
		vertexArray[base+12] = 0;
		vertexArray[base+13] = 0;
		vertexArray[base+14] = 0;
		vertexArray[base+15] = 0;
	}
	
	// Indices
	var indexArray = new Uint16Array(2*slices*3);
	var n = 2*slices;
	for (var slice = 0; slice < slices; slice++)
	{
		var twoslice = 2*slice;
		var base = 6*slice;
		
		// Face 1
		indexArray[base] = (twoslice+3)%n;
		indexArray[base+1] = (twoslice+2)%n;
		indexArray[base+2] = twoslice;
		
		// Face 2
		indexArray[base+3] = twoslice+1;
		indexArray[base+4] = (twoslice+3)%n;
		indexArray[base+5] = twoslice;
	}
	
	return new Mesh(gl, vertexArray, indexArray, Mesh.DEFAULT_VERTEX_FORMAT);
}

/**
 * Generates a circular slice out of a square using radius r.
 * The square is in the XY plane at z = 0.
 **/
Mesh.GenerateCircularSquareSlice = function(gl, r, slices, startAng, endAng)
{
	var vertexArray = new Float32Array((slices+2)*8);
	
	// First, find the corner vertex
	var halfangdiff = (endAng - startAng)/2;
	var phi = 0.75*Math.PI - halfangdiff;
	var longrad = r*Math.sin(phi) / Math.sin(0.25*Math.PI);	// Law of sines
	var ang = startAng + halfangdiff;
	vertexArray[0] = longrad*Math.cos(ang);
	vertexArray[1] = longrad*Math.sin(ang);
	vertexArray[2] = 0;
	// (normal, uv info is dummy value)
	vertexArray[3] = 0;
	vertexArray[4] = 0;
	vertexArray[5] = 0;
	vertexArray[6] = 0;
	vertexArray[7] = 0;
	
	// Next, get the vertices along the circle
	for (var slice = 0; slice <= slices; slice++)
	{
		var t = slice/slices;
		var phi = (1-t)*startAng + t*endAng;
		var cosphi = Math.cos(phi);
		var sinphi = Math.sin(phi);
		var base = 8*(slice+1);
		
		vertexArray[base] = r*cosphi;
		vertexArray[base+1] = r*sinphi;
		vertexArray[base+2] = 0;
		// (normal, uv info is dummy value)
		vertexArray[base+3] = 0;
		vertexArray[base+4] = 0;
		vertexArray[base+5] = 0;
		vertexArray[base+6] = 0;
		vertexArray[base+7] = 0;
	}
	
	// Finally, make some faces
	var indexArray = new Uint16Array(3*slices);
	for (var slice = 0; slice < slices; slice++)
	{
		var base = 3*slice;
				
		indexArray[base] = 0;
		indexArray[base+1] = slice+1;
		indexArray[base+2] = slice+2;
	}
	
	return new Mesh(gl, vertexArray, indexArray, Mesh.DEFAULT_VERTEX_FORMAT);
}

Mesh.GenerateSphere = function(gl, radius, rings, sectors, xform) {
	  // TODO: Compute base indices and store directly into final arrays to improve performance

    // Defaults
    radius = radius || 1.0;
    rings = rings || 10;
    sectors = sectors || 10;

    // Constants
    var R = 1.0 / (rings-1);
    var S = 1.0 / (sectors-1);
    var nV = rings * sectors * 8;
    var nI = (rings-1) * sectors * 6;

    // Triangle index function
    function push_indices(is, r, s) {
        var curRow = r * sectors;
        var nextRow = (r+1) * sectors;
		    var nextSec = (s+1) % sectors;

        is.push(curRow + s);
        is.push(nextRow + s);
        is.push(nextRow + nextSec);

        is.push(curRow + s);
        is.push(nextRow + nextSec);
        is.push(curRow + nextSec);
    }

    // Compute positions, uvs and normals
    var vs = [];
    var is = [];
    for (var r = 0; r < rings; r++) {
        var theta = r * Math.PI * R;
        var sinTheta = Math.sin(theta);
        for (var s = 0; s < sectors; s++) {
            var phi = s * 2 * Math.PI * S;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            //var base = latNumber*(8*longBands) + 8*longNumber;
            var nx = cosPhi * sinTheta;
            var ny = Math.sin(-Math.PI*0.5 + theta);
            var nz = sinPhi * sinTheta;
            var u = s * S;
            var v = r * R;
            var x = radius * nx;
            var y = radius * ny;
            var z = radius * nz;

            vs.push(x);
            vs.push(y);
            vs.push(z);
            vs.push(u);
            vs.push(v);
            vs.push(nx);
            vs.push(ny);
            vs.push(nz);

            if (r < (rings-1)) push_indices(is, r, s);
        }
    }

    var vertexArray = new Float32Array(nV);
    var indexArray = new Uint16Array(nI);
    for (var k=0; k < vs.length; k++) vertexArray[k] = vs[k];
    for (k=0; k < is.length; k++) indexArray[k] = is[k];

    if (xform) {
      Mesh.TransformAttribArray(vertexArray, xform, Mesh.DEFAULT_VERTEX_FORMAT);
    }

    return new Mesh(gl, vertexArray, indexArray, Mesh.DEFAULT_VERTEX_FORMAT);
};

Mesh.GenerateTetrahedron = function(gl, xform) {
  var vertexArray = new Float32Array([
    0.000, 0.000, 1.000, 0, 0, 0, 0, 0,
    0.943, 0.000,-0.333, 0, 0, 0, 0, 0,
   -0.471, 0.816,-0.333, 0, 0, 0, 0, 0,
   -0.471,-0.816,-0.333, 0, 0, 0, 0, 0
  ]);
  var indexArray = new Uint16Array([
    0,1,2,
    0,2,3,
    0,3,1,
    1,3,2
  ]);

  if (xform) {
    Mesh.TransformAttribArray(vertexArray, xform, Mesh.DEFAULT_VERTEX_FORMAT);
  }

  return new Mesh(gl, vertexArray, indexArray, Mesh.DEFAULT_VERTEX_FORMAT);
};

// NOTE: Transforms vertices in place within the attribute array passed in
Mesh.TransformAttribArray = function(attribArray, xform, vertexFormat) {
  vertexFormat = vertexFormat || Mesh.DEFAULT_VERTEX_FORMAT;
  var stride = vertexFormat[0].stride;
  var numVerts = attribArray.length / stride;
  var v = vec3.create();
  for (var i = 0; i < numVerts; i++) {
    var base = stride*i;

    v[0] = attribArray[base  ];
    v[1] = attribArray[base+1];
    v[2] = attribArray[base+2];

    mat4.multiplyVec3(xform, v);

    attribArray[base  ] = v[0];
    attribArray[base+1] = v[1];
    attribArray[base+2] = v[2];

    // TODO: Also transform normals if non-zero
  }
};

// Exports
return Mesh;

});
