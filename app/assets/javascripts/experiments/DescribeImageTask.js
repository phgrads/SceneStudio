'use strict';

define([
  'bootbox',
  'jquery'
],
  function (App,bootbox)
  {
    function DescribeImageTask(params)
    {
      this.entryIndex = 0;
      this.entries = params.entries;
      this.condition = params.conf['condition'];
      this.sceneSummary = [];
      // TODO: Be flexible about binding actions to buttons...
      this.taskInstructions = $('#taskInstructions');
      this.sceneDescriptionElem = $('#sceneDescription');
      this.sceneImageElem = $('#sceneImage');
      this.mturkOverlay = $('#mturkOverlay');
      this.startButton = $('#startButton');
      this.completeTaskButton = $('#completeTaskButton');
      this.startButton.click(this.start.bind(this));
      this.completeTaskButton.click(this.showCoupon.bind(this));
    }

    DescribeImageTask.prototype.save = function(on_success, on_error) {
      on_success = on_success || function(response) {
        this.next();
      }.bind(this);
      on_error = on_error || function() {
        showAlert("Error saving results. Please close tab and do task again.");
      };

      // TODO: Check if the description is acceptable...
      var desc = this.sceneDescriptionElem.val().trim();
      if(desc.length > 1){
        var currentEntry = this.entries[this.entryIndex];
        // Get scene description
        var desc = this.sceneDescriptionElem.val().trim();
        var results = {
          description: desc,
          entry: currentEntry
        };
        this.sceneSummary[this.entryIndex] = {
          entryId: currentEntry.id,
          description: desc
        };
        // This is included somewhere...
        submit_mturk_report_item(this.condition, currentEntry.id, results, null).error(on_error).success(on_success);
      }
      else{
        bootbox.alert("Please write a sentence describing what you see!");
        // Indicates to app that the save is done (without doing error callback)
        app.SaveDone();
      }
    };

    DescribeImageTask.prototype.showComments = function() {
      // Hide rest of UI
      $('#ui').hide();
      // Show comment area
      $('#comment').show();
      // Focus on comments text box
      $('#comments').focus();
    };

    DescribeImageTask.prototype.showCoupon = function() {
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

    DescribeImageTask.prototype.next = function() {
      this.entryIndex++;
      if (this.entryIndex < this.entries.length) {
        // Launch next scene
        this.showEntry(this.entryIndex);
      } else {
        this.showComments();
      }
    };

    DescribeImageTask.prototype.showEntry = function(i) {
      this.sceneDescriptionElem.val('');
      var entry = this.entries[i];
      var url = entry['url'];
      if (url.startsWith('/')) {
        url = this.base_url + url;
      }
      this.sceneImageElem.attr('src', url);
    };

    DescribeImageTask.prototype.start = function() {
      this.taskInstructions.hide();
      this.mturkOverlay.show();
      this.showEntry(this.entryIndex);
    };

    DescribeImageTask.prototype.showInstructions = function() {
      // TODO: Show instructions
    };

    DescribeImageTask.prototype.Launch = function() {
      this.showInstructions();
    };

    // Exports
    return DescribeImageTask;
});
