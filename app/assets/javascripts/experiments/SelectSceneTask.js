'use strict';

define([
  'bootbox',
  'jquery',
  'base'
],
  function (bootbox)
  {
    /**
     * Select scene task
     * - User is shown a series of text descriptions along with several 3D scenes
     * - For each description, they are asked to select the correct scene
     */
    function SelectSceneTask(params)
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

      this.sceneImageElems = [];
      this.sceneImageFrameElems = [];
      for (var i = 0; i < this.nChoices; i++) {
        this.sceneImageElems[i] = $('#sceneImage' + i);
        this.sceneImageFrameElems[i] = $('#sceneImageFrame' + i);
        this.sceneImageFrameElems[i].click(this.select.bind(this,i));
      }
      this.selected = -1;
    }

    SelectSceneTask.prototype.select = function(idx) {
      if (this.selected != idx) {
        if (this.selected >= 0) {
          this.sceneImageFrameElems[this.selected].removeClass("selected");
        }
        this.selected = idx;
        if (idx >= 0) {
          this.sceneImageFrameElems[idx].addClass("selected");
        }
      }
    };

    SelectSceneTask.prototype.save = function() {
      var on_success = function(response) {
        this.next();
      }.bind(this);
      var on_error = function() {
        showAlert("Error saving results. Please close tab and do task again.");
      };

      // Check if a scene was selected
      var ok = (this.selected >= 0 && this.selected < this.nChoices);
      if(ok){
        var currentEntry = this.entries[this.entryIndex];
        var correct = this.selected == currentEntry["correctIndex"];
        var results = {
          selectedIndex: this.selected,
          selectedSceneId: currentEntry['scene' + this.selected],
          correct: correct,
          entry: currentEntry
        };
        this.sceneSummary[this.entryIndex] = {
          entryId: currentEntry.id,
          selectedIndex: this.selected,
          selectedSceneId: currentEntry['scene' + this.selected],
          correct: correct
        };
        // This is included somewhere...
        submit_mturk_report_item(this.condition, currentEntry.id, results, undefined).error(on_error).success(on_success);
      }
      else{
        bootbox.alert("Please select a scene!");
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

    SelectSceneTask.prototype.getImageUrl = function(fullId) {
      var parts = fullId.split('.');
      var source = parts[0];
      var sceneId = parts[1];
      return "https://dovahkiin.stanford.edu/text2scene/screenshots/scenes/"
            + source + "/" + sceneId + "/" + sceneId + "-0.png";
    };

    SelectSceneTask.prototype.showEntry = function(i) {
      var entry = this.entries[i];
      this.sceneDescriptionElem.text(entry['text']);
      for (var i = 0; i < this.nChoices; i++) {
        var sceneId = entry['scene' + i];
        var url = this.getImageUrl(sceneId);
        this.sceneImageElems[i].attr('src', url);
      }
      this.select(-1);
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
