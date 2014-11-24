'use strict';

define([
  './../gl_app/App',
  'bootbox',
  'jquery'
],
  function (App,bootbox)
  {
    /**
     * Helper to update saved scenes
     */
    function UpdateScenesApp(params)
    {
      this.entryIndex = 0;

      // Initialize from parameters
      // Scene Editing App (see gl_app/App.js)
      this.app = params.app;
      // List of entries (i.e. urls)
      this.entries = params.entries;
      // The update url
      this.updateUrl = params.updateUrl;
      console.log("Update URL is: " + this.updateUrl);

      // Whether a scene preview should be saved (typically should be set to true)
      //this.savePreview = params['savePreview'];
      this.startButton = $('#startButton');
      this.startButton.click(this.start.bind(this));
      this.mturkOverlay = $('#mturkOverlay');
      this.testMode = true;
    }

    UpdateScenesApp.prototype.loadSceneCallback = function(app, on_success, on_error) {
      this.saveScene(app, on_success, on_error);
    };

    UpdateScenesApp.prototype.saveScene = function(app, on_success_callback, on_error) {
      on_success_callback = on_success_callback || function(response) {
        this.next();
      }.bind(this);
      var on_success = function(response) {
        on_success_callback(response);
      }.bind(this);

      on_error = on_error || function() {
        showAlert("Error saving results. Please close tab and do task again.", 'alert-danger');
      };
//      var preview = (this.savePreview)? app.GetPreviewImageData():undefined;
      var currentEntry = this.entries[this.entryIndex];
      var results = app.GetSceneResults();
      currentEntry['data']['scene'] = results['scene'];
      // Update!
      this.updateDb(currentEntry).error(on_error).success(on_success);
    };

    UpdateScenesApp.prototype.updateDb = function(entry) {
      var data = {
        id: entry['id'],
        data: JSON.stringify(entry['data'])
      };
      console.log(data);
      if (this.testMode) {
        return this.asyncTest();
      } else {
        return $.ajax({
          type: 'POST',
          url: this.updateUrl,
          data: data,
          dataType: 'json',
          timeout: 30000
        });
      }
    };

    UpdateScenesApp.prototype.asyncTest = function() {
      var obj = {
        error: function(fn) {
          return obj;
        },
        success: function(fn) {
          fn();
          return obj;
        }
      };
      return obj;
    };

    UpdateScenesApp.prototype.next = function() {
      this.savedItemInfo = undefined;
      this.entryIndex++;
      if (this.entryIndex < this.entries.length) {
        this.showEntry(this.entryIndex);
      } else {
        this.showDone();
      }
    };

    UpdateScenesApp.prototype.showDone = function() {
      $('#sentence').text(this.entries.length + " Done!");
    };

    UpdateScenesApp.prototype.showEntry = function(index) {
      var entry = this.entries[index];
      var url = entry['url'];
      if (url.startsWith('/')) {
        url = this.app.base_url + url;
      }

      this.app.onLoadUrl = url;
      this.app.Launch();

      var desc = index + "/" + this.entries.length + " id:" + entry.id;
      $('#sentence').text(desc);
    };

    UpdateScenesApp.prototype.start = function() {
      this.startButton.hide();
      this.showEntry(0);
    };

    UpdateScenesApp.prototype.Launch = function() {
      this.mturkOverlay.show();
    };

    // Exports
    return UpdateScenesApp;
});
