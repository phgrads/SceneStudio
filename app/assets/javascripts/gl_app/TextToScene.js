/**
 * Text2Scene
 */

'use strict';

define(['./TextToSceneGenerator',
  'jquery',
  'jquery.console'
],
  function(TextToSceneGenerator)
  {
    function TextToScene(app) {
      this.app = app;
      this.text2scene = new TextToSceneGenerator( {
        generateSucceededCallback: this.LoadScene.bind(this)
      });
      var textConsole = $("#console");
      if (textConsole) {
        var controller = textConsole.console({
          promptLabel: 'Text2Scene> ',
          commandValidate:function(line){
            if (line == "") return false;
            else return true;
          },
          commandHandle:function(line){
            try { this.GenerateScene(line); return true; }
            catch (e) {
              console.error(e.stack);
              return e.toString();
            }
          }.bind(this),
          animateScroll:true,
          promptHistory:true,
          welcomeMessage:'Enter scene interaction commands.'
        });
        controller.promptText('generate a room with a desk and a lamp');
      }
      this.console = textConsole;

    }

    TextToScene.prototype.getCameraJson = function(json, name) {
      if (json && json.scene && json.scene.camera) {
        var cameras = json.scene.camera;
        for (var ci = 0; ci < cameras.length; ci++) {
          var cf = cameras[ci];
          if (cf.name == name) {
            return cf;
          }
        }
      }
    };

    TextToScene.prototype.LoadSceneState = function(json) {
      var on_success = function() {
        // on success finish up some setup
        // TODO: Use camera from loaded scene state
        this.camera.SaveStateForReset();
        this.camera.UpdateSceneBounds(this.scene.Bounds());
        this.camera.InitToSceneBounds();
        this.undoStack.clear();
        this.renderer.UpdateView();
      }.bind(this.app);
      var scene_state_json = JSON.parse(json.data);
      var scene_json = scene_state_json.scene;
      // Reserialize the models as an array of strings
      console.log(scene_json.object);
      var reserialized = scene_json.object.map( function(x) {
        // Strip "wss." from modelID
        // TODO: Have AssetManager handle fullIds and models from other sources...
        //console.log(x);
        if (x.modelId) {
          x.modelID = x.modelId;
          delete x.modelId;
        }
        if (x.modelID.startsWith("wss.")) {
          x.modelID = x.modelID.substring(4);
        }
        x.transform = x.transform.data;
        // TODO: Do something about the renderState...
        // x.renderStateArr = ???
        return JSON.stringify(x);
      });
      //TODO: Update this.app.uilog
      this.app.scene.LoadFromNetworkSerialized(reserialized,
        this.app.assman,
        on_success);
    };

    TextToScene.prototype.LoadWssScene = function(json) {
      var on_success = function() {
        // on success finish up some setup
        this.camera.SaveStateForReset();
        this.camera.UpdateSceneBounds(this.scene.Bounds());
        this.camera.InitToSceneBounds();
        this.undoStack.clear();
        this.renderer.UpdateView();
      }.bind(this.app);
      var scene_json = JSON.parse(json.data);
      // Reserialize the models as an array of strings
      var reserialized = scene_json.map( function(x) {
        // Strip "wss." from modelID
        // TODO: Have AssetManager handle fullIds and models from other sources...
        //console.log(x);
        if (x.modelID.startsWith("wss.")) {
          x.modelID = x.modelID.substring(4);
        }
        // TODO: Do something about the renderState...
        // x.renderStateArr = ???
        return JSON.stringify(x);
      });
      //TODO: Update this.app.uilog
      this.app.scene.LoadFromNetworkSerialized(reserialized,
        this.app.assman,
        on_success);
    };

    TextToScene.prototype.LoadScene = function(scenesJson) {
      var json = scenesJson[0];
      if (json.format == "wss") {
        this.LoadWssScene(json);
      } else if (json.format == "sceneState") {
        this.LoadSceneState(json);
      } else {
        console.error("Unsupported scene format: " + json.format);
      }
    };

    TextToScene.prototype.ToggleConsole = function ()
    {
      this.console.toggle();
    };

    TextToScene.prototype.GetCurrentSceneState = function() {
      var models = this.app.scene.modelList;
      var objects = models.map( function(x) {
        return {
          modelId: x.modelID,
          index:  x.index,
          parentIndex: x.parentIndex,
          transform: x.transform
        };
      });
      var scene = {
        up: { x: 0, y: 0, z: 1 },
        object: objects
      };
      var sceneSelections = [];
      var ss = {
        scene: scene,
        selected: sceneSelections
      };
      return ss;
    };

    TextToScene.prototype.GenerateScene = function (text, on_success, on_error)
    {
      var currentSceneState = this.GetCurrentSceneState();
      this.text2scene.generate(text, currentSceneState, on_success, on_error);
    };

    // Exports
    return TextToScene;

  });