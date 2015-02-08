'use strict';

define([
  'bootbox',
  'jquery'
],
  function (bootbox)
  {
    /**
     * Rate scene task
     * - User is shown a series of scenes and asked to rate how good they are
     */
    function RateSceneTask(params)
    {
      this.entryIndex = 0;

      // Initialize from parameters
      // List of entries (i.e. scenes)
      // The url of where to load the scene from is specified in the 'url' field of each entry
      this.entries = params.entries;
      // Experiment condition
      this.condition = params.conf['condition'];
      // Whether a scene preview should be saved
      this.savePreview = params.conf['savePreview'];

      this.nChoices = params.conf['nChoices'];
      this.base_url = params.base_url;

      // Summary to post for the overall task
      this.sceneSummary = [];
      // TODO: Be flexible about binding actions to buttons...
      this.taskInstructions = $('#taskInstructions');
      this.sceneDescriptionElem = $('#sceneDescription');
      this.mturkOverlay = $('#mturkOverlay');
      this.startButton = $('#startButton');
      this.nextButton = $('#nextButton');
      this.completeTaskButton = $('#completeTaskButton');
      this.startButton.click(this.start.bind(this));
      this.nextButton.click(this.save.bind(this));
      this.completeTaskButton.click(this.showCoupon.bind(this));

      this.sceneImageElem = $('#sceneImage');
    }

    RateSceneTask.prototype.save = function() {
      var on_success = function(response) {
        this.next();
      }.bind(this);
      var on_error = function() {
        showAlert("Error saving results. Please close tab and do task again.");
      };

      // Check if a rating was given
      var rating = $('input[type=radio][name=rating]:checked').val();
      var ok = rating;
      if(ok){
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
        var checkedBtn = $('input[type=radio][name=rating]:checked');
        checkedBtn.prop('checked', false);
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
      var sceneId = entry['scene'];
      var url = this.getImageUrl(sceneId);
      this.sceneImageElem.attr('src', url);
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
