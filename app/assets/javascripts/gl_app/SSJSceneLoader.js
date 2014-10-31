'use strict';

define([
  './ModelInstance',
  'async'
],

function(ModelInstance){
  function SSJSceneLoader() {
  }

  // Return stringified array of strings, each string representing a serialized model instance
  SSJSceneLoader.prototype.SerializeForNetwork = function(scene) {
    // TODO(MS): Implement
  };

  // Load stringified array of strings, each string representing a serialized model instance
  SSJSceneLoader.prototype.LoadFromNetworkSerialized = function(scene, serialized, assman, callback) {
    // TODO(MS): Implement
  };

  // Exports
  return SSJSceneLoader;
});