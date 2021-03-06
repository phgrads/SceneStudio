'use strict';

define([
  'bootbox',
  'jquery',
  'base'
],
  function (bootbox)
  {
    /**
     * Scene description task
     * - User is show a series of images
     *   and asked to describe the scene in words
     */
    function DescribeInteractionTask(params)
    {
      this.entryIndex = 0;

      // Initialize from parameters

      // List of entries (i.e. images)
      // The url of where to load the image from is specified in the 'url' field of each entry
      this.entries = params.entries;

      // Experiment condition
      this.condition = params.conf['condition'];
      this.base_url = params.base_url;

      // Summary to post for the overall task
      this.sceneSummary = [];
      // TODO: Be flexible about binding actions to buttons...
      this.taskInstructions = $('#taskInstructions');
      this.sceneDescriptionElem = $('#sceneDescription'); // box for user input
      this.sceneImageBeforeElem = $('#sceneImageBefore');
      this.sceneImageAfterElem = $('#sceneImageAfter');
      this.mturkOverlay = $('#mturkOverlay');
      this.startButton = $('#startButton');
      this.nextButton = $('#nextButton');
      this.completeTaskButton = $('#completeTaskButton');
      this.progressTextDiv = $('#progressTextDiv');
      this.startButton.click(this.start.bind(this));
      this.nextButton.click(this.save.bind(this));
      this.completeTaskButton.click(this.showCoupon.bind(this));

      // Set before/after fading for scene image pairs
      $('.before-after').slick({
        autoplay: true,
        autoplaySpeed: 2500,
        speed: 500,
        arrows: false,
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: true,
        cssEase: 'linear'
      });
    }

    DescribeInteractionTask.prototype.save = function() {
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

    DescribeInteractionTask.prototype.showComments = function() {
      // Hide rest of UI
      $('#ui').hide();
      // Show comment area
      $('#comment').show();
      // Focus on comments text box
      $('#comments').focus();
    };

    DescribeInteractionTask.prototype.showCoupon = function() {
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

    DescribeInteractionTask.prototype.next = function() {
      this.entryIndex++;
      if (this.entryIndex < this.entries.length) {
        // Launch next scene
        this.showEntry(this.entryIndex);
      } else {
        this.showComments();
      }
    };

    DescribeInteractionTask.prototype.showEntry = function(i) {
      this.sceneDescriptionElem.val('');
      this.sceneDescriptionElem.focus();
      $('.before-after').slick('slickGoTo', 0, false);

      var entry = this.entries[i];
      var url1 = entry['url1'];
      if (url1.startsWith('/')) {
        url1 = this.base_url + url1;
      }
      var url2 = entry['url2'];
      if (url2.startsWith('/')) { // TODO: make this its own function?
        url2 = this.base_url + url2;
      }
      this.sceneImageBeforeElem.attr('src', url1);
      this.sceneImageAfterElem.attr('src', url2);

      var currentEntryIdx = this.entryIndex + 1; // one-indexed entry idx
      this.progressTextDiv.text(currentEntryIdx + "/" + this.entries.length);
    };

    DescribeInteractionTask.prototype.start = function() {
      this.taskInstructions.hide();
      this.mturkOverlay.show();
      this.showEntry(this.entryIndex);
    };

    DescribeInteractionTask.prototype.showInstructions = function() {
      // TODO: Show instructions
    };

    DescribeInteractionTask.prototype.Launch = function() {
      this.showInstructions();
    };

    // Exports
    return DescribeInteractionTask;
});
