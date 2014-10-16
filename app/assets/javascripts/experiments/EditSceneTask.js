'use strict';

define([
  './../gl_app/App',
  'bootbox',
  'jquery'
],
  function (App,bootbox)
  {
    function EditSceneTask(params)
    {
      this.entryIndex = 0;
      this.savedItemInfo = undefined;
      this.app = params.app;
      this.loadSceneFromUrl = params.loadSceneFromUrl;
      this.entries = params.entries;
      this.condition = params.conf['condition'];
      this.savePreview = params.conf['savePreview'];
      this.showEntryCallback = params.showEntryCallback;
      this.sceneSummary = [];
      // TODO: Be flexible about binding actions to buttons...
      this.taskInstructions = $('#taskInstructions');
      this.mturkOverlay = $('#mturkOverlay');
      this.startButton = $('#startButton');
      this.completeTaskButton = $('#completeTaskButton');
      this.startButton.click(this.start.bind(this));
      this.completeTaskButton.click(this.showCoupon.bind(this));
    }

    EditSceneTask.prototype.saveSceneCallback = function(app, on_success, on_error) {
      if (app.scene.modelList.length > 1) {
        this.saveScene(app, on_success, on_error);
      } else{
        bootbox.alert("You haven't added anything to the scene yet.");
      }
    };

    EditSceneTask.prototype.checkScene = function(app) {
      // Check if the scene is acceptable...
      var currentEntry = this.entries[this.entryIndex];
      var minObjects = currentEntry['minObjects'];
      if (!minObjects) {
        minObjects = 1;
      }
      // Include one extra model for the room...
      if(app.scene.modelList.length > minObjects){
        return true;
      } else {
        if (app.scene.modelList.length <= 1) {
          bootbox.alert("You haven't added anything to the scene yet.");
        } else {
          bootbox.alert("Are you sure you have included all objects in the scene?  Please check your scene.");
        }
        return false;
      }
    };

    EditSceneTask.prototype.closeSceneCallback = function(app) {
      var ok = this.checkScene(app);
      if (ok) {
        this.next();
      }
    };

    EditSceneTask.prototype.saveScene = function(app, on_success_callback, on_error) {
      on_success_callback = on_success_callback || function(response) {
        this.next();
      }.bind(this);
      var on_success = function(response) {
        if (response.item) {
          this.savedItemInfo = response.item;
        }
        on_success_callback(response);
      }.bind(this);

      on_error = on_error || function() {
        showAlert("Error saving results. Please close tab and do task again.", 'alert-error');
      };
      var preview = (this.savePreview)? app.GetPreviewImageData():undefined;
      var currentEntry = this.entries[this.entryIndex];
      var results = app.GetSceneResults();
      results['entry'] = currentEntry;
      this.sceneSummary[this.entryIndex] = {
        entryId: currentEntry.id,
        nSceneObjects: app.scene.modelList.length
      };
      // This is included somewhere...
      submit_mturk_report_item(this.condition, currentEntry.id, results, preview, this.savedItemInfo).error(on_error).success(on_success);
    };

    EditSceneTask.prototype.showComments = function() {
      // Hide rest of UI
      $('#ui').hide();
      // Show comment area
      $('#comment').show();
      // Focus on comments text box
      $('#comments').focus();
    };

    EditSceneTask.prototype.showCoupon = function() {
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

    EditSceneTask.prototype.next = function() {
      this.savedItemInfo = undefined;
      this.entryIndex++;
      if (this.entryIndex < this.entries.length) {
        this.showEntry(this.entryIndex);
      } else {
        this.showComments();
      }
    };

    EditSceneTask.prototype.showEntry = function(index) {
      var entry = this.entries[index];
      if (this.loadSceneFromUrl) {
        this.app.onLoadUrl = entry['url'];
        this.app.Launch();
      } else {
        // New scene
        this.app.CreateEmpty();
      }
      if (this.showEntryCallback) {
        this.showEntryCallback(entry);
      }
    };

    EditSceneTask.prototype.start = function() {
      this.taskInstructions.hide();
      this.mturkOverlay.show();
      this.showEntry(this.entryIndex);
    };

    EditSceneTask.prototype.showInstructions = function() {
      // TODO: Show instructions
    };

    EditSceneTask.prototype.Launch = function() {
      this.showInstructions();
    };

    // Exports
    return EditSceneTask;
});
