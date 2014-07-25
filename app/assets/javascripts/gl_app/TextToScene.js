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
      var on_success = undefined;
      var scene_json = JSON.parse(json[0].data);
      // Reserialize the models as an array of strings
      var reserialized = scene_json.map( function(x) {
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