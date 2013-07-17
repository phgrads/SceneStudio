'use strict';

define(function(){

function Program(gl, shaders) {
  this.gl_ = gl;
  this.handle_ = gl.createProgram();
  shaders.forEach(function(shader) {
    gl.attachShader(this.handle_, shader.handle_);
  }, this);
  gl.linkProgram(this.handle_);
  if (!gl.getProgramParameter(this.handle_, gl.LINK_STATUS)) {
    throw this.info();
  }
  
  // TODO: turn these into properties.
  var numActiveAttribs = gl.getProgramParameter(this.handle_,
                                                gl.ACTIVE_ATTRIBUTES);
  this.attribs = [];
  this.attribLocs = {};
  for (var i = 0; i < numActiveAttribs; i++) {
    var active_attrib = gl.getActiveAttrib(this.handle_, i);
    var loc = gl.getAttribLocation(this.handle_, active_attrib.name);
    this.attribs[loc] = active_attrib;
    this.attribLocs[active_attrib.name] = loc;
  }
  
  var numActiveUniforms = gl.getProgramParameter(this.handle_,
                                                 gl.ACTIVE_UNIFORMS);
  this.uniforms = [];
  this.uniformLocs = {};
  for (var j = 0; j < numActiveUniforms; j++) {
    var active_uniform = gl.getActiveUniform(this.handle_, j);
    this.uniforms[j] = active_uniform;
    this.uniformLocs[active_uniform.name] = gl.getUniformLocation(
      this.handle_, active_uniform.name);
  }
};

Program.prototype.info = function() {
  return this.gl_.getProgramInfoLog(this.handle_);
};

Program.prototype.use = function() {
  this.gl_.useProgram(this.handle_);
};

Program.prototype.enableVertexAttribArrays = function(vertexFormat) {
  var numAttribs = vertexFormat.length;
  for (var i = 0; i < numAttribs; ++i) {
    var attrib = vertexFormat[i];
    var loc = this.attribLocs[attrib.name];
    if (loc !== undefined) {
      this.gl_.enableVertexAttribArray(loc);
    }
  }
};

Program.prototype.disableVertexAttribArrays = function(vertexFormat) {
  var numAttribs = vertexFormat.length;
  for (var i = 0; i < numAttribs; ++i) {
    var attrib = vertexFormat[i];
    var loc = this.attribLocs[attrib.name];
    if (loc !== undefined) {
      this.gl_.disableVertexAttribArray(loc);
    }
  }
};

Program.prototype.vertexAttribPointers = function(vertexFormat) {
  var numAttribs = vertexFormat.length;
  for (var i = 0; i < numAttribs; ++i) {
    var attrib = vertexFormat[i];
    var loc = this.attribLocs[attrib.name];
    var typeBytes = 4;  // TODO: 4 assumes gl.FLOAT, use params.type
    if(loc === undefined)   continue;
    this.gl_.vertexAttribPointer(loc, attrib.size, this.gl_.FLOAT,
                                 !!attrib.normalized, typeBytes*attrib.stride,
                                 typeBytes*attrib.offset);
  }
};


// Exports
return Program;

});