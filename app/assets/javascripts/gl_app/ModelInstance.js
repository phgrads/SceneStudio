'use strict';

define([
	'./Constants',
	'./PubSub',
	'./UndoStack',
	'./CoordinateFrame',
	'./fsm',
	'./uibehaviors',
	'gl-matrix',
	'gl-matrix-ext'
],
function(Constants, PubSub, UndoStack, CoordinateFrame, FSM, Behaviors){

function ModelInstance(model, parentInst)
{
	// EXTEND PUBSUB: Call PubSub constructor
	PubSub.call(this);
	this.type = "ModelInstance";

	this.index = -1;

	// Model
	this.model = model;
	
	// Hierarchy information
	this.SetParent(parentInst);
	this.children = [];
	
	// Transform information
	this.parentMeshI = -1;
	this.parentTriI = -1;
	this.parentUV = new Float32Array([0, 0]);
	this.cubeFace = 0;
	this.scale = 1.0;
	this.parentPos = vec3.create();
	this.coordFrame = new CoordinateFrame();
	this.rotation = 0.0;
	this.transform = mat4.identity(mat4.create());
	this.normalTransform = mat4.identity(mat4.create());
    this.bakedTransform = false; // Indicates that transform was loaded in and shouldn't be recomputed
	
	// UI status
	this.renderState = {
		isPickable: true,
		isInserting: false,
		isSelected: false,
		isSelectable: true
	};
	
	this.CreateFocusListener();
}

// EXTEND PUBSUB: Inherit PubSub prototype
ModelInstance.prototype = Object.create(PubSub.prototype);

ModelInstance.prototype.toJSONString = function()
{
    this.modelID = this.model.id;
    this.parentIndex = (this.parent) ? this.parent.index : -1;
    this.renderStateArr = [this.renderState.isPickable, this.renderState.isInserting, this.renderState.isSelected, this.renderState.isSelectable];
    this.cu = this.coordFrame.u;
    this.cv = this.coordFrame.v;
    this.cw = this.coordFrame.w;
    var fieldsToSave = ["index","modelID", "parentIndex", "renderStateArr", "cu", "cv", "cw", "parentMeshI", "parentTriI", "parentUV", "cubeFace", "scale", "rotation"];
    if (this.bakedTransform) fieldsToSave.push("transform");
    return JSON.stringify(this, fieldsToSave);
};

ModelInstance.fromJSONString = function(string, assman, modelMap, callback)
{
    var json = JSON.parse(string);
    
    (function(remaining) {
        if(modelMap) {
            var model = modelMap[json.modelID];
            remaining(model);
        } else {
            assman.GetModel(json.modelID, function(model) {
                remaining(model);
            }.bind(this));
        }
    })(function(model) {
        var newMinst = new ModelInstance(model, null);
        newMinst.index = json.index;
        newMinst.parentMeshI = json.parentMeshI;
        newMinst.parentTriI = json.parentTriI;
        newMinst.parentUV = new Float32Array(json.parentUV);
        newMinst.cubeFace = json.cubeFace;
        newMinst.scale = json.scale;
        newMinst.rotation = json.rotation;
        if (json.renderStateArr) {
          newMinst.renderState = {
              isPickable: json.renderStateArr[0],
              isInserting: json.renderStateArr[1],
              isSelected: json.renderStateArr[2],
              isSelectable: json.renderStateArr[3]
          };
        } else {
          newMinst.renderState = {
            isPickable: false,
            isInserting: false,
            isSelected: false,
            isSelectable: false
          };
        }
        newMinst.coordFrame = new CoordinateFrame(json.cu, json.cv, json.cw);

        // If transform was stored in json, re-instate it here
        if (json.transform) {
            newMinst.parentMeshI = -1;
            newMinst.transform = mat4.create(json.transform);
            mat4.toRotationMat(newMinst.transform, newMinst.normalTransform);
            newMinst.bakedTransform = true;
        }
    
        // Copy over parent index.
        // Actual model will need to be re-instated at a later time
        // by the logic that has requested deserialization
        newMinst.parentIndex = json.parentIndex;

        callback(newMinst);
    });
};

ModelInstance.prototype.Clone = function()
{	
	var newMinst = new ModelInstance(this.model, null);
	newMinst.parentMeshI = this.parentMeshI;
	newMinst.parentTriI = this.parentTriI;
	newMinst.parentUV = new Float32Array(this.parentUV);
	newMinst.cubeFace = this.cubeFace;
	newMinst.scale = this.scale;
	newMinst.rotation = this.rotation;
	newMinst.coordFrame.FromCoordinateFrame(this.coordFrame);
	newMinst.UpdateTransform();
	
	for (var iChild = 0; iChild < this.children.length; iChild++)
	{
		var child = this.children[iChild];
		var newChild = child.Clone();
		newChild.SetParent(newMinst);
		newChild.UpdateTransform();
	}
	
	return newMinst;
};

ModelInstance.prototype.Remove = function()
{
	this.children.forEach(
		function(child)
		{
			child.Remove();
		}
	);
	this.SetParent(null);
};

ModelInstance.prototype.Bounds = function()
{
	return this.model.bbox.Transform(this.transform);
};

ModelInstance.prototype.CascadingRotate = function (rotate)
{
	this.rotation += rotate;
	var rotmat = mat4.identity(mat4.create());
	mat4.rotate(rotmat, rotate, this.coordFrame.w);
	
	var helper = function(mInst)
	{
		mInst.coordFrame.Transform(rotmat);
		mInst.children.forEach(helper);
	};
	this.children.forEach(helper);
	this.UpdateTransformCascading();
};

ModelInstance.prototype.CascadingScale = function (scale)
{
    this.scale *= scale;
    this.UpdateTransform();
	
	this.Publish('Scaled');

    this.children.forEach(
		function (mInst)
		{
		    mInst.CascadingScale(scale);
		}
	);
};

ModelInstance.prototype.Tumble = function()
{
	this.cubeFace = (this.cubeFace + 1) % 6;
	this.Publish('Tumbled');
	this.UpdateTransformCascading();
};

ModelInstance.prototype.SetReasonableScale = function (scene)
{
    if (Constants.autoSize && this.model.metadata && this.model.metadata.unit) {
        this.scale = this.model.metadata.unit*Constants.metersToVirtualUnit;
    } else {
        this.scale = Constants.defaultModelUnit*Constants.metersToVirtualUnit;
        var sceneSize = vec3.length(scene.root.model.bbox.Dimensions());
        var mySize = this.scale*vec3.length(this.model.bbox.Dimensions());

        if (mySize < 0.05 * sceneSize)
        {
            this.scale = 0.05 * sceneSize / mySize;
        }
        if (mySize > 0.25 * sceneSize)
        {
            this.scale = 0.25 * sceneSize / mySize;
        }
    }
    console.log("Set scale to: " + this.scale );
};


ModelInstance.prototype.SetParent = function(parInst)
{
	// You cannot be your own parent
	if (this === parInst)
	{
		throw new Error('ModelInstance.SetParent: an instance cannot be its own parent.');
	}
	// Remove from current parent
	var p = this.parent;
	if (this.parent)
	{
		var idx = $.inArray(this, p.children);
		if (idx >= 0) p.children.splice(idx, 1);
	}
	// Add to new parent
	this.parent = parInst;
	if (parInst)
    {
        parInst.children.push(this);
    }
};

ModelInstance.prototype.AccumRotationTransform = function()
{
	var xform = mat4.identity(mat4.create());
	var rotmat = mat4.create();
	
	for (var inst = this; inst != null; inst = inst.parent)
	{
		mat4.identity(rotmat);
		mat4.rotate(rotmat, inst.rotation, inst.coordFrame.w);
		//mat4.multiply(rotmat, xform, xform);
		mat4.multiply(xform, rotmat, xform);	// Not sure why this order is correct...
	}
	
	return xform;
};

ModelInstance.prototype.TransformCoordFrameCascading = function(xform)
{
	this.coordFrame.Transform(xform);
	this.children.forEach(function(mInst) {
		mInst.TransformCoordFrameCascading(xform);
	});
};

ModelInstance.prototype.ResetCoordFrame = function()
{		
	// Transform the world frame into the new frame that we are going to use
	var newFrame = new CoordinateFrame();
	var r = this.parent.AccumRotationTransform();
	var ri = mat4.create();
	mat4.inverse(r, ri);
	var origNormal = vec3.create();
	mat4.multiplyVec3(ri, this.coordFrame.w, origNormal);
	newFrame.Face(origNormal);
	newFrame.Transform(r);
	
	// Find the angle between newFrame.u and this.coordFrame.u. This is the amount of additional rotation
	// we need to introduce if we want to use newFrame instead of this.coordFrame
	var ang = vec3.signedAngleBetween(newFrame.u, this.coordFrame.u, this.coordFrame.w);
	this.CascadingRotate(ang);
	
	// Finally, replace the coordinate frame
	this.coordFrame.FromCoordinateFrame(newFrame);
};

ModelInstance.prototype.UpdateStateFromRayIntersection = function(isect)
{
	var oldParent = this.parent;
	var newParent = isect.inst;

    // Ignore intersection if picked parent is not a ModelInstance
    // TODO: This uses a custom type check hack for now. BEWARE OF instanceOf, it is INCONSISTENT
    if (!(newParent.type && newParent.type === "ModelInstance")) {
        //TODO: Would be cleaner to modify pickability of Manipulators instead
        return;
    }

	this.SetParent(newParent);
	this.parentMeshI = isect.geoID;
	this.parentTriI = isect.triI;
	this.parentUV = isect.uv;
	
	/** Update coordinate frame **/

	// Save old coordinate frame information
	var prevCoordFrame = new CoordinateFrame();
	prevCoordFrame.FromCoordinateFrame(this.coordFrame);
	var prevRot = this.rotation;
	
	// If we are in the middle of a move operation, we enforce that
	// for all support surfaces with the same normal as the support surface
	// at the beginning of the move, we use the same coordinate frame that
	// we had at the beginning of the move. This prevents the object from
	// ending up unexpectedly rotated if it is quickly dragged across surfaces of
	// different orientation.
	this.moveState && vec3.normalize(isect.normal);
	var equivalentToOriginal = this.moveState && vec3.dot(isect.normal, this.moveState.origFrame.w) > 0.999;
	if (equivalentToOriginal)
	{
		this.coordFrame.FromCoordinateFrame(this.moveState.origFrame);
		this.rotation = this.moveState.origRot;
	}
	else
	{
//        console.log("Not equivalent to original surface normal!!!");
		this.coordFrame.Face(isect.normal);
	}	
	
	// If we moved to a different parent object, we need to reset the
	// coordinate frame accordingly
	if (oldParent !== this.parent)
	{
//        console.log("Resetting Coordinate Frame!!!");
		this.ResetCoordFrame();
		// And, if we're in the middle of a move, we may need to update the origFrame
		if (equivalentToOriginal)
		{
			this.moveState.origFrame.FromCoordinateFrame(this.coordFrame);
			this.moveState.origRot = this.rotation;
		}
	}
	
	// Finally, propagate this change to the coordinate frames of all children
	var xform = CoordinateFrame.ChangeOfBasis(prevCoordFrame, this.coordFrame);
	var rotdiff = this.rotation - prevRot;
	this.coordFrame.FromCoordinateFrame(prevCoordFrame);
	this.rotation = prevRot;
	this.TransformCoordFrameCascading(xform);
	this.CascadingRotate(rotdiff);

	this.UpdateTransformCascading();
	this.Publish('Moved');
};

ModelInstance.prototype.BaseCentroid = function()
{
	var bcent = vec3.create([0, 0, 0]);
	var xform = mat4.identity(mat4.create());
	this.SecondTransform(xform);
	mat4.multiplyVec3(xform, bcent);
	return bcent;
};

// Radius of the bounding circle in the plane of the
// supporting surface
ModelInstance.prototype.ProjectedBoundingRadius = function()
{
	var bbox = this.model.bbox;
	var xform = mat4.identity(mat4.create());
	this.FirstTransform(xform);
	bbox = bbox.Transform(xform);
	var dims = bbox.Dimensions();
	var x = dims[0]/2;
	var y = dims[1]/2;
	return Math.sqrt(x*x + y*y);
};

ModelInstance.prototype.UpdateTransformCascading = function ()
{
    this.UpdateTransform();
    this.children.forEach(
		function (mInst)
		{
		    mInst.UpdateTransformCascading();
		}
	);
};

ModelInstance.prototype.UpdateTransform = function ()
{
    if (!this.parent) return;

    this.transform = mat4.identity(mat4.create());
	
	this.FirstTransform(this.transform);
	this.SecondTransform(this.transform);

    // Update normalized rotation matrix
    mat4.toNormalizedRotationMat(this.transform, this.normalTransform);
};

// Make the object upright and sitting at the origin at the correct size
ModelInstance.prototype.FirstTransform = function(xform)
{	
	// Translate centroid to origin
    var bbox = this.model.bbox;
    var center = bbox.Centroid();
    vec3.negate(center);
    mat4.translate(xform, center);

    // Orient toward proper cube face so that up is positive Z
    var axis;
    if (this.cubeFace == 0) axis = vec3.createFrom(0.0, 0.0, 1.0);
    if (this.cubeFace == 1) axis = vec3.createFrom(1.0, 0.0, 0.0);
    if (this.cubeFace == 2) axis = vec3.createFrom(0.0, 1.0, 0.0);
    if (this.cubeFace == 3) axis = vec3.createFrom(0.0, 0.0, -1.0);
    if (this.cubeFace == 4) axis = vec3.createFrom(-1.0, 0.0, 0.0);
    if (this.cubeFace == 5) axis = vec3.createFrom(0.0, -1.0, 0.0);

    // Translate bottom center to origin
    var d = this.model.bbox.Dimensions();
    d[0] *= axis[0] * 0.5; d[1] *= axis[1] * 0.5; d[2] *= axis[2] * 0.5;

    var m = mat4.identity(mat4.create());
    mat4.translate(m, d);
    mat4.multiply(m, xform, xform);

    // Rotate
    mat4.identity(m);
    mat4.face(axis, vec3.createFrom(0.0, 0.0, 1.0), m);
    mat4.multiply(m, xform, xform);
	
	// Scale
    mat4.identity(m);
    mat4.scale(m, vec3.createFrom(this.scale, this.scale, this.scale));
    mat4.multiply(m, xform, xform);
};

// Orient, rotate, and place the object in its final configuration
ModelInstance.prototype.SecondTransform = function(xform, opt_doLocalRotation)
{
  var doLocalRot = opt_doLocalRotation === undefined ? true : opt_doLocalRotation;

  var anchorInfo = this.parent.EvaluateSurface(this.parentMeshI, this.parentTriI, this.parentUV);
  vec3.set(anchorInfo.position, this.parentPos);
  var m = mat4.identity(mat4.create());

  if (doLocalRot)
  {
    // Rotation relative to coordinate frame
    mat4.rotateZ(m, this.rotation);
    mat4.multiply(m, xform, xform);
  }

  // TODO: Debug the Constants.autoOrient mode (set to true to enable)
  //       This coord frame transform enables self-orienting on parent surfaces but may overcompensate for rotation
  if (Constants.autoOrient) {
    // Coordinate frame transform
    m = this.coordFrame.ToBasisMatrix();
    mat4.multiply(m, xform, xform);
  }

  // Multiply parent rotation
  mat4.multiply(this.parent.normalTransform, xform, xform);

  // Translate to anchor position (+ small z offset to avoid coplanarity)
  mat4.identity(m);
  var offset = vec3.create(this.coordFrame.w);
  vec3.scale(offset, Constants.transformZoffset);
  vec3.add(offset, this.parentPos);
  mat4.translate(m, offset);
  mat4.multiply(m, xform, xform);
};

ModelInstance.prototype.CommonDrawSetup = function(renderer)
{
	var gl = renderer.gl_;

	mat4.multiply(renderer.viewProj_, this.transform, renderer.mvp_);
    gl.uniformMatrix4fv(renderer.activeProgram_.uniformLocs.u_mvp, false, renderer.mvp_);
    gl.uniformMatrix3fv(renderer.activeProgram_.uniformLocs.u_model, false,
                      mat4.toMat3(this.transform));
};

ModelInstance.prototype.Draw = function (renderer) {
    
	this.CommonDrawSetup(renderer);
    
	var opts = renderer.Options();
	opts.isInserting |= this.renderState.isInserting;
	this.model.Draw(renderer);
	
	// Recursively draw children
	this.children.forEach(
		function (mInst)
		{
			renderer.PushOptions();
			mInst.Draw(renderer);
			renderer.PopOptions();
		}
	);
};

ModelInstance.prototype.Pick = function (renderer)
{
	if (!this.renderState.isPickable) return;
	
	this.CommonDrawSetup(renderer);
	
	// Pass modelInstance id to model.Pick	
	this.model.Pick(renderer, this.index);
	
	// Recursively pick children
	this.children.forEach(
		function (mInst)
		{
			mInst.Pick(renderer);
		}
	);
};

ModelInstance.prototype.EvaluateSurface = function(meshI, triI, uv)
{
	var result = this.model.EvaluateSurface(meshI, triI, uv);
	mat4.multiplyVec3(this.transform, result.position);
	mat4.multiplyVec3(this.normalTransform, result.normal);
	return result;
};



// extension of mouse dragging behavior
var interaction_template = FSM.template()
    .output('start', 'drag', 'finish', 'cancel',
            'focus', 'defocus', 'hover')
    .state('up')
        .repeat('focus', 'defocus')
        .step('mousemove', 'up', 'hover')
        .step('mousedown', function(fsm, params) {
            params.lockFocus();
            params.cancel = function() {
                    fsm.jump('up');
                    params.unlockFocus();
                };
            fsm.jump('down', 'start', params);
        })
    .state('down')
        .step('mousemove', 'down', 'drag')
        .step('mouseup', function(fsm, params) {
            fsm.jump('up', 'finish', params);
            params.unlockFocus(); // NEEDS to come last here
        })
        .step('defocus', function(fsm, params) {
            // no need to release if we've already been told to defocus
            fsm.jump('up');
            fsm.emit('cancel', params);
            fsm.emit('defocus', params);
        })
    ;

ModelInstance.prototype.CreateFocusListener = function()
{
    this.focus_listener = Behaviors.createFilter('left','')
        .output('mousedown', 'mouseup', 'mousemove',
                'focus', 'defocus'); // ensure filter passes along events
    var fsm = interaction_template.compile().listen(this.focus_listener)
        .onstart(this.BeginMouseInteract.bind(this))
        .ondrag(this.ContinueMouseInteract.bind(this))
        .onfinish(this.EndMouseInteract.bind(this))
        .oncancel(this.EndMouseInteract.bind(this)) // yeah, this is safe
        ;
};


ModelInstance.prototype.BeginMouseInteract = function(data)
{
	var app = data.app;
	
	app.renderer.postRedisplay();
	
	// If this is a selectable instance, then proceed.
	// Else, kill the entire interaction right now.
	if (this.renderState.isSelectable)
		app.SelectInstance(this);
	else
	{
		app.SelectInstance(null);
		data.cancel();
		return;
	}

	// Project the base centroid of the selected model instance
	// This now becomes the 'x, y' screen space point used for
	// picking a location for the object.
	var bc = this.BaseCentroid();
	var projc = app.renderer.ProjectVector(bc);

	this.moveState = {
		moveX: projc[0],
		moveY: projc[1],
		isInteracting: false,
		origFrame: new CoordinateFrame(),
		origRot: this.rotation
	};
	this.moveState.origFrame.FromCoordinateFrame(this.coordFrame);

	// Hide the cursor while moves are happening
	$('#ui').addClass('hideCursor');
};

ModelInstance.prototype.ContinueMouseInteract = function(data)
{
	var app = data.app;
	
	app.renderer.postRedisplay();
	
	// Make the model unpickable, so drag moves don't pick it.
	app.ToggleSuppressPickingOnSelectedInstance(true);

	// Update manipulation state
	this.moveState.moveX += data.dx;
	this.moveState.moveY += data.dy;
	this.moveState.isInteracting = true;

	var intersect = app.PickTriangle(this.moveState.moveX, this.moveState.moveY);
	if (intersect)
	{
		intersect.inst = app.scene.IndexToObject(intersect.modelID);
		var op = this.parent;
		this.UpdateStateFromRayIntersection(intersect);
		app.scene.UpdateModelList();
	}
	
	this.Publish('Moving');
};

ModelInstance.prototype.EndMouseInteract = function(data)
{
	var app = data.app;
	
	app.renderer.postRedisplay();
	
	// Make this model pickable again.
	app.ToggleSuppressPickingOnSelectedInstance(false);

	// Show the cursor again
	$('#ui').removeClass('hideCursor');

	// If we actually did a move, then record it
	// (this will fail to fire when the mouse was simply clicked and released)
	if (this.moveState.isInteracting)
		app.undoStack.pushCurrentState(UndoStack.CMDTYPE.MOVE, this);
		
	delete this.moveState;
		
	this.Publish('StoppedMoving');
};


// Exports
return ModelInstance;

});