'use strict';

define([
  './ModelInstance',
  'async'
],

function(ModelInstance){
  function SSJSceneLoader() {
  }

  // Return scene as simple JSON object
  SSJSceneLoader.prototype.SerializeForNetwork = function(scene) {
    var camera = {
      name:     "current",
      eye:      scene.camera.eyePos,
      lookAt:   scene.camera.lookAtPoint,
      up:       scene.camera.upVec
    };
    var cameras = [ camera ];
    var objectToSerialize = {
      format:   "ssj",
      objects:  scene.modelList,
      cameras:  cameras
    };
    return objectToSerialize;
  };

  // Load from JSON object representing scene
  SSJSceneLoader.prototype.LoadFromNetworkSerialized = function(scene, jsonObject, assman, top_level_callback) {
    top_level_callback = top_level_callback || function(){};
    scene.Reset();

    var camera = jsonObject.cameras[0];
    scene.camera.Reset(camera.eye, camera.lookAt, camera.up);

    var getModelFromJSON = function(json, callback) {
      ModelInstance.fromJSON(
        json,
        assman,
        undefined,  // No modelMap, so just reload models
        function(model) {
          if (model.index === -1) {
            scene.modelList[0] = model; // Root model
          } else {
            scene.modelList[model.index] = model;
          }
          callback(); // can report errors via this ...
        }.bind(this)
      );
    }.bind(this);

    async.forEach(jsonObject.objects, getModelFromJSON, function(err) {
      scene.modelList.forEach(function(model) {
        if (model.parentIndex >= 0) {
          model.SetParent(scene.modelList[model.parentIndex]);
        }
        // If transform is pre-loaded and baked in, compute here
        if (!model.bakedTransform) {
          model.UpdateTransform();
        }
        delete model.parentIndex;
      }.bind(this));

      scene.root = scene.modelList[0];
      scene.root.renderState.isSelectable = false;

      top_level_callback(err); // pass the error along I guess?
    }.bind(this));
  };

  // Exports
  return SSJSceneLoader;
});