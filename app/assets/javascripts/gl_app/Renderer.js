'use strict';

define([
	'./Constants',
	'./Shader',
	'./Program',
	'./Mesh',
	'./Picker',
	'gl-matrix',
	'./gl-matrix-ext',
	'jquery',
	'jquery.debouncedresize'
],
function(Constants, Shader, Program, Mesh, Picker){

function createContextFromCanvas(canvas) {
    var context = canvas.getContext('experimental-webgl', {preserveDrawingBuffer: true});

    // Rudimentary WebGL compliance checking. TODO: Implement as part of notification system
    if (!context) document.body.innerHTML = [
      'Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />',
      'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'
    ].join( '\n' );

    // Automatically use debug wrapper context, if available.
    return typeof WebGLDebugUtils !== 'undefined' ?
    WebGLDebugUtils.makeDebugContext(context, function(err, funcName) {
      throw WebGLDebugUtils.glEnumToString(err) + " by " + funcName;
    }) : context;
}

function Renderer(canvas, scene, viewportsize, camera) {
  this.canvas_ = canvas;

  var gl = createContextFromCanvas(canvas);
  this.gl_ = gl;

  // Camera.
  this.zNear_ = Constants.zNear;
  this.zFar_ = Constants.zFar;
  this.fovy_ = Constants.fovy;
  this.view_ = mat4.identity(mat4.create());
  this.viewProj_ = mat4.identity(mat4.create());
  this.proj_ = mat4.create();
  this.projInv_ = mat4.create();
  this.mvp_ = mat4.create();

  // Resize.
  this.maxWidth = 20480;
  this.maxHeight = 20480;
  this.scaleX = 1.0;
  this.scaleY = 1.0;
  $(window).on('resize', this.resize.bind(this));
  $(window).on('debouncedresize', this.resizeEnd.bind(this));

  // WebGL
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  
  // Shaders
  this.programModel_ = new Program(gl, [Shader.vertexShader(gl, Constants.modelVertShaderSource),
										 Shader.fragmentShader(gl, Constants.modelFragShaderSource)]);
  this.programConstant_ = new Program(gl, [Shader.vertexShader(gl, Constants.constantVertShaderSource),
										 Shader.fragmentShader(gl, Constants.constantFragShaderSource)]);
  this.programPick_ = new Program(gl, [Shader.vertexShader(gl, Constants.pickVertShaderSource),
										 Shader.fragmentShader(gl, Constants.pickFragShaderSource)]);
  
  // Scene and Camera
  this.scene = scene;
  this.camera = camera;
  
  // Picker
  this.picker = new Picker(gl);
  
  this.setViewport_(viewportsize);
  
  this.optStack = [{}];
}

Renderer.prototype.Options = function()
{
	return this.optStack[this.optStack.length-1];
};

Renderer.prototype.PushOptions = function()
{
	var newopts = {};
	$.extend(newopts, this.Options());
	this.optStack.push(newopts);
};

Renderer.prototype.PopOptions = function()
{
	this.optStack.pop();
};

Renderer.prototype.UnprojectVector = function(vector)
{
  var viewport = [0, 0, this.canvas_.clientWidth, this.canvas_.clientHeight];
  var result = vec3.create();
  vec3.unproject(vector, this.view_, this.proj_, viewport, result);
  return result;
};

Renderer.prototype.ProjectVector = function(vector)
{
	var v = new Float32Array([vector[0], vector[1], vector[2], 1.0]);
	mat4.multiplyVec4(this.viewProj_, v);
	
	// Dehomogenize
	v[0] /= v[3];
	v[1] /= v[3];
	
	// Convert to [0,1]
	v[0] = (v[0] + 1) / 2;
	v[1] = (v[1] + 1) / 2;
	
	// Convert to screen space
	v[0] *= this.canvas_.clientWidth;
	v[1] *= this.canvas_.clientHeight;
	
	// Flip y coordinate, deal with position of canvas
	var ystart = this.canvas_.getBoundingClientRect().top;
	v[1] = this.canvas_.clientHeight - v[1] + ystart;
	
	return vec2.create([v[0], v[1]]);
};

Renderer.prototype.setViewport_ = function (viewportsize)
{
  /*
  modified function to allow switching between optimization and canvas viewports
  */
  if(viewportsize) {
    this.gl_.viewport(0, 0, viewportsize.width, viewportsize.height);
  }
  else {
    var canvas = this.canvas_;
    var newWidth = Math.round(this.scaleX * canvas.clientWidth);
    var newHeight = Math.round(this.scaleY * canvas.clientHeight);
    newWidth = clamp(newWidth, 1, this.maxWidth);
    newHeight = clamp(newHeight, 1, this.maxHeight);
    this.gl_.viewport(0, 0, newWidth, newHeight);

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;

     // this.gl_.viewport(0, 0, newWidth, newHeight);
    }
  }
};

Renderer.prototype.commonDrawSetup = function() {
  var gl = this.gl_;
  var canvas = this.canvas_;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  var aspectRatio = canvas.clientWidth/canvas.clientHeight;
  mat4.perspective(this.fovy_, aspectRatio, this.zNear_, this.zFar_, this.proj_);
  
  mat4.multiply(this.proj_, this.view_, this.viewProj_);
};

Renderer.prototype.bindModelProgram = function()
{
	this.programModel_.use();
	this.programModel_.enableVertexAttribArrays(Mesh.DEFAULT_VERTEX_FORMAT);
	this.activeProgram_ = this.programModel_;
};

Renderer.prototype.bindConstantProgram = function()
{
	this.programConstant_.use();
	this.programConstant_.enableVertexAttribArrays(Mesh.POSITION_ONLY_VERTEX_FORMAT);
	this.activeProgram_ = this.programConstant_;
};

Renderer.prototype.bindPickingProgram = function()
{
	this.programPick_.use();
	this.programPick_.enableVertexAttribArrays(Mesh.POSITION_ONLY_VERTEX_FORMAT);
	this.activeProgram_ = this.programPick_;
};

Renderer.prototype.normalDrawPass = function()
{
	this.commonDrawSetup();
	this.scene.Draw(this);
};

Renderer.prototype.pickingDrawPass = function()
{  
	this.picker.PrepareForPicking();
	this.commonDrawSetup();
	this.scene.Pick(this);
	this.picker.CleanupAfterPicking();
};

Renderer.prototype.areaPickingDrawPass = function()
{
  this.commonDrawSetup();
  this.scene.Pick(this);
};

Renderer.prototype.resize = function(event)
{
	if (event && event.target !== window) return;
	
	this.setViewport_();
	this.postRedisplay();
};

Renderer.prototype.resizeEnd = function(event)
{
	if (event && event.target !== window) return;

	this.resize();
	var canvas = this.canvas_;
	this.picker.HandleResize(canvas.clientWidth, canvas.clientHeight);
};

Renderer.prototype.postRedisplay = function() {
  var self = this;
  if (!this.frameStart_) {
    this.frameStart_ = Date.now();
    window.requestAnimFrame(function() { 
      self.normalDrawPass();
      self.pickingDrawPass();
      self.frameStart_ = 0;
    }, this.canvas_);
  }
};

Renderer.prototype.UpdateView = function() {
    this.view_ = this.camera.LookAtMatrix();
    mat4.multiply(this.proj_, this.view_, this.viewProj_);
    this.postRedisplay();
};

// Exports
return Renderer;

});
