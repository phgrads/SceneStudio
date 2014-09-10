/**
 * Text2Scene
 */

'use strict';

define(['./TextToSceneGenerator', './UndoStack',
  'gl-matrix',
  'jquery',
  'jquery.console'
],
  function(TextToSceneGenerator, UndoStack)
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

    TextToScene.prototype.vec3ToXyz = function(v) {
      return {
        x: v[0],
        y: v[1],
        z: v[2]
      }
    };

    TextToScene.prototype.xyzToVec3 = function(v) {
      return vec3.create([v.x, v.y, v.z])
    };

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
      var scene_state_json = JSON.parse(json.data);
      var scene_json = scene_state_json.scene;
      var curCamera = this.getCameraJson(scene_state_json, "current");
      var curCameraState = null;
      if (curCamera) {
        curCameraState = {
          position: this.xyzToVec3(curCamera.position),
          target: this.xyzToVec3(curCamera.target),
          up: this.xyzToVec3(curCamera.up)
        }
      }
      var on_success = function() {
        // on success finish up some setup
        // Use camera from loaded scene state
        this.camera.SaveStateForReset();
        this.camera.UpdateSceneBounds(this.scene.Bounds());
        if (curCameraState) {
          this.camera.Reset(curCameraState.position, curCameraState.target, curCameraState.up);
        } else {
          this.camera.InitToSceneBounds();
        }
        this.undoStack.pushCurrentState(UndoStack.CMDTYPE.TEXT2SCENE);
        this.renderer.UpdateView();
      }.bind(this.app);
      // Reserialize the models as an array of strings
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
        // isPickable, isInserting, isSelected, isSelectable
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
          transform: {
            rows: 4,
            cols: 4,
            data: x.transform
          }
        };
      });
      var cam = this.app.camera;
      var currentCameraState = {
        name: "current",
        position: this.vec3ToXyz(cam.eyePos),
        target: this.vec3ToXyz(cam.lookAtPoint),
        direction: this.vec3ToXyz(cam.lookVec),
        up:  this.vec3ToXyz(cam.upVec)
      };
      var scene = {
        up: { x: 0, y: 0, z: 1 },
        front: { x:0, y:-1, z:0 },
        camera: [ currentCameraState ],
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