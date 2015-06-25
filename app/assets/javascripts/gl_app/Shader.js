'use strict';

define(function(){

function Shader(gl, source, shaderType) {
  this.gl_ = gl;
  this.handle_ = gl.createShader(shaderType);
  gl.shaderSource(this.handle_, source);
  gl.compileShader(this.handle_);
  if (!gl.getShaderParameter(this.handle_, gl.COMPILE_STATUS)) {
    throw this.info();
  }
}

Shader.prototype.info = function() {
  return this.gl_.getShaderInfoLog(this.handle_);
};

Shader.prototype.type = function() {
  return this.gl_.getShaderParameter(this.handle_, this.gl_.SHADER_TYPE);
};

Shader.vertexShader = function(gl, source) {
  return new Shader(gl, source, gl.VERTEX_SHADER);
};

Shader.fragmentShader = function(gl, source) {
  return new Shader(gl, source, gl.FRAGMENT_SHADER);
};


// Exports
return Shader;

});