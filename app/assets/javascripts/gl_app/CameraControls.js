'use strict'

define([
	'./Constants',
	'jquery',
	'base',
	'gl-matrix'
],
function(Constants){
	
function CameraControls(app)
{
	this.app = app;
	var container = $('#cameraControls');
	
	/** Set up the controls **/
	
	// Main camera button
	container.append(makeCameraButton());
	
	// Control panel
	var controlPanel = $('<div></div>').attr('id', 'cameraControlPanel');
	container.append(controlPanel);
	
	// Orbit control
	controlPanel.append(makeOrbitControl(app));
	
	// Move control
	controlPanel.append(makeMoveControl(app));
	
	// Zoom control
	controlPanel.append(makeZoomControl(app));
	
	// Home button
	controlPanel.append(makeHomeButton(app));
	
	
	// Initially hide the controls
	controlPanel.hide();
}

function NoDrag(event)
{
	event.preventDefault();
}

function makeImageButtonHighlightCorrectly(button, iconURL)
{
	// Change the icon color when the button is active
	button.mousedown(function(event) {
		button.attr('src', iconURL + '_active.png');
		var mouseup = function(event) {
			button.attr('src', iconURL + '_normal.png');
			$(document).unbind('mouseup', mouseup);
		};
		$(document).mouseup(mouseup);	
	});
}

function makeCameraButton()
{
	var iconURL = Constants.resourceDir + 'camera_icons/camera'
	var showTooltip = 'Show camera controls';
	var hideTooltip = 'Hide camera controls';
	var button =  $('<img></img>')
					.attr('src', iconURL + '_normal.png')
					.attr('id', 'cameraButton')
					.attr('title', showTooltip)
					.addClass('cameraControlsButton')
					.bind('dragstart', NoDrag)
					.click(function(event){
						var controlPanel = $('#cameraControlPanel');
						if (controlPanel.is(':visible'))
						{
							controlPanel.hide();
							button.attr('title', showTooltip);
						}
						else
						{
							controlPanel.show();
							button.attr('title', hideTooltip);
						}
					});
	makeImageButtonHighlightCorrectly(button, iconURL);
	return button;
}

function makeOrbitControl(app)
{	
	return makeDpadControl(app, 'orbitControl', Constants.resourceDir + 'camera_icons/orbit.png', 'Orbit camera (Right mouse drag)',
						   {
								'left' : function(event)
								{
									animate(0, -Constants.cameraWidgetOrbitLeftAmt, Constants.cameraWidgetOrbitDuration, quadraticEaseInOutScalarInterpolator,
											function(prevVal, currVal) {
												app.camera.OrbitLeft(currVal-prevVal);
												app.renderer.UpdateView();
											})
								},
								'right' : function(event)
								{
									animate(0, Constants.cameraWidgetOrbitLeftAmt, Constants.cameraWidgetOrbitDuration, quadraticEaseInOutScalarInterpolator,
											function(prevVal, currVal) {
												app.camera.OrbitLeft(currVal-prevVal);
												app.renderer.UpdateView();
											})
								},
								'up' : function(event)
								{
									animate(0, Constants.cameraWidgetOrbitUpAmt, Constants.cameraWidgetOrbitDuration, quadraticEaseInOutScalarInterpolator,
											function(prevVal, currVal) {
												app.camera.OrbitUp(currVal-prevVal);
												app.renderer.UpdateView();
											})
								},
								'down' : function(event)
								{
									animate(0, -Constants.cameraWidgetOrbitUpAmt, Constants.cameraWidgetOrbitDuration, quadraticEaseInOutScalarInterpolator,
											function(prevVal, currVal) {
												app.camera.OrbitUp(currVal-prevVal);
												app.renderer.UpdateView();
											})
								}
						   });
}

function makeMoveControl(app)
{
	return makeDpadControl(app, 'moveControl', Constants.resourceDir + 'camera_icons/move.png', 'Dolly camera (Middle mouse drag)',
						   {
								'left' : function(event)
								{
									animate(0, Constants.cameraWidgetDollyAmt, Constants.cameraWidgetDollyDuration, quadraticEaseInOutScalarInterpolator,
											function(prevVal, currVal) {
												app.camera.DollyLeft(currVal-prevVal);
												app.renderer.UpdateView();
											})
								},
								'right' : function(event)
								{
									animate(0, -Constants.cameraWidgetDollyAmt, Constants.cameraWidgetDollyDuration, quadraticEaseInOutScalarInterpolator,
											function(prevVal, currVal) {
												app.camera.DollyLeft(currVal-prevVal);
												app.renderer.UpdateView();
											})
								},
								'up' : function(event)
								{
									animate(0, Constants.cameraWidgetDollyAmt, Constants.cameraWidgetDollyDuration, quadraticEaseInOutScalarInterpolator,
											function(prevVal, currVal) {
												app.camera.DollyUp(currVal-prevVal);
												app.renderer.UpdateView();
											})
								},
								'down' : function(event)
								{
									animate(0, -Constants.cameraWidgetDollyAmt, Constants.cameraWidgetDollyDuration, quadraticEaseInOutScalarInterpolator,
											function(prevVal, currVal) {
												app.camera.DollyUp(currVal-prevVal);
												app.renderer.UpdateView();
											})
								}
						   });
}

function makeDpadControl(app, id, iconUrl, tooltip, callbacks)
{
	var container = $('<div></div>')
					.attr('id', id)
					.addClass('dpadContainer');
	
	// Icon
	container.append(
		$('<div></div>')
		.addClass('dpadIconHolder')
		.append(
			$('<img></img>')
			.attr('src', iconUrl)
			.attr('id', id+'Icon')
			.attr('title', tooltip)
			.addClass('dpadIcon')
			.bind('dragstart', NoDrag)
		)
	);
	
	// Left button
	container.append(
		$('<div>\u25C4</div>')
		.attr('id', id+'LeftButton')
		.addClass('cameraControlsButton')
		.addClass('dpadButton')
		.addClass('dpadLeftButton')
		.click(callbacks && callbacks.left)
	);
	
	// Right button
	container.append(
		$('<div>\u25BA</div>')
		.attr('id', id+'RightButton')
		.addClass('cameraControlsButton')
		.addClass('dpadButton')
		.addClass('dpadRightButton')
		.click(callbacks && callbacks.right)
	);
	
	// Up button
	container.append(
		$('<div>\u25B2</div>')
		.attr('id', id+'UpButton')
		.addClass('cameraControlsButton')
		.addClass('dpadButton')
		.addClass('dpadUpButton')
		.click(callbacks && callbacks.up)
	);
	
	// Down button
	container.append(
		$('<div>\u25BC</div>')
		.attr('id', id+'DownButton')
		.addClass('cameraControlsButton')
		.addClass('dpadButton')
		.addClass('dpadDownButton')
		.click(callbacks && callbacks.down)
	);
	
	return container;
}

function makeZoomControl(app)
{
	var container = $('<div></div>').attr('id', 'zoomControl');
	
	// Icon
	container.append(
		$('<div></div>')
		.addClass('zoomIconHolder')
		.append(
			$('<img></img>')
			.attr('src', Constants.resourceDir + 'camera_icons/zoom.png')
			.attr('id', 'zoomIcon')
			.attr('title', 'Zoom camera (Mouse wheel)')
			.bind('dragstart', NoDrag)
		)
	);
	
	// Minus button
	container.append(
		$('<div>-</div>')
		.attr('id', 'zoomMinusButton')
		.addClass('cameraControlsButton')
		.addClass('zoomButton')
		.click(function(event) {
			animate(0, -Constants.cameraWidgetZoomAmt, Constants.cameraWidgetZoomDuration, quadraticEaseInOutScalarInterpolator,
					function(prevVal, currVal) {
						app.camera.Zoom(currVal-prevVal);
						app.renderer.UpdateView();
					})
		})
	);
	
	// Plus button
	container.append(
		$('<div>+</div>')
		.attr('id', 'zoomPlusButton')
		.addClass('cameraControlsButton')
		.addClass('zoomButton')
		.click(function(event) {
			animate(0, Constants.cameraWidgetZoomAmt, Constants.cameraWidgetZoomDuration, quadraticEaseInOutScalarInterpolator,
					function(prevVal, currVal) {
						app.camera.Zoom(currVal-prevVal);
						app.renderer.UpdateView();
					})
		})
	);
	
	return container;
}

function makeHomeButton(app)
{
	var iconURL = Constants.resourceDir + 'camera_icons/home';
	var button =  $('<img></img>')
				.attr('src', iconURL + '_normal.png')
				.attr('id', 'homeButton')
				.attr('title', 'Reset camera')
				.addClass('cameraControlsButton')
				.bind('dragstart', NoDrag)
				.click(function(event) {
					//app.camera.ResetSavedState();
					//app.renderer.UpdateView();
					animate(app.camera.State(), app.camera.savedState, Constants.cameraWidgetResetDuration, quadraticEaseInOutCameraStateInterpolator,
						function(prevVal, currVal) {
							app.camera.ResetFromPitchYaw(currVal.eyePos, currVal.lookAtPoint, currVal.pitch, currVal.yaw);
							app.renderer.UpdateView();
						})
				});
	makeImageButtonHighlightCorrectly(button, iconURL);
	return button;
}

/**
 * startVal: value to start the animation at
 * endVal: value to end the animation at
 * duration: how long (in milliseconds) the animation should last
 * interpolator: function(start, end, t) that interpolates the start and end
 *    values given a percentage of duration elapsed thus far
 * valueHandler: function(prevVal, currVal) that processes the difference in value
 *    that accumulates over a time step. This function generates the state
 *    changes that cause visual changes (i.e. changing camera state)
 **/
function animate(startVal, endVal, duration, interpolator, valueHandler)
{
	var startTime = Date.now();
	var prevVal = interpolator(0, startVal, endVal);
	
	function animStep()
	{
		var currTime = Date.now();
		var t = (currTime - startTime) / duration;
		var last = t > 1;
		if (last)
			t = 1;
		var currVal = interpolator(t, startVal, endVal);
		valueHandler(prevVal, currVal);
		prevVal = currVal;
		if (!last)
			window.requestAnimFrame(animStep);
	}
	
	window.requestAnimFrame(animStep);
}

// Adapted from http://gizma.com/easing/
function quadraticEaseInOutScalarInterpolator(t, start, end)
{
	var b = start;
	var c = end - start;
	var d = 1.0;
	t /= d/2;
	if (t < 1) return c/2*t*t + b;
	t--;
	return -c/2 * (t*(t-2) - 1) + b;
};

function quadraticEaseInOutVec3Interpolator(t, start, end)
{
	var b = start;
	var c = vec3.create(); vec3.subtract(end, start, c);
	var d = 1.0;
	t /= d/2;
	var tmp = vec3.create();
	if (t < 1)
	{
		vec3.scale(c, t*t/2, tmp);
		vec3.add(tmp, b, tmp);
	}
	else
	{
		t--;
		vec3.scale(c, -(t*(t-2) - 1)/2, tmp);
		vec3.add(tmp, b, tmp);
	}
	return tmp;
}

function quadraticEaseInOutCameraStateInterpolator(t, start, end)
{
	var result = {};
	result.eyePos = quadraticEaseInOutVec3Interpolator(t, start.eyePos, end.eyePos);
	result.lookAtPoint = quadraticEaseInOutVec3Interpolator(t, start.lookAtPoint, end.lookAtPoint);
	result.pitch = quadraticEaseInOutScalarInterpolator(t, start.pitch, end.pitch);
	result.yaw = quadraticEaseInOutScalarInterpolator(t, start.yaw, end.yaw);
	return result;
}


// Exports
return CameraControls;
	
});