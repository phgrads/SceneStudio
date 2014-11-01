'use strict';

define([
  './ModelInstance',
  'async'
],

function(ModelInstance){
  function PackedModelsSceneLoader() {
  }

  // In-memory JSON stringification of model instances for re-rendering
  // at later time
  PackedModelsSceneLoader.prototype.SerializeForLocal = function(scene) {
    var packedModels = [];
    var modelMap = [];
    scene.modelList.forEach(function(model){
      packedModels.push(model.toJSONString());
      modelMap[model.model.id] = model.model;
    });
    return { packedModels: packedModels, modelMap: modelMap };
  };

  // Load in-memory JSON stringification of model instances
  PackedModelsSceneLoader.prototype.LoadFromLocalSerialized = function(scene, serializedScene, assman, top_level_callback) {
    top_level_callback = top_level_callback || function(){};
    scene.Reset();

    var getModelFromJSON = function(packedModel, callback) {
      ModelInstance.fromJSONString(
        packedModel,
        assman,
        serializedScene.modelMap,
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

    async.forEach(serializedScene.packedModels, getModelFromJSON, function(err) {
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

  // Return array of stringified JSON models
  PackedModelsSceneLoader.prototype.SerializeForNetwork = function(scene) {
    var pair = this.SerializeForLocal(scene);
    return pair.packedModels;
  };

  // Load array of stringified JSON models
  PackedModelsSceneLoader.prototype.LoadFromNetworkSerialized = function(scene, serialized, assman, callback) {
    var pair = { packedModels: serialized };
    this.LoadFromLocalSerialized(scene, pair, assman, callback);
  };

  // Exports
  return PackedModelsSceneLoader;
});