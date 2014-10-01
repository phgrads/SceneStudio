'use strict';

// First person scene viewer
define([
  './Constants',
  './Camera',
  './FPCamera',
  './Renderer',
  './AssetManager',
  './ModelInstance',
  './Scene',
  './Toolbar',
  './CameraControls',
  './PubSub',
  './uimap',
  './uibehaviors',
  './fsm',
  './UILog',
  'jquery',
  'game-shim'
], function (Constants, Camera, FPCamera, Renderer, AssetManager, ModelInstance, Scene, Toolbar, CameraControls, PubSub, uimap,
             Behaviors, FSM, UILog) {

  function SceneViewer(params) {
    // Extend PubSub
    PubSub.call(this);

    // the following variables from globalViewData
    // should be rendered by the jade template
    this.user_record    = window.globalViewData.user;
    this.scene_record   = window.globalViewData.scene;
    this.on_close_url   = window.globalViewData.on_close_url;
    this.base_url   = window.globalViewData.base_url;

    this.canvas = params.canvas;
    this.enableControls = true;

    if (params.includeToolbar) {
      this.toolbar = new Toolbar(this, false);
    }

    this.uimap = uimap.create(canvas);
    this.scene = new Scene();
    this.camera = new FPCamera(this.scene);
    this.renderer = new Renderer(canvas, this.scene, undefined, this.camera);
    this.assman = new AssetManager(this.renderer.gl_);
    this.uilog = new UILog.UILog();

    if (window.globals) {
      this.onCloseCallback = window.globals.onCloseCallback;
      this.onLoadUrl = window.globals.onLoadUrl;
      this.cameraJsonString = window.globals.cameraJsonString;
      if (this.cameraJsonString) {
        this.enableControls = false;
      }
    }
    if (this.onLoadUrl === undefined) {
      if (this.scene_record) {
        this.onLoadUrl = this.base_url + '/scenes/' + this.scene_record.id + '/load';
      }
    }
    if (this.scene_record) {
      this.onSaveUrl = this.base_url + '/scenes/' + this.scene_record.id;
    }
  }

  // Extend PubSub
  SceneViewer.prototype = Object.create(PubSub.prototype);

  SceneViewer.prototype.Launch = function () {
    // Pointerlock on fullscreen (seems to require direct attachment to document otherwise fails)
    document.addEventListener('fullscreenchange', function() {
      this.canvas.requestPointerLock();
      this.canvas.focus();
    }.bind(this));

    preventSelection(this.canvas);

    this.LoadScene(
      function() { // on success finish up some setup
        if (this.cameraJsonString) {
          this.LoadCamera(this.cameraJsonString);
        } else {
          this.camera.SetRandomPositionAndLookAtPointInSceneBounds();
        }
        this.renderer.UpdateView();
      }.bind(this),
      // TODO: Give error message instead
      function() { // on failure create an empty room
        this.assman.GetModel('room', function (model) {
          this.scene.Reset(new ModelInstance(model, null));
          this.camera.SetRandomPositionAndLookAtPointInSceneBounds();
          this.renderer.UpdateView();
        }.bind(this));
      }.bind(this)
    );

    if (this.enableControls) {
      this.camera.AttachControls(this);
    }
    this.renderer.resizeEnd();
  };

  SceneViewer.prototype.EnterFullScreen = function() {
    id("ui").requestFullScreen();
  };

  SceneViewer.prototype.ExitFullScreen = function() {
    document.cancelFullScreen();
  };

  SceneViewer.prototype.LoadScene = function(on_success, on_error)
  {
    var on_load_url = this.onLoadUrl;
    getViaJquery(on_load_url)
      .error(on_error).success(function(json) {
        var scene_json = JSON.parse(json.scene);
        this.uilog.fromJSONString(json.ui_log);
        this.scene.LoadFromNetworkSerialized(scene_json,
          this.assman,
          on_success);
      }.bind(this));
  };

  SceneViewer.prototype.LoadCamera = function(cam)
  {
    this.camera.ResetFromJSONString(cam);
    this.renderer.UpdateView();
  };

  SceneViewer.prototype.GetPreviewImageData = function() {
    return this.GetImageData(Constants.previewMaxWidth, Constants.previewMaxHeight);
  };

  SceneViewer.prototype.GetImageData = function(maxWidth,maxHeight) {
    this.renderer.UpdateView();
    var dataUrl  = getTrimmedCanvasDataUrl(this.canvas,maxWidth,maxHeight);
    return dataUrl;
  };

  SceneViewer.prototype.Close = function() {
    if (this.onCloseCallback) {
      this.onCloseCallback(this);
    } else {
      this.ExitTo(this.on_close_url);
    }
  };

  SceneViewer.prototype.ExitTo = function(destination)
  {
    window.onbeforeunload = null;
    window.location.href = destination;
  };

  // Exports
  return SceneViewer;

});