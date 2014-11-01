'use strict';

define([
  './PackedModelsSceneLoader',
  './SSJSceneLoader'
],

function(PackedModelsSceneLoader, SSJSceneLoader){

  function SceneLoader() {
    this.loaders = {
      "packed": new PackedModelsSceneLoader(),
      "ssj": new SSJSceneLoader()
    };
    this.defaultSerializer = this.loaders["ssj"];
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
    return this.defaultSerializer.SerializeForNetwork(scene);
  };

  // Load scene from a JSON object or array representing the scene
  SceneLoader.prototype.LoadFromNetworkSerialized = function(scene, serialized, assman, callback) {
    if (serialized instanceof Array) {
      return this.loaders["packed"].LoadFromNetworkSerialized(scene, serialized, assman, callback);
    } else {
      var format = serialized.format;
      return this.loaders[format].LoadFromNetworkSerialized(scene, serialized, assman, callback);
    }
  };

  // Exports
  return SceneLoader;
});