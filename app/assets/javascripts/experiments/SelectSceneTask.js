'use strict';

define([
  './../gl_app/App',
  'bootbox',
  'jquery'
],
  function (App,bootbox)
  {
    /**
     * Select scene task
     * - User is shown a series of text descriptions along with several 3D scenes
     * - For each descjription, they are asked to select the correct scene
     */
    function SelectSceneTask(params)
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
      this.sceneImageElem = $('#sceneImage');
      this.mturkOverlay = $('#mturkOverlay');
      this.startButton = $('#startButton');
      this.nextButton = $('#nextButton');
      this.completeTaskButton = $('#completeTaskButton');
      this.startButton.click(this.start.bind(this));
      this.nextButton.click(this.save.bind(this));
      this.completeTaskButton.click(this.showCoupon.bind(this));
    }

    SelectSceneTask.prototype.save = function() {
      var on_success = function(response) {
        this.next();
      }.bind(this);
      var on_error = function() {
        showAlert("Error saving results. Please close tab and do task again.");
      };

      // TODO: Check if the description is acceptable...
      var desc = this.sceneDescriptionElem.val().trim();
      if(desc.length > 1){
        var currentEntry = this.entries[this.entryIndex];
        var results = {
          description: desc,
          entry: currentEntry
        };
        this.sceneSummary[this.entryIndex] = {
          entryId: currentEntry.id,
          description: desc
        };
        // This is included somewhere...
        submit_mturk_report_item(this.condition, currentEntry.id, results, undefined).error(on_error).success(on_success);
      }
      else{
        bootbox.alert("Please write a sentence describing what you see!");
      }
    };

    SelectSceneTask.prototype.showComments = function() {
      // Hide rest of UI
      $('#ui').hide();
      // Show comment area
      $('#comment').show();
      // Focus on comments text box
      $('#comments').focus();
    };

    SelectSceneTask.prototype.showCoupon = function() {
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

    SelectSceneTask.prototype.next = function() {
      this.entryIndex++;
      if (this.entryIndex < this.entries.length) {
        // Launch next scene
        this.showEntry(this.entryIndex);
      } else {
        this.showComments();
      }
    };

    SelectSceneTask.prototype.showEntry = function(i) {
      this.sceneDescriptionElem.val('');
      var entry = this.entries[i];
      var url = entry['url'];
      if (url.startsWith('/')) {
        url = this.base_url + url;
      }
      this.sceneImageElem.attr('src', url);
    };

    SelectSceneTask.prototype.start = function() {
      this.taskInstructions.hide();
      this.mturkOverlay.show();
      this.showEntry(this.entryIndex);
    };

    SelectSceneTask.prototype.showInstructions = function() {
      // TODO: Show instructions
    };

    SelectSceneTask.prototype.Launch = function() {
      this.showInstructions();
    };


    // Exports
    return SelectSceneTask;
});
