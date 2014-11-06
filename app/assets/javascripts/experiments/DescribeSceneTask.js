'use strict';

define([
  './../gl_app/App',
  'bootbox',
  'jquery'
],
  function (App,bootbox)
  {
    /**
     * Scene description task
     * - User is show a series of 3D scenes
     *   and asked to describe the scene in words
     */
    function DescribeSceneTask(params)
    {
      this.entryIndex = 0;

      // Initialize from parameters
      // Scene viewing App (see gl_app/App.js)
      this.app = params.app;
      // List of entries (i.e. scenes)
      // The url of where to load the scene from is specified in the 'url' field of each entry
      this.entries = params.entries;
      // Experiment condition
      this.condition = params.conf['condition'];
      // Whether a scene preview should be saved
      this.savePreview = params.conf['savePreview'];

      // Summary to post for the overall task
      this.sceneSummary = [];
      // TODO: Be flexible about binding actions to buttons...
      this.taskInstructions = $('#taskInstructions');
      this.sceneDescriptionElem = $('#sceneDescription');
      this.mturkOverlay = $('#mturkOverlay');
      this.startButton = $('#startButton');
      this.completeTaskButton = $('#completeTaskButton');
      this.startButton.click(this.start.bind(this));
      this.completeTaskButton.click(this.showCoupon.bind(this));
    }

    DescribeSceneTask.prototype.saveSceneCallback = function(app, on_success, on_error) {
      // TODO: Check if the description is acceptable...
      var desc = this.sceneDescriptionElem.val().trim();
      if(desc.length > 1){
        this.saveScene(app, on_success, on_error);
      }
      else{
        bootbox.alert("Please write a sentence describing what you see!");
        // Indicates to app that the save is done (without doing error callback)
        app.SaveDone();
      }
    };

    DescribeSceneTask.prototype.closeSceneCallback = function(app) {
      this.next();
    };

    DescribeSceneTask.prototype.saveScene = function(app, on_success, on_error) {
      on_success = on_success || function(response) {
        this.next();
      }.bind(this);
      on_error = on_error || function() {
        showAlert("Error saving results. Please close tab and do task again.");
      };
      var preview = (this.savePreview)? app.GetPreviewImageData():undefined;
      var currentEntry = this.entries[this.entryIndex];
      // Get scene description
      var desc = this.sceneDescriptionElem.val().trim();
      var results = {
        description: desc,
        entry: currentEntry
      };
      this.sceneSummary[this.entryIndex] = {
        entryId: currentEntry.id,
        description: desc,
        nSceneObjects: app.scene.modelList.length
      };
      // This is included somewhere...
      submit_mturk_report_item(this.condition, currentEntry.id, results, preview).error(on_error).success(on_success);
    };

    DescribeSceneTask.prototype.showComments = function() {
      // Hide rest of UI
      $('#ui').hide();
      // Show comment area
      $('#comment').show();
      // Focus on comments text box
      $('#comments').focus();
    };

    DescribeSceneTask.prototype.showCoupon = function() {
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

    DescribeSceneTask.prototype.next = function() {
      this.entryIndex++;
      if (this.entryIndex < this.entries.length) {
        // Launch next scene
        this.showEntry(this.entryIndex);
      } else {
        this.showComments();
      }
    };

    DescribeSceneTask.prototype.showEntry = function(i) {
      this.sceneDescriptionElem.val('');
      var entry = this.entries[i];
      var url = entry['url'];
      if (url.startsWith('/')) {
        url = this.app.base_url + url;
      }
      this.app.onLoadUrl = url;
      this.app.Launch();
    };

    DescribeSceneTask.prototype.start = function() {
      this.taskInstructions.hide();
      this.mturkOverlay.show();
      this.showEntry(this.entryIndex);
    };

    DescribeSceneTask.prototype.showInstructions = function() {
      // TODO: Show instructions
    };

    DescribeSceneTask.prototype.Launch = function() {
      this.showInstructions();
    };

    // Exports
    return DescribeSceneTask;
});
