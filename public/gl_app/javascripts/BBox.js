'use strict';

define([
	'gl-matrix'
],
function(){

function BBox()
{
	this.mins = vec3.create();
	this.maxs = vec3.create();
}

BBox.prototype.FromCenterRadius = function(cx, cy, cz, rx, ry, rz)
{
	this.mins[0] = cx-rx; this.mins[1] = cy-ry; this.mins[2] = cz-rz;
	this.maxs[0] = cx+rx; this.maxs[1] = cy+ry; this.maxs[2] = cz+rz;
}

BBox.prototype.FromCenterRadiusArray = function(arr)
{
	this.FromCenterRadius(arr[0], arr[1], arr[2], arr[3], arr[4], arr[5]);
}

BBox.prototype.FromBBox = function(bbox)
{
	vec3.set(bbox.mins, this.mins);
	vec3.set(bbox.maxs, this.maxs);
}

BBox.prototype.Centroid = function()
{
	var centroid = vec3.create();
	vec3.add(this.mins, this.maxs, centroid);
	vec3.scale(centroid, 0.5, centroid);
	return centroid;
}

BBox.prototype.Radius = function()
{
	return vec3.dist(this.mins, this.maxs) / 2;
}

BBox.prototype.Dimensions = function()
{
	var dims = vec3.create();
	vec3.subtract(this.maxs, this.mins, dims);
	return dims;
}

BBox.prototype.ExpandPoint = function(point)
{
	this.mins[0] = Math.min(this.mins[0], point[0]);
	this.mins[1] = Math.min(this.mins[1], point[1]);
	this.mins[2] = Math.min(this.mins[2], point[2]);
	
	this.maxs[0] = Math.max(this.maxs[0], point[0]);
	this.maxs[1] = Math.max(this.maxs[1], point[1]);
	this.maxs[2] = Math.max(this.maxs[2], point[2]);
}

BBox.prototype.ExpandBBox = function(bbox)
{
    this.ExpandPoint(bbox.mins);
    this.ExpandPoint(bbox.maxs);
}

BBox.prototype.Transform = function(matrix)
{
	var bbox = new BBox();
	bbox.FromBBox(this);
	mat4.multiplyVec3(matrix, bbox.mins);
	mat4.multiplyVec3(matrix, bbox.maxs);
	return bbox;
}

BBox.prototype.UpdateCorners = function()
{
	if (!this.corners)
	{
		this.corners = [];
		for (var i = 0; i < 8; i++)
			this.corners[i] = vec3.create();
	}
	
	this.corners[0][0] = this.mins[0]; this.corners[0][1] = this.mins[1]; this.corners[0][2] = this.mins[2];
	this.corners[1][0] = this.mins[0]; this.corners[1][1] = this.mins[1]; this.corners[1][2] = this.maxs[2];
	this.corners[2][0] = this.mins[0]; this.corners[2][1] = this.maxs[1]; this.corners[2][2] = this.mins[2];
	this.corners[3][0] = this.mins[0]; this.corners[3][1] = this.maxs[1]; this.corners[3][2] = this.maxs[2];
	this.corners[4][0] = this.maxs[0]; this.corners[4][1] = this.mins[1]; this.corners[4][2] = this.mins[2];
	this.corners[5][0] = this.maxs[0]; this.corners[5][1] = this.mins[1]; this.corners[5][2] = this.maxs[2];
	this.corners[6][0] = this.maxs[0]; this.corners[6][1] = this.maxs[1]; this.corners[6][2] = this.mins[2];
	this.corners[7][0] = this.maxs[0]; this.corners[7][1] = this.maxs[1]; this.corners[7][2] = this.maxs[2];
}

BBox.prototype.Corners = function()
{
	this.UpdateCorners();
	return this.corners;
}

BBox.prototype.ClosestPoint = function(point)
{
	this.UpdateCorners();
	var mindist = Infinity;
	var minpointi = -1;
	for (var i = 0; i < 8 ; i++)
	{
		var dist = vec3.dist(point, this.corners[i]);
		if (dist < mindist)
		{
			mindist = dist;
			minpointi = i;
		}
	}
	return this.corners[minpointi];
}

BBox.prototype.FarthestPoint = function(point)
{
	this.UpdateCorners();
	var maxdist = 0;
	var maxpointi = -1;
	for (var i = 0; i < 8 ; i++)
	{
		var dist = vec3.dist(point, this.corners[i]);
		if (dist > maxdist)
		{
			maxdist = dist;
			maxpointi = i;
		}
	}
	return this.corners[maxpointi];
}

/**
 * Returns whether Point p is inside this BBox
 * @param {vec3} p
 * @return {boolean}
 */
BBox.prototype.ContainsPoint = function(p) {
	return (p[0] > this.mins[0] && p[0] < this.maxs[0]
         && p[1] > this.mins[1] && p[1] < this.maxs[1]
         && p[2] > this.mins[2] && p[2] < this.maxs[2]);
};

// Exports
return BBox;

});
