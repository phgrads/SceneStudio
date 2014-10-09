'use strict';

define([
  './../gl_app/App',
  'jquery',
  'bootbox'
],
  function (App)
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
      this.mturkOverlay = $('#mturkOverlay');
      this.startButton = $('#startButton');
      this.completeTaskButton = $('#completeTaskButton');
      this.startButton.click(this.start.bind(this));
      this.completeTaskButton.click(this.showCoupon.bind(this));
    }

    DescribeSceneTask.prototype.saveSceneCallback = function(app) {
      // TODO: Check if the description is acceptable...
      if(app.scene.modelList.length > 1){
        this.saveScene(app);
      }
      else{
        bootbox.alert("You haven't added anything to the scene yet");
      }
    };

    DescribeSceneTask.prototype.closeSceneCallback = function(app) {
      this.next();
    };

    DescribeSceneTask.prototype.saveScene = function(app) {
      var on_success = function(response) {
        this.next();
      }.bind(this);
      var on_error = function() { alert("Error saving results. Please close tab and do task again.");};
      var preview = (this.savePreview)? app.GetPreviewImageData():undefined;
      var currentEntry = this.entries[this.entryIndex];
      // TODO: get scene description
      var results = "this is where the scene description would go";
      results['entry'] = currentEntry;
      this.sceneSummary[this.entryIndex] = {
        entryId: currentEntry.id,
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
      var on_error = function() { alert("Error saving results. Please close tab and do task again.");};

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
        var entry = this.entries[this.entryIndex];
        this.app.on_load_url = entry['url'];
        this.app.Launch();
      } else {
        this.showComments();
      }
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
