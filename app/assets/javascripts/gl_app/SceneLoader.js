'use strict';

define([
  './PackedModelsSceneLoader'
],

function(PackedModelsSceneLoader){

  function SceneLoader() {
    this.packedModelsLoader = new PackedModelsSceneLoader();
  }

  // Returns a JSON stringified array of {modelID, transform} objects
  // for rendering in external application
  SceneLoader.prototype.SerializeBare = function(scene) {
    var mlist = [];
    scene.modelList.forEach(function(model) {
      model.UpdateTransform();
      mlist.push({ modelID: model.modelID, transform: model.transform});
    });
    return JSON.stringify(mlist);
  };

  // Return stringified array of strings, each string representing a serialized model instance
  SceneLoader.prototype.SerializeForNetwork = function(scene) {
    return this.packedModelsLoader.SerializeForNetwork(scene);
  };

  // Load stringified array of strings, each string representing a serialized model instance
  SceneLoader.prototype.LoadFromNetworkSerialized = function(scene, serialized, assman, callback) {
    return this.packedModelsLoader.LoadFromNetworkSerialized(scene, serialized, assman, callback);
  };

  // Exports
  return SceneLoader;
});