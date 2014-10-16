'use strict';

define([
  './../gl_app/App',
  'bootbox',
  'jquery'
],
  function (App,bootbox)
  {
    function DescribeSceneTask(params)
    {
      this.entryIndex = 0;
      this.app = params.app;
      this.entries = params.entries;
      this.condition = params.conf['condition'];
      this.savePreview = params.conf['savePreview'];
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
      this.app.onLoadUrl = entry['url'];
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
