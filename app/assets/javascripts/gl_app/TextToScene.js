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
            catch (e) { return e.toString(); }
          }.bind(this),
          animateScroll:true,
          promptHistory:true,
          welcomeMessage:'Enter scene interaction commands.'
        });
        controller.promptText('generate a room with a desk and a lamp');
      }
      this.console = textConsole;

    }

    TextToScene.prototype.LoadScene = function(json) {
      var on_success = function() {
        // on success finish up some setup
        // TODO: Use camera from loaded scene state
        this.camera.SaveStateForReset();
        this.camera.UpdateSceneBounds(this.scene.Bounds());
        this.undoStack.clear();
        this.renderer.postRedisplay();
      }.bind(this.app);
      var scene_json = JSON.parse(json[0].data);
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
        return JSON.stringify(x)
      });
      //TODO: Update this.app.uilog
      this.app.scene.LoadFromNetworkSerialized(reserialized,
        this.app.assman,
        on_success);
    };

    TextToScene.prototype.ToggleConsole = function ()
    {
      this.console.toggle();
    };

    TextToScene.prototype.GenerateScene = function (text, on_success, on_error)
    {
      this.text2scene.generate(text, on_success, on_error);
    };

    // Exports
    return TextToScene;

  });