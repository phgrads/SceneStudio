'use strict';

define([
	'base'
],
function(){

var Constants = {};

// Asset directories
Constants.base_url= window.globalViewData.base_url;
Constants.modelDir= Constants.base_url + '/data/model/';
Constants.geomDir= Constants.base_url + '/data/geometry/';
Constants.textureDir = Constants.base_url + '/data/texture/';
Constants.imageDir = Constants.base_url + '/data/image/';
Constants.resourceDir = Constants.base_url + '/assets/';

// Shader locations
Constants.modelVertShaderSource = id('model.vert').text;
Constants.modelFragShaderSource = id('model.frag').text;
Constants.constantVertShaderSource = id('constant.vert').text;
Constants.constantFragShaderSource = id('constant.frag').text;
Constants.pickVertShaderSource = id('picking.vert').text;
Constants.pickFragShaderSource = id('picking.frag').text;

// Camera speed multipliers
Constants.cameraDollySpeed = 0.15;
Constants.cameraOrbitSpeed = 0.0025;
Constants.cameraZoomSpeed = 0.08;

// Camera widget settings
Constants.cameraWidgetOrbitLeftAmt = Math.PI / 8;
Constants.cameraWidgetOrbitUpAmt = Math.PI / 12;
Constants.cameraWidgetDollyAmt = 20;
Constants.cameraWidgetZoomAmt = 30;
Constants.cameraWidgetOrbitDuration = 250;
Constants.cameraWidgetDollyDuration = 250;
Constants.cameraWidgetZoomDuration = 250;
Constants.cameraWidgetResetDuration = 750;

// Perspective settings
Constants.fovy = 60.0;
Constants.zNear = 2.0;
Constants.zFar = 750;

// Transform settings
Constants.transformZoffset = 0.1;

// Object appearance modifiers
Constants.insertingObjectAlpha = 0.75;
Constants.selectedObjectOutlineColor = new Float32Array([79/255, 133/255, 187/255, 1]);

// Split view resizability
Constants.searchAreaMinWidth = 300;
Constants.searchAreaMaxWidth = 750;
Constants.searchAreaResizeGrid = 230;

// Manipulators
Constants.manipExtraZoffset = 0.05;
Constants.rotateNotchExtraOffset = 0.03;
Constants.rotateNotchWidth = 4.0 * (Math.PI/180);
Constants.rotateSnapHalfWidth = 6.0 * (Math.PI/180);
Constants.rotateSlices = 60;
Constants.rotateNotchSlices = 4;
Constants.rotateRelativeThickness = 0.2;
Constants.rotateMinThickness = 4.0;
Constants.rotateNormalColor = new Float32Array([79/255, 133/255, 187/255, 0.75]);
Constants.rotateHighlightColor = new Float32Array([99/255, 153/255, 207/255, 0.95]);
Constants.rotateActiveColor = new Float32Array([59/255, 113/255, 167/255, 0.95]);
Constants.rotateNotchNormalColor = new Float32Array([19/255, 73/255, 127/255, 0.75]);
Constants.rotateNotchHighlightColor = new Float32Array([19/255, 73/255, 127/255, 0.95]);
Constants.rotateNotchActiveColor = new Float32Array([19/255, 73/255, 127/255, 0.95]);
Constants.scaleNormalColor = new Float32Array([219/255, 139/255, 66/255, 0.75]);
Constants.scaleHighlightColor = new Float32Array([239/255, 159/255, 86/255, 0.95]);
Constants.scaleActiveColor = new Float32Array([199/255, 119/255, 46/255, 0.95]);
Constants.scaleSlices = 8;
Constants.scaleWidth = 45.0 * (Math.PI/180);
Constants.scaleMinRadiusBoost = 5.0;
Constants.scaleRelativeRadiusBoost = 0.25;
Constants.scaleMagnitudeMultiplier = 1;

// Camera visualization
Constants.cameraMarkerDefaultSize = 1.0;
Constants.cameraMarkerDefaultColor = new Float32Array([79/255, 133/255, 187/255, 1]);

// Tooltips
Constants.toolTipDelay = 450;
Constants.toolTipYOffset = 25;

// Keyboard manipulation
Constants.keyboardRotationIncrementUnmodified = Math.PI / 8.0;
Constants.keyboardScaleFactorUnmodified = 1.1;

// Asset cache settings
Constants.modelCacheMaxSize = 20;
Constants.textureCacheMaxSize = 20;

// Undo stack settings
Constants.undoStackMaxSize = 100;

// Exports
return Constants;

});
