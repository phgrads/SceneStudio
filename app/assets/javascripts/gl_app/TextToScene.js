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
      this.text2scene = new TextToSceneGenerator();
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