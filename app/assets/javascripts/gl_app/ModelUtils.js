'use strict';

/**
 * Utility class for general Model-related functions
 **/
define(['./Mesh', './Model', './ModelInstance', './Material', './Constants','gl-matrix'],
function(Mesh, Model, ModelInstance, Material, Constants) {

  function ModelUtils(gl) {
    this.gl_ = gl;
  }

  ModelUtils.prototype.SphereModel = function(r, latBands, longBands, color) {
    var mat = new Material.ManipulatorMaterial(this.gl_, { color: color });
    var components = [ { mesh: Mesh.GenerateSphere(this.gl_, r, latBands, longBands), material: mat } ];
    return new Model("Sphere", components);
  };

  ModelUtils.prototype.CameraWidgetModel = function(attribs) {
    // TODO: Update this so view direction is indicated as well
    return this.SphereModel(attribs.size, 10, 10, attribs.color);
  };

  ModelUtils.prototype.CreateCameraMarker = function(cam, attribs) {
    // Defaults
    attribs         = attribs         || {};
    attribs.parent  = attribs.parent  || null;
    attribs.color   = attribs.color   || Constants.cameraMarkerDefaultColor;
    attribs.size    = attribs.size    || Constants.cameraMarkerDefaultSize;

    // Generate marker model instance
    var widget = this.CameraWidgetModel(attribs);
    var m = new ModelInstance(widget, attribs.parent);

    // Set camera transform
    var xform = mat4.identity();
    var eyePos = cam.eyePos;
    mat4.translate(xform, eyePos);
    m.transform = xform;

    return m;
  };

  // Exports
  return ModelUtils;

});