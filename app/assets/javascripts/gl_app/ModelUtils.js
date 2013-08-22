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

  ModelUtils.prototype.TetrahedronModel = function(color) {
    var mat = new Material.ManipulatorMaterial(this.gl_, { color: color });
    var components = [ { mesh: Mesh.GenerateTetrahedron(this.gl_), material: mat } ];
    return new Model("Tet", components);
  };

  ModelUtils.prototype.CameraWidgetModel = function(attribs) {
    var sphere = Mesh.GenerateSphere(this.gl_, 0.5);

    // Elongated tetrahedron
    var xform = mat4.identity();
    mat4.translate(xform, [0,0,-2]);
    mat4.scale(xform, [1.5,1.5,2]);
    var tet = Mesh.GenerateTetrahedron(this.gl_, xform);

    var mat1 = new Material.ManipulatorMaterial(this.gl_, { color: attribs.color1 });
    var mat2 = new Material.ManipulatorMaterial(this.gl_, { color: attribs.color2 });

    var components = [ { mesh: sphere, material: mat1}, { mesh: tet, material: mat2 } ];

    return new Model("CameraWidget", components);
  };

  ModelUtils.prototype.CreateCameraMarker = function(cam, attribs) {
    // Defaults
    attribs         = attribs         || {};
    attribs.parent  = attribs.parent  || null;
    attribs.color1  = attribs.color1  || Constants.cameraMarkerDefaultColor1;
    attribs.color2  = attribs.color2  || Constants.cameraMarkerDefaultColor2;
    attribs.size    = attribs.size    || Constants.cameraMarkerDefaultSize;

    // Generate marker model instance
    var widget = this.CameraWidgetModel(attribs);
    var m = new ModelInstance(widget, attribs.parent);

    // Set camera transform
    var T = mat4.create();
    mat4.lookAt(cam.eyePos, cam.lookAtPoint, cam.upVec, T);
    mat4.inverse(T);
    m.transform = T;

    return m;
  };

  // Exports
  return ModelUtils;

});