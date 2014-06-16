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
};

vec3.sphericalToRectangular = function(r, phi, theta, dst)
{
	var rSinTheta = r*Math.sin(theta);
	dst[0] = rSinTheta*Math.cos(phi);
	dst[1] = rSinTheta*Math.sin(phi);
	dst[2] = r*Math.cos(theta);
};

mat4.createFromRows = function(v0, v1, v2, v3)
{
	var args = [];
	args.concat(v0);
	args.concat(v1);
	args.concat(v2);
	args.concat(v3);
	return mat4.createFrom.apply(this, args);
};

mat4.createFromColumns = function(v0, v1, v2, v3)
{
	var m = mat4.createFromRows(v0, v1, v2, v3);
	mat4.transpose(m);
	return m;
};

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
};

mat3.col = function (m, i)
{
    var v = vec3.createFrom(m[i], m[i+3], m[i+6]);
    return v;
};

mat3.setCol = function (m, i, v)
{
    m[i] = v[0]; m[i+3] = v[1]; m[i+6] = v[2];
};

mat3.row = function (m, i)
{
    var v = vec3.createFrom(m[i*3], m[i*3+1], m[i*3+2]);
    return v;
};

mat3.setRow = function (m, i, v)
{
    m[i*3] = v[0]; m[i*3+1] = v[1]; m[i*3+2] = v[2];
};

mat3.normalize = function (m, dest)
{
    if (!dest) { dest = m; }
    for (var i = 0; i < 3; i++) {
        var v = mat3.col(m, i);
        vec3.normalize(v);
        mat3.setCol(dest, i, v);
    }
    return dest;
};

mat4.toNormalizedRotationMat = function (m, dest)
{
    if (!dest) { dest = m; }
    var m3 = mat4.toMat3(m);
    mat3.normalize(m3);
    mat3.toMat4(m3, dest);
    return dest;
};

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
};

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
};

vec3.toJSON = function(v)
{
    return [v[0],v[1],v[2]];
};