// requires 'gl-matrix-min.js'

'use strict';

vec3.sphericalCoords = function(src, dst)
{
	// r
	dst[0] = vec3.length(src);
	// theta
	dst[1] = Math.acos(src[2] / dst[0]);
	// phi
	dst[2] = Math.atan2(src[1], src[0]);
}

vec3.sphericalToRectangular = function(r, phi, theta, dst)
{
	var rSinTheta = r*Math.sin(theta);
	dst[0] = rSinTheta*Math.cos(phi);
	dst[1] = rSinTheta*Math.sin(phi);
	dst[2] = r*Math.cos(theta);
}

mat4.createFromRows = function(v0, v1, v2, v3)
{
	var args = [];
	args.concat(v0);
	args.concat(v1);
	args.concat(v2);
	args.concat(v3);
	return mat4.createFrom.apply(this, args);
}

mat4.createFromColumns = function(v0, v1, v2, v3)
{
	var m = mat4.createFromRows(v0, v1, v2, v3);
	mat4.transpose(m);
	return m;
}

/*
 * from and to must be normalized.
 */
vec3.makeOrthonormalBasis = function (vec, dest0, dest1)
{
    var axis0 = vec3.create();
    var axis1 = vec3.create();

    vec3.cross(vec, vec3.createFrom(1.0, 0.0, 0.0), axis0);
    vec3.cross(vec, vec3.createFrom(0.0, 1.0, 0.0), axis1);

    if (vec3.length(axis0) >= vec3.length(axis1))
    {
        vec3.normalize(axis0, dest0);
    }
    else
    {
        vec3.normalize(axis1, dest0);
    }
    vec3.cross(dest0, vec, dest1);
    vec3.normalize(dest0);
}

/*
 * from and to must be normalized.
 */
mat4.face = function (from, to, dest)
{
    vec3.normalize(from);
    vec3.normalize(to);

    var axis = vec3.create();
    vec3.cross(from, to, axis);

	var d = vec3.dot(from, to);
	// Floating point inaccuracy makes it necessary to clamp d
	d = Math.min(d, 1.0); d = Math.max(d, -1.0);
    var angle = Math.acos(d);

    if (angle == 0.0)
    {
        mat4.identity(dest);
    }
    //else if (vec3.length(axis) == 0.0)
	else if (vec3.length(axis) < 0.00001)
    {
        var basis0 = vec3.create();
        var basis1 = vec3.create();
        vec3.makeOrthonormalBasis(from, basis0, basis1);
        mat4.rotate(dest, angle, basis0);
    }
    else
    {
		vec3.normalize(axis);
        mat4.rotate(dest, angle, axis);
    }

    return dest;
}

vec3.unproject = function (vec, view, proj, viewport, dest) {
    if (!dest) { dest = vec; }

    var m = mat4.create();
    var v = new MatrixArray(4);
    
    v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
    v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
    v[2] = 2.0 * vec[2] - 1.0;
    v[3] = 1.0;
    
    mat4.multiply(proj, view, m);
    if(!mat4.inverse(m)) { return null; }
    
    mat4.multiplyVec4(m, v);
    if(v[3] === 0.0) { return null; }

    dest[0] = v[0] / v[3];
    dest[1] = v[1] / v[3];
    dest[2] = v[2] / v[3];
    
    return dest;
};

vec3.signedAngleBetween = function(vec1, vec2, planeNormal)
{
	var tmp = vec3.create();
	
	var cosa = vec3.dot(vec1, vec2);
	vec3.cross(vec1, vec2, tmp);
	var sina = vec3.length(tmp);
	
	var ang = Math.atan2(sina, cosa);
	var sign = vec3.dot(planeNormal, tmp);
	return (sign < 0 ? -ang : ang);
}

vec3.toJSON = function(v)
{
    return [v[0],v[1],v[2]];
};

mat4.axisPairToOrthoMatrix = function(v1, v2) {
  vec3.normalize(v1);
  vec3.normalize(v2);
  var v3 = vec3.create();
  vec3.cross(v1, v2, v3);

  var m = mat4.create([
      v1[0], v2[0], v3[0], 0,
      v1[1], v2[1], v3[1], 0,
      v1[2], v2[2], v3[2], 0,
      0,     0,     0,     1
  ]);

  return m;
};

/**
 * Takes two source coordinate frame basis vectors s0 and s1 and two target basis vector t0 and t1 as input
 * and computes the transform from source to target. Assumes basis vectors are orthogonal.
 */
mat4.coordFrameTransformMatrix = function(s0, s1, t0, t1) {
  //TODO: Debug corner cases
  var S = mat4.axisPairToOrthoMatrix(s0, s1);
  var T = mat4.axisPairToOrthoMatrix(t0, t1);

  var Sinv = mat4.create();
  mat4.inverse(S, Sinv);

  var xform = mat4.create();
  mat4.multiply(T, Sinv, xform);

  return xform;
};