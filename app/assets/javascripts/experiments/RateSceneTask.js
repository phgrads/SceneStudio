'use strict';

define([
  'bootbox',
  'jquery',
  'jquery.hotkeys'
],
  function (bootbox) {
    /**
     * Rate scene task
     * - User is shown a series of scenes and asked to rate how good they are
     */
    function RateSceneTask(params) {
      this.entryIndex = 0;

      // Initialize from parameters
      // List of entries (i.e. scenes) 
      this.entries = params.entries;
      // Experiment condition
      this.condition = params.conf['condition'];
      // Whether a scene preview should be saved
      this.savePreview = params.conf['savePreview'];
      // Number of rating choices
      this.nChoices = params.conf['nChoices'];
      // Base url for retrieving images
      this.base_url = params.base_url;

      // Summary to post for the overall task
      this.sceneSummary = [];

      // Hook up UI behavior
      this.taskInstructions = $('#taskInstructions');
      this.sceneDescriptionElem = $('#sceneDescription');
      this.mturkOverlay = $('#mturkOverlay');
      this.startButton = $('#startButton');
      this.completeTaskButton = $('#completeTaskButton');
      this.progressTextDiv = $('#progressTextDiv');
      this.startButton.click(this.start.bind(this));
      this.completeTaskButton.click(this.showCoupon.bind(this));
      this.sceneImageElem = $('#sceneImage');

      // Set rating button click
      var taskState = this;
      $('#ratingBtnGroup input[name=rating]').click(function() {
        //$(this).addClass('active').prop('checked', true).siblings().removeClass('active');
        var rating = $(this).val();
        taskState.save(rating);
      });
      // Also hook up rating keys to keyboard numbers
      for (var i = 1; i <= this.nChoices; i++) {
        $(document).bind('keydown', i.toString(), function(rating) {
          console.log(rating);
          taskState.save(rating);
        }.bind(this, i.toString()));
      }
    }

    RateSceneTask.prototype.save = function(rating) {
      var on_success = function(response) {
        this.next();
      }.bind(this);
      var on_error = function() {
        showAlert("Error saving results. Please close tab and do task again.");
      };

      // Check if a rating was given
      if(rating){
        var currentEntry = this.entries[this.entryIndex];
        var results = {
          rating: rating,
          entry: currentEntry
        };
        this.sceneSummary[this.entryIndex] = {
          entryId: currentEntry.id,
          rating: rating
        };
        // This is included somewhere...
        submit_mturk_report_item(this.condition, currentEntry.id, results, undefined).error(on_error).success(on_success);
      }
      else{
        bootbox.alert("Please rate this scene!");
      }
    };

    RateSceneTask.prototype.showComments = function() {
      // Hide rest of UI
      $('#ui').hide();
      // Show comment area
      $('#comment').show();
      // Focus on comments text box
      $('#comments').focus();
    };

    RateSceneTask.prototype.showCoupon = function() {
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

    RateSceneTask.prototype.next = function() {
      this.entryIndex++;
      if (this.entryIndex < this.entries.length) {
        // Reset radio selection
        $('input[name=rating]:checked').prop('checked', false);
        $('#ratingBtnGroup label').removeClass('active');
        // Launch next scene
        this.showEntry(this.entryIndex);
      } else {
        this.showComments();
      }
    };

    RateSceneTask.prototype.getImageUrl = function(fullId) {
      var parts = fullId.split('.');
      var source = parts[0];
      var sceneId = parts[1];
      return "https://dovahkiin.stanford.edu/text2scene/screenshots/scenes/"
            + source + "/" + sceneId + "/" + sceneId + "-0.png";
    };

    RateSceneTask.prototype.showEntry = function(i) {
      var entry = this.entries[i];
      this.sceneDescriptionElem.text(entry['description']);
      if (!entry.url) {
        var sceneId = entry['scene'];
        entry.url = this.getImageUrl(sceneId);
      }
      this.sceneImageElem.attr('src', entry.url);
      var currEntryIdx = this.entryIndex + 1;
      this.progressTextDiv.text(currEntryIdx + "/" + this.entries.length);
    };

    RateSceneTask.prototype.start = function() {
      this.taskInstructions.hide();
      this.mturkOverlay.show();
      this.showEntry(this.entryIndex);
    };

    RateSceneTask.prototype.showInstructions = function() {
      // TODO: Show instructions
    };

    RateSceneTask.prototype.Launch = function() {
      this.showInstructions();
    };


    // Exports
    return RateSceneTask;
});
