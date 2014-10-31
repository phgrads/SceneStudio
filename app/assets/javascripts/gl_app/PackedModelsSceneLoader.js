'use strict';

define([
  './ModelInstance',
  './Scene',
  'async'
],

function(ModelInstance, Scene){

  function PackedModelsSceneLoader() {
  }

  PackedModelsSceneLoader.prototype.SerializeBare = function(scene) {
    // Just serializes model ids and transforms; enough to render
    // the scene correctly in a different application
    var mlist = [];
    scene.modelList.forEach(function(model) {
      model.UpdateTransform();
      mlist.push({ modelID: model.modelID, transform: model.transform});
    });
    return JSON.stringify(mlist);
  };

  PackedModelsSceneLoader.prototype.SerializeForLocal = function(scene) {
    var packedModels = [];
    var modelMap = [];
    scene.modelList.forEach(function(model){
      packedModels.push(model.toJSONString());
      modelMap[model.model.id] = model.model;
    });
    return { packedModels: packedModels, modelMap: modelMap };
  };

  PackedModelsSceneLoader.prototype.LoadFromLocalSerialized = function(serializedScene, assman, top_level_callback) {
    var scene = new Scene();
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

      scene.root = this.modelList[0];
      scene.root.renderState.isSelectable = false;

      top_level_callback(err); // pass the error along I guess?
    }.bind(this));
  };

  PackedModelsSceneLoader.prototype.SerializeForNetwork = function(scene) {
    var pair = this.SerializeForLocal(scene);
    return pair.packedModels;
  };

  PackedModelsSceneLoader.prototype.LoadFromNetworkSerialized = function(serialized, assman, callback) {
    var pair = { packedModels: serialized };
    this.LoadFromLocalSerialized(pair, assman, callback);
  };

  // Exports
  return PackedModelsSceneLoader;
});