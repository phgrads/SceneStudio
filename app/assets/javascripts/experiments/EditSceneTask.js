'use strict';

define([
  './../gl_app/App',
  'bootbox',
  'jquery'
],
  function (App,bootbox)
  {
    /**
     * Scene editing task
     * - User is show a series of prompts (descriptions or images)
     *   and asked to create (or refine) a scene to match the prompt
     */
    function EditSceneTask(params)
    {
      this.entryIndex = 0;
      this.savedItemInfo = undefined;

      // Initialize from parameters
      // Scene Editing App (see gl_app/App.js)
      this.app = params.app;
      // Whether an existing scene should be loaded (for scene enrichment)
      // The url of where to load the scene from is specified in the 'url' field of each entry
      this.loadSceneFromUrl = params.loadSceneFromUrl;
      // List of entries (i.e. prompts)
      // The room model to use (i.e. room) is specified by the 'rootModelId" field of each entry
      // - if not specified (then room model is a default) or
      //     useRandomRootModel is specified in the config, a random room is used
      this.entries = params.entries;
      // Experiment condition
      this.condition = params.conf['condition'];
      // Whether a scene preview should be saved (typically should be set to true)
      this.savePreview = params.conf['savePreview'];
      // Whether to use a random root model for each entry
      this.useRandomRootModel = params.conf['useRandomRootModel'];
      if (this.useRandomRootModel) {
        this.rootModelIds = params.conf['rootModelIds'];
      }
      // Task specific callback indicating how each entry should be displayed
      this.showEntryCallback = params.showEntryCallback;

      // Summary to post for the overall task
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
        // Indicates to app that the save is done (without doing error callback)
        app.SaveDone();
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
        showAlert("Error saving results. Please close tab and do task again.", 'alert-danger');
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
        var url = entry['url'];
        if (url.startsWith('/')) {
          url = this.app.base_url + url;
        }
        this.app.onLoadUrl = url;
        this.app.Launch();
      } else {
        // New scene
        if (this.useRandomRootModel) {
          var i = Math.floor(Math.random()*this.rootModelIds.length);
          var rootModelId = this.rootModelIds[i];
          this.app.rootModelId = rootModelId;
        } else if (entry.rootModelId) {
          this.app.rootModelId = entry.rootModelId;
        }
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
