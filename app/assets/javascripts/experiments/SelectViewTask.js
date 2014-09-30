'use strict';

define([
    './../gl_app/Constants',
    './../gl_app/Camera',
    './../gl_app/FPCamera',
    './../gl_app/Renderer',
    './../gl_app/AssetManager',
    './../gl_app/ModelInstance',
    './../gl_app/Scene',
    './../gl_app/CameraControls',
    './../gl_app/PubSub',
    './../gl_app/uimap',
    './../gl_app/uibehaviors',
    './../gl_app/fsm',
    './../gl_app/UILog',
    'jquery',
    'game-shim'
], function (Constants, Camera, FPCamera, Renderer, AssetManager, ModelInstance, Scene, CameraControls, PubSub, uimap,
             Behaviors, FSM, UILog) {

  function SelectViewTask(params) {
    // Extend PubSub
    PubSub.call(this);

    // the following variables from globalViewData
    // should be rendered by the jade template
    this.user_record    = window.globalViewData.user;
    this.scene_record   = window.globalViewData.scene;
    this.on_close_url   = window.globalViewData.on_close_url;
    this.base_url   = window.globalViewData.base_url;

    this.canvas = params.canvas;
    this.uimap = uimap.create(canvas);
    this.scene = new Scene();
    this.camera = new FPCamera(this.scene);
    this.renderer = new Renderer(canvas, this.scene, undefined, this.camera);
    this.assman = new AssetManager(this.renderer.gl_);
    this.uilog = new UILog.UILog();

    // Task initialization
    this.entryIndex = 0;
//            this.app = params.app;
    this.entries = params.entries;
    this.condition = params.conf['condition'];
    this.savePreview = params.conf['savePreview'];
//            this.showEntryCallback = params.showEntryCallback;
    this.sceneSummary = [];
    // TODO: Be flexible about binding actions to buttons...
//            this.taskInstructions = $('#taskInstructions');
//            this.mturkOverlay = $('#mturkOverlay');
//            this.startButton = $('#startButton');
    this.completeTaskButton = $('#completeTaskButton');
//            this.startButton.click(this.start.bind(this));
    this.completeTaskButton.click(this.ShowCoupon.bind(this));
    this.ViewSelectionTaskLogic();
  }

  // Extend PubSub
  SelectViewTask.prototype = Object.create(PubSub.prototype);

  SelectViewTask.prototype.Launch = function () {
    this.LoadScene(
      function() { // on success finish up some setup
        this.camera.SetRandomPositionAndLookAtPointInSceneBounds();
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

    this.camera.AttachControls(this);

    this.renderer.resizeEnd();
  };

  SelectViewTask.prototype.ViewSelectionTaskLogic = function () {
    // Get message box and text
    var msgBox = $('#message');
    var msgTxt = msgBox.children('span');
    var instructions = id('instructions');

    // Fullscreeen on canvas click and fade message in
    instructions.addEventListener('click', function() {
      id("ui").requestFullScreen();
      msgBox.fadeIn('slow');
      $(instructions).html("<p>Left click to go back to task.</p>" +
        "<p>Controls: mouse for looking, AWSD for horizontal motion, R and F for vertical height.</p>");
    });

    // Pointerlock on fullscreen (seems to require direct attachment to document otherwise fails)
    document.addEventListener('fullscreenchange', function() {
      this.canvas.requestPointerLock();
      this.canvas.focus();
    }.bind(this));

    // Initialize task stage counter and messages
    var taskStage = 0;
    var taskMessages = [
      "Please find and take a picture of a view most people would agree shows the scene best.",//taskStage = 0
      "Are you sure this is a good view? Press ENTER again to confirm or DELETE to cancel.",   //taskStage = 1
      "Please find and take a picture of a bad view.",                                         //taskStage = 2
      "Are you sure this is a bad view? Press ENTER again to confirm or DELETE to cancel.",    //taskStage = 3
      "Worst view saved. Press ENTER again to save results and exit."                          //taskStage = 4
    ];
    msgTxt.text(taskMessages[0]);

    // Canceling with delete decrements task counter and updates message
    Behaviors.keypress(this.uimap, 'delete').onpress(function() {
      if (taskStage == 1 || taskStage == 3) {
        taskStage--;
        msgTxt.text(taskMessages[taskStage]);
        msgBox.hide().fadeIn('slow');
      }
    });

    // Confirming with enter takes action, increments task counter and updates message
    Behaviors.keypress(this.uimap, 'enter').onpress(function() {
      if (taskStage == 1) {
        this.SaveCamera('CAMBEST');
      }
      else if (taskStage == 3) {
        this.SaveCamera('CAMWORST');
      }
      else if (taskStage == 4) {
        this.ShowComments();
      }
      taskStage++;
      msgTxt.text(taskMessages[taskStage]);
      msgBox.hide().fadeIn('slow');
    }.bind(this));

    preventSelection(this.canvas);
  };

  SelectViewTask.prototype.ShowComments = function() {
    // Exit full screen
    document.cancelFullScreen();
    $('#blocker').hide();
    // Hide rest of UI
    $('#ui').hide();
    // Show comment area
    $('#comment').show();
    // Focus on comments text box
    $('#comments').focus();
  };

  SelectViewTask.prototype.ShowCoupon = function() {
    // TODO: Improve coupon
    var on_success = function(response) {
      document.body.innerHTML = "<p>Thanks for participating!</p>" +
        "<p>Your coupon code is: " + response.coupon_code + "</p>" +
        "Copy your code back to the first tab and close this tab when done.";
    };
    var on_error = function() { alert("Error saving results. Please close tab and do task again.");};

    var comments = $('#comments').val();
    var results = {
      summary: this.sceneSummary,
      comments: comments
    };
    // This is included somewhere...
    submit_mturk_report(results).error(on_error).success(on_success);
  };

  SelectViewTask.prototype.LoadScene = function(on_success, on_error)
  {
    var on_load_url = this.base_url + this.entries[this.entryIndex]['url'];
    getViaJquery(on_load_url)
      .error(on_error).success(function(json) {
        var scene_json = JSON.parse(json.scene);
        this.uilog.fromJSONString(json.ui_log);
        this.scene.LoadFromNetworkSerialized(scene_json,
          this.assman,
          on_success);
      }.bind(this));
  };

  SelectViewTask.prototype.SaveCamera = function(tag, on_success, on_error)
  {
    on_success = on_success || function(response) {
    }.bind(this);
    on_error = on_error || function() {
      showAlert("Error saving results. Please close tab and do task again.", 'alert-error');
    };
    var preview = (this.savePreview)? this.GetPreviewImageData():undefined;
    var currentEntry = this.entries[this.entryIndex];
    var record = {
      user: this.user_record,
      entry: currentEntry,
      tag: tag,
      camera: this.camera.toJSONString()
    };
    submit_mturk_report_item(this.condition, currentEntry.id, record, preview).error(on_error).success(on_success);
    $("#ui").fadeOut('fast').fadeIn('fast');
  };

  SelectViewTask.prototype.LoadCamera = function(cam)
  {
    this.camera.ResetFromJSONString(cam);
    this.renderer.UpdateView();
  };

  SelectViewTask.prototype.GetPreviewImageData = function() {
    return this.GetImageData(Constants.previewMaxWidth, Constants.previewMaxHeight);
  };

  SelectViewTask.prototype.GetImageData = function(maxWidth,maxHeight) {
    this.renderer.UpdateView();
    var dataUrl  = getTrimmedCanvasDataUrl(this.canvas,maxWidth,maxHeight);
    return dataUrl;
  };

  // Exports
  return SelectViewTask;

});