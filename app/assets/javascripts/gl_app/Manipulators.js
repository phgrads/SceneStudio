'use strict';

define([
	'./Constants',
	'./Mesh',
	'./Material',
	'./Model',
	'./UndoStack',
	'./fsm',
	'./uibehaviors',
	'gl-matrix',
	'./gl-matrix-ext',
	'jquery'
],
function(Constants, Mesh, Material, Model, UndoStack, FSM, Behaviors){

////  Manipulator base class ////


function Manipulator()
{
	this.model = null;
	
	// Transform stuff
	this.transform = mat4.identity(mat4.create());
	this.normalTransform = mat3.identity(mat3.create());
	this.ownerInstance = null;
	
	// Tooltip
	this.tooltipText = 'tooltip';
	this.tooltipTimer = null;
	this.tooltip = null;
	
	this.CreateFocusListener()
        .onhover(this.Hover.bind(this))
        .ondefocus(this.KillTooltip.bind(this))
        .onstart(this.KillTooltip.bind(this))
        ;
}


function drawRefreshShim(fsm, params, next) {
	params.app.renderer.postRedisplay();
	next(fsm, params);
}

// extension of mouse dragging behavior
var manipulator_template = FSM.template()
    .output('start', 'drag', 'finish', 'cancel',
            'focus', 'defocus', 'hover')
    .state('normal')
        .step('focus', 'focused', 'focus')
            .shim('focus', drawRefreshShim)
    .state('focused')
        .step('defocus', 'normal', 'defocus')
            .shim('defocus', drawRefreshShim)
        .step('mousemove', 'focused', 'hover')
        .step('mousedown', function(fsm, params) {
            params.lockFocus();
            params.cancel = function() {
                    fsm.jump('focused');
                    params.unlockFocus();
                };
            fsm.jump('locked', 'start', params);
        })
        .shim(['defocus', 'mousemove', 'mousedown'], drawRefreshShim)
    .state('locked')
        .step('mousemove', 'locked', 'drag')
        .step('mouseup', function(fsm, params) {
            fsm.jump('focused', 'finish', params);
            // Unlock must come last; it may trigger a defocus...
            params.unlockFocus();
        })
        // never need to unlock on defocus
        .step('defocus', 'normal', ['cancel', 'defocus'])
        .shim(['defocus', 'mousemove', 'mouseup'], drawRefreshShim)
    ;

Manipulator.prototype.CreateFocusListener = function()
{
    this.focus_listener = Behaviors.createFilter('left','')
        .output('mousedown', 'mouseup', 'mousemove',
                'focus', 'defocus'); // ensure filter passes along (de)focus
    this.fsm = manipulator_template.compile().listen(this.focus_listener);
    this.fsm.getState = function() { return fsm.curr_state; };
    
    return this.fsm;
};


Manipulator.prototype.Attach = function(mInst)
{
	this.ownerInstance = mInst;
}

Manipulator.prototype.Detach = function()
{
	this.ownerInstance = null;
}

Manipulator.prototype.UpdateTransform = function()
{
	if (!this.ownerInstance)
	{
		return;
	}
	
	mat4.identity(this.transform);
	this.ownerInstance.SecondTransform(this.transform, false);
	
	// Small extra offset along surface normal to prevent z-fighting
	// with any flat objects that the manipulator overlays
	var m = mat4.identity(mat4.create());
	var offset = vec3.create(this.ownerInstance.coordFrame.w);
	vec3.scale(offset, Constants.manipExtraZoffset);
    mat4.translate(m, offset);
    mat4.multiply(m, this.transform, this.transform);
	
	// Update normal transform
	mat4.toRotationMat(this.transform, this.normalTransform);
}

Manipulator.prototype.CommonDrawSetup = function(renderer)
{
	var gl = renderer.gl_;
	
	mat4.multiply(renderer.viewProj_, this.transform, renderer.mvp_);
    gl.uniformMatrix4fv(renderer.activeProgram_.uniformLocs.u_mvp, false, renderer.mvp_);
}

Manipulator.prototype.Draw = function(renderer)
{
	if (this.ownerInstance && this.ownerInstance.renderState.isPickable)
	{
		var gl = renderer.gl_;
		this.CommonDrawSetup(renderer);
		this.model.Draw(renderer);
	}
}

Manipulator.prototype.Pick = function(renderer, manipID)
{
	if (this.ownerInstance && this.ownerInstance.renderState.isPickable)
	{
		this.CommonDrawSetup(renderer);
		this.model.Pick(renderer, manipID);
	}
}

Manipulator.prototype.SpawnTooltip = function(data)
{
	this.tooltip = $('<span class="tooltip">' + this.tooltipText + '</span>');
	$('#graphicsArea').append(this.tooltip);
	this.MoveTooltip(data);
}

Manipulator.prototype.MoveTooltip = function(data)
{
	this.tooltip.offset({left: data.x, top: data.y + Constants.toolTipYOffset});
}

Manipulator.prototype.KillTooltip = function(data)
{
	if (this.tooltipTimer)
	{
		clearTimeout(this.tooltipTimer);
		this.tooltipTimer = null;
	}
	$('.tooltip').remove();
	this.tooltip = null;
}

Manipulator.prototype.Hover = function(data)
{
	// If we don't already have a tooltip active, start the timer for one
	if (!this.tooltip)
	{
		this.KillTooltip(data);
		this.tooltipTimer = setTimeout(
            this.SpawnTooltip.partial(data).bind(this),
            Constants.toolTipDelay
        );
	}
}

// This is useful for lots of manipulator interactions
Manipulator.prototype.PickPlane = function(data)
{
	var cf = this.ownerInstance.coordFrame;
	var pp = this.ownerInstance.parentPos;
	var pn = cf.w;
	return data.app.renderer.picker.PickPlane(data.x, data.y, pp, pn, data.app.camera, data.app.renderer);
}


//// Rotation Manipulator ////

function RotationManipulator(gl)
{
	// EXTEND: call Manipulator constructor
	Manipulator.call(this);
	
	this.gl = gl;
	
	// Colors and materials
	this.mainMaterial =
	   new Material.ManipulatorMaterial(gl,
	                   {color: Constants.rotateNormalColor});
	this.notchMaterial =
	   new Material.ManipulatorMaterial(gl,
	                   {color: Constants.rotateNotchNormalColor});
	
	// Manipulation state
	this.prevVector = vec3.create();
	this.currVector = vec3.create();
	
	// Tooltip
	this.tooltipText = 'Rotate (Left/Right arrow keys)';
	
	// Focus Listener
	this.ConfigureFocusListener();
}

// EXTEND: inherit Manipulator prototype
RotationManipulator.prototype = Object.create(Manipulator.prototype);


RotationManipulator.prototype.ConfigureFocusListener = function()
{
    this.fsm
        .onstate_normal(function() {
          this.mainMaterial.UpdateColor(Constants.rotateNormalColor);
          this.notchMaterial.UpdateColor(Constants.rotateNotchNormalColor);
        }.bind(this))
        .onstate_focused(function() {
          this.mainMaterial.UpdateColor(Constants.rotateHighlightColor);
          this.notchMaterial.UpdateColor(Constants.rotateNotchHighlightColor);
        }.bind(this))
        .onstate_locked(function() {
          this.mainMaterial.UpdateColor(Constants.rotateActiveColor);
          this.notchMaterial.UpdateColor(Constants.rotateNotchActiveColor);
        }.bind(this))
        
        .onstart(function(data) {
            this.KillTooltip(data);
            this.BeginMouseInteract(data);
        }.bind(this))
        .ondrag(this.ContinueMouseInteract.bind(this))
        .onfinish(this.EndMouseInteract.bind(this))
        .oncancel(this.EndMouseInteract.bind(this))
        ;
}


RotationManipulator.prototype.RegenGeometry = function(newRi)
{
	var ri = newRi;
	var ro = newRi + Math.max(Constants.rotateMinThickness, Constants.rotateRelativeThickness*newRi);
	
	var components = [];
	
	// Generate the main dic mesh
	components.push({mesh: Mesh.GenerateDisc(this.gl, ri, ro, Constants.rotateSlices), material: this.mainMaterial, attribs: {bothFaces: true}});
	
	// Generate the notch meshes
	var n0 = 0;
	var n1 = 0.5 * Math.PI;
	var n2 = Math.PI;
	var n3 = 1.5 * Math.PI
	var hw = 0.5 * Constants.rotateNotchWidth;
	var slices = Constants.rotateNotchSlices;
	var zoff = Constants.rotateNotchExtraOffset;
	components.push({mesh: Mesh.GenerateDisc(this.gl, ri, ro, slices, zoff, n0-hw, n0+hw), material: this.notchMaterial});
	components.push({mesh: Mesh.GenerateDisc(this.gl, ri, ro, slices, zoff, n1-hw, n1+hw), material: this.notchMaterial});
	components.push({mesh: Mesh.GenerateDisc(this.gl, ri, ro, slices, zoff, n2-hw, n2+hw), material: this.notchMaterial});
	components.push({mesh: Mesh.GenerateDisc(this.gl, ri, ro, slices, zoff, n3-hw, n3+hw), material: this.notchMaterial});
	
	// Finalize the model
	this.model = new Model("RotationManipulator", components);
}

RotationManipulator.prototype.Attach = function(mInst)
{
	Manipulator.prototype.Attach.call(this, mInst);
	
	this.RegenGeometry(mInst.ProjectedBoundingRadius());
	this.UpdateTransform();
	mInst.Subscribe('Moved', this, this.UpdateTransform);
	var regenfunc = function() {
		this.RegenGeometry(this.ownerInstance.ProjectedBoundingRadius());
	};
	mInst.Subscribe('Scaled', this, regenfunc);
	mInst.Subscribe('Tumbled', this, regenfunc);
}

RotationManipulator.prototype.Detach = function()
{
	this.ownerInstance.Unsubscribe('Moved', this);
	this.ownerInstance.Unsubscribe('Scaled', this);
	this.ownerInstance.Unsubscribe('Tumbled', this);
	
	Manipulator.prototype.Detach.call(this);
}

RotationManipulator.prototype.BeginMouseInteract = function(data)
{
	var isect = this.PickPlane(data);
	vec3.subtract(isect.position, this.ownerInstance.parentPos, this.prevVector);
	
	this.actualAbsoluteAng = this.ownerInstance.rotation;
	this.snappedAbsoluteAng = this.ownerInstance.rotation;
}

RotationManipulator.prototype.ContinueMouseInteract = function(data)
{
	var cf = this.ownerInstance.coordFrame;
	
	var isect = this.PickPlane(data);
	vec3.subtract(isect.position, this.ownerInstance.parentPos, this.currVector);
	var ang = vec3.signedAngleBetween(this.prevVector, this.currVector, cf.w);
	this.actualAbsoluteAng += ang;
	this.SnapAbsoluteAng();
	ang = this.AbsoluteAngToRelativeAng(this.snappedAbsoluteAng);
	this.ownerInstance.CascadingRotate(ang);
	
	vec3.set(this.currVector, this.prevVector);
}

RotationManipulator.prototype.EndMouseInteract = function(data)
{
    data.app.undoStack.pushCurrentState(UndoStack.CMDTYPE.ROTATE,
                                        this.ownerInstance);
}

RotationManipulator.prototype.SnapAbsoluteAng = function()
{
	var HALFPI = Math.PI * 0.5;
	var rotmod = this.actualAbsoluteAng % HALFPI;
	var hw = Constants.rotateSnapHalfWidth;
	if (rotmod > 0 && rotmod < hw)
		this.snappedAbsoluteAng = this.actualAbsoluteAng - rotmod;
	else if (rotmod <= 0 && rotmod > -hw)
		this.snappedAbsoluteAng = this.actualAbsoluteAng - rotmod;
	else if (rotmod > 0 && rotmod > HALFPI - hw)
		this.snappedAbsoluteAng = this.actualAbsoluteAng + HALFPI-rotmod;
	else if (rotmod <= 0 && rotmod < -HALFPI + hw)
		this.snappedAbsoluteAng = this.actualAbsoluteAng + -HALFPI-rotmod;
	
	else this.snappedAbsoluteAng = this.actualAbsoluteAng;
}

RotationManipulator.prototype.AbsoluteAngToRelativeAng = function(absAng)
{
	return absAng - this.ownerInstance.rotation;
}





//// Scale Manipulator ////


function ScaleManipulator(gl)
{
	// EXTEND: call Manipulator constructor
	Manipulator.call(this);
	
	this.gl = gl;
	
	// Colors and materials
	this.material = new Material.ManipulatorMaterial(gl, {color: Constants.scaleNormalColor});
	
	// Manipulation state
	this.prevVector = vec3.create();
	this.currVector = vec3.create();
	
	// Tooltip
	this.tooltipText = 'Scale (Up/Down arrow keys)';
	
	// Focus Listener
	this.ConfigureFocusListener();
}

// EXTEND: inherit Manipulator prototype
ScaleManipulator.prototype = Object.create(Manipulator.prototype);


ScaleManipulator.prototype.ConfigureFocusListener = function()
{
    this.fsm
        .onstate_normal(function() {
            this.material.UpdateColor(Constants.scaleNormalColor);
        }.bind(this))
        .onstate_focused(function() {
            this.material.UpdateColor(Constants.scaleHighlightColor);
        }.bind(this))
        .onstate_locked(function() {
            this.material.UpdateColor(Constants.scaleActiveColor);
        }.bind(this))
        
        .onstart(function(data) {
            this.KillTooltip(data);
            this.BeginMouseInteract(data);
        }.bind(this))
        .ondrag(this.ContinueMouseInteract.bind(this))
        .onfinish(this.EndMouseInteract.bind(this))
        .oncancel(this.EndMouseInteract.bind(this))
        ;
}


ScaleManipulator.prototype.RegenGeometry = function(newR)
{
	var r = newR + Math.max(Constants.scaleMinRadiusBoost, Constants.scaleRelativeRadiusBoost*newR);
	
	var components = [];
	
	// Generate each of the four corner meshes
	var c0 = 0.25 * Math.PI;
	var c1 = 0.75 * Math.PI;
	var c2 = 1.25 * Math.PI;
	var c3 = 1.75 * Math.PI
	var hw = 0.5 * Constants.scaleWidth;
	var slices = Constants.scaleSlices;
	var attr = {bothFaces: true};
	components.push({mesh: Mesh.GenerateCircularSquareSlice(this.gl, r, slices, c0-hw, c0+hw), material: this.material, attribs: attr});
	components.push({mesh: Mesh.GenerateCircularSquareSlice(this.gl, r, slices, c1-hw, c1+hw), material: this.material, attribs: attr});
	components.push({mesh: Mesh.GenerateCircularSquareSlice(this.gl, r, slices, c2-hw, c2+hw), material: this.material, attribs: attr});
	components.push({mesh: Mesh.GenerateCircularSquareSlice(this.gl, r, slices, c3-hw, c3+hw), material: this.material, attribs: attr});
	
	// Finalize the model
	this.model = new Model("ScaleManipulator", components);
}

ScaleManipulator.prototype.Attach = function(mInst)
{
	Manipulator.prototype.Attach.call(this, mInst);
	
	this.RegenGeometry(mInst.ProjectedBoundingRadius());
	this.UpdateTransform();
	mInst.Subscribe('Moved', this, this.UpdateTransform);
	var regenfunc = function() {
		this.RegenGeometry(this.ownerInstance.ProjectedBoundingRadius());
	};
	mInst.Subscribe('Scaled', this, regenfunc);
	mInst.Subscribe('Tumbled', this, regenfunc);
}

ScaleManipulator.prototype.Detach = function()
{
	this.ownerInstance.Unsubscribe('Moved', this);
	this.ownerInstance.Unsubscribe('Scaled', this);
	this.ownerInstance.Unsubscribe('Tumbled', this);
	
	Manipulator.prototype.Detach.call(this);
}

ScaleManipulator.prototype.BeginMouseInteract = function(data)
{
	var isect = this.PickPlane(data);
	vec3.subtract(isect.position, this.ownerInstance.parentPos, this.prevVector);
}

ScaleManipulator.prototype.ContinueMouseInteract = function(data)
{
	var isect = this.PickPlane(data);
	vec3.subtract(isect.position, this.ownerInstance.parentPos, this.currVector);
	
	var ldiff = vec3.length(this.currVector) / vec3.length(this.prevVector);
	this.ownerInstance.CascadingScale(ldiff * Constants.scaleMagnitudeMultiplier);

	vec3.set(this.currVector, this.prevVector);
}

ScaleManipulator.prototype.EndMouseInteract = function(data)
{
    data.app.undoStack.pushCurrentState(UndoStack.CMDTYPE.SCALE,
                                        this.ownerInstance);
}


// Exports
return {
	RotationManipulator: RotationManipulator,
	ScaleManipulator: ScaleManipulator
};

});