'use strict';

define([
    './../gl_app/SceneViewer',
    './../gl_app/uibehaviors',
    'jquery',
    'bootbox'
], function (SceneViewer, Behaviors) {

  function SelectViewTask(params) {
    this.viewer = new SceneViewer(params);

    // the following variables from globalViewData
    // should be rendered by the jade template
    this.user_record    = window.globalViewData.user;
    this.base_url   = window.globalViewData.base_url;

    // Task initialization
    this.entryIndex = 0;
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

    this.viewer.onLoadUrl = this.base_url + this.entries[this.entryIndex]['url'];
    this.ViewSelectionTaskLogic();
  }

  SelectViewTask.prototype.Launch = function () {
    this.viewer.Launch();
  };

  SelectViewTask.prototype.ViewSelectionTaskLogic = function () {
    // Get message box and text
    var msgBox = $('#message');
    var msgTxt = msgBox.children('span');
    var instructions = id('instructions');

    // Fullscreeen on canvas click and fade message in
    instructions.addEventListener('click', function() {
      this.viewer.EnterFullScreen();
      msgBox.fadeIn('slow');
      $(instructions).html("<p>Left click to go back to task.</p>" +
        "<p>Controls: mouse for looking, AWSD for horizontal motion, R and F for vertical height.</p>");
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
    Behaviors.keypress(this.viewer.uimap, 'delete').onpress(function() {
      if (taskStage == 1 || taskStage == 3) {
        taskStage--;
        msgTxt.text(taskMessages[taskStage]);
        msgBox.hide().fadeIn('slow');
      }
    });

    // Confirming with enter takes action, increments task counter and updates message
    Behaviors.keypress(this.viewer.uimap, 'enter').onpress(function() {
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
  };

  SelectViewTask.prototype.ShowComments = function() {
    // Exit full screen
    this.viewer.ExitFullScreen();
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
    var on_error = function() { bootbox.alert("Error saving results. Please close tab and do task again.");};

    var comments = $('#comments').val();
    var results = {
      summary: this.sceneSummary,
      comments: comments
    };
    // This is included somewhere...
    submit_mturk_report(results).error(on_error).success(on_success);
  };

  SelectViewTask.prototype.SaveCamera = function(tag, on_success, on_error)
  {
    on_success = on_success || function(response) {
    }.bind(this);
    on_error = on_error || function() {
      showAlert("Error saving results. Please close tab and do task again.", 'alert-error');
    };
    var preview = (this.savePreview)? this.viewer.GetPreviewImageData():undefined;
    var currentEntry = this.entries[this.entryIndex];
    var record = {
      user: this.user_record,
      entry: currentEntry,
      tag: tag,
      camera: this.viewer.camera.toJSONString()
    };
    submit_mturk_report_item(this.condition, currentEntry.id, record, preview).error(on_error).success(on_success);
    $("#ui").fadeOut('fast').fadeIn('fast');
  };

  // Exports
  return SelectViewTask;

});