'use strict';

define([
  './Constants',
  './Camera',
  './Renderer',
  './AssetManager',
  './ModelInstance',
  './Scene',
  './SceneLoader',
  './SearchController',
  './Manipulators',
  './UndoStack',
  './Toolbar',
  './CameraControls',
  './PubSub',
  './SplitView',
  './uimap',
  './uibehaviors',
  './fsm',
  './UILog',
  './TextToScene',
  'jquery',
  'bootstrap'
],
  function (Constants, Camera, Renderer, AssetManager, ModelInstance, Scene, SceneLoader, SearchController,
            Manipulators, UndoStack, Toolbar, CameraControls, PubSub, SplitView, uimap, Behaviors, FSM, UILog,
            TextToScene)
  {
    function UIState(gl)
    {
      // Model selection
      this.selectedInstance = null;

      // Model copying/pasting
      this.copyInstance = null;

      this.isBusy = false;
    }

    function App(params)
    {
      // Extend PubSub
      PubSub.call(this);

      if (params instanceof HTMLCanvasElement) {
        this.canvas = params;
        this.allowEdit = true;
      } else {
        this.canvas = params.canvas;
        this.allowEdit = params.allowEdit;
      }

      // Whether an image of the scene should be saved as a preview
      this.savePreview = true;

      // Id of the initial model to use
      this.rootModelId = "room01";

      // the following variables from globalViewData
      // should be rendered by the jade template
      this.user_record    = window.globalViewData.user;
      this.scene_record   = window.globalViewData.scene;
      this.on_close_url   = window.globalViewData.on_close_url;
      this.user_name  = window.globalViewData.user_name;
      this.scene_name = window.globalViewData.scene_name;
      this.base_url   = window.globalViewData.base_url;

      this.uimap = uimap.create(this.canvas);

      this.camera = new Camera();
      // Set of predefined views
      this.predefinedViews = null;
      // The current view index
      this.currentViewIndex = 0;
      // What view to use for loaded scenes
      this.onLoadViewIndex = -1;

      this.scene = new Scene();
      this.scene.camera = this.camera;
      this.loader = new SceneLoader();
      this.renderer = new Renderer(this.canvas, this.scene, undefined, this.camera);
      this.assman = new AssetManager(this.renderer.gl_);
      this.uistate = new UIState(this.renderer.gl_);
      this.uilog = new UILog();

      // Initialize text2scene
      if (this.allowEdit) {
        this.text2scene = new TextToScene(this);
      }

      if (this.allowEdit) {
        this.scene.AddManipulator(new Manipulators.RotationManipulator(this.renderer.gl_));
        this.scene.AddManipulator(new Manipulators.ScaleManipulator(this.renderer.gl_));
      }

      this.AttachEventHandlers();

      this.undoStack = new UndoStack(this, Constants.undoStackMaxSize);
      this.toolbar = new Toolbar(this, this.allowEdit);
      this.cameraControls = new CameraControls(this);
      this.searchController = new SearchController(this);

      // Only have split view (with search area) if we allow edit
      if (this.allowEdit) {
        SplitView.MakeSplitView({
          leftElem: $('#graphicsOverlay'),
          rightElem: $('#searchArea'),
          rightMinWidth: Constants.searchAreaMinWidth,
          rightMaxWidth: Constants.searchAreaMaxWidth,
          snapToGrid: Constants.searchAreaResizeGrid
        });
      }

      if (window.globals) {
        this.onSaveCallback = window.globals.onSaveCallback;
        this.onCloseCallback = window.globals.onCloseCallback;
        this.onLoadUrl = window.globals.onLoadUrl;
      }
      if (this.onLoadUrl === undefined) {
        if (this.scene_record) {
          this.onLoadUrl = this.base_url + '/scenes/' + this.scene_record.id + '/load';
        }
      }
      if (this.scene_record) {
        this.onSaveUrl = this.base_url + '/scenes/' + this.scene_record.id;
      }

      // Whether to automatically save when closing a scene
      this.autoSaveOnClose = false;
      // Bindings for ExitSceneModal
      $('#ExitSceneSaveYes').click( this.SaveAndCloseScene.bind(this) );
      $('#ExitSceneSaveNo').click( this.CloseScene.bind(this) );

      // Bindings for ExitSceneErrorSavingModal
      $('#ExitSceneErrorYes').click( this.CloseScene.bind(this) );

      // Bindings for EditSceneSaveModal
      $('#EditSceneModalSave').click( this.SaveSceneMeta.bind(this) );

      preventSelection(this.canvas);

      // TODO: Handle preventing of default browser action in a less hackish way
      // Prevent browser from capturing Ctrl+S, Ctrl+K
      document.addEventListener("keydown", function(e) {
        if ((e.keyCode == 83 /*s*/ || e.keyCode == 75 /*k*/)
          && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
          e.preventDefault();
        }
      }, false);
    }

    // Extend PubSub
    App.prototype = Object.create(PubSub.prototype);

    App.prototype.Help = function() {
      $('#help').toggle();
    };

    App.prototype.EditMeta = function() {
      $('#EditSceneModal').modal('show');
    };

    App.prototype.SaveDone = function() {
      // Save done - redisplay toolbar
      this.toolbar.Show();
    };

    App.prototype.SaveScene = function(on_success_callback, on_error_callback) {
      on_success_callback = on_success_callback || function() {
        showAlert('Scene successfully saved!', 'alert-success');
      };
      on_error_callback = on_error_callback || function() {
        showAlert('Error saving scene', 'alert-danger');
      };
      var on_success = function() {
        this.SaveDone();
        on_success_callback();
      }.bind(this);
      var on_error = function() {
        this.SaveDone();
        on_error_callback();
      }.bind(this);
      this.toolbar.Hide();
      if (this.onSaveCallback) {
        this.onSaveCallback(this,on_success,on_error);
      } else{
        this.SaveScene_(on_success, on_error);
      }
    };

    App.prototype.GetSceneResults = function() {
      var serialized = this.loader.SerializeForNetwork(this.scene);
      var results = {
        scene: JSON.stringify(serialized),
        ui_log: this.uilog.stringify()
      };
      return results;
    };

    App.prototype.Launch = function () {
      this.LoadScene(
        function() { // on success finish up some setup
          this.camera.SaveStateForReset();
          this.camera.UpdateSceneBounds(this.scene.Bounds());
          this.predefinedViews = this.camera.GenerateViews(this.canvas.width, this.canvas.height);
          if (this.onLoadViewIndex >= 0) {
            this.currentCameraIndex = this.onLoadViewIndex;
            this.setView(this.predefinedViews[this.currentCameraIndex]);
          } else {
            this.currentCameraIndex = 0;
            if (!this.scene.cameraInitialized) {
              this.setView(this.predefinedViews[this.currentCameraIndex]);
            }
          }
          this.undoStack.clear();
          this.renderer.resizeEnd();
          this.renderer.UpdateView();
        }.bind(this),
        function() { // on failure create an empty room
          this.CreateEmpty();
        }.bind(this));
    };

    // Create a empty scene
    App.prototype.CreateEmpty = function() {
      if (this.rootModelId) {
        this.assman.GetModel(this.rootModelId, function (model)
        {
          this.scene.Reset(new ModelInstance(model, null));
          this.camera.UpdateSceneBounds(this.scene.Bounds());
          this.predefinedViews = this.camera.GenerateViews(this.canvas.width, this.canvas.height);
          if (this.onLoadViewIndex >= 0) {
            this.currentCameraIndex = this.onLoadViewIndex;
          } else {
            this.currentCameraIndex = 0;
          }
          this.setView(this.predefinedViews[this.currentCameraIndex]);
          this.undoStack.clear();
          this.renderer.resizeEnd();
          this.renderer.UpdateView();
          this.SelectInstance(null);
        }.bind(this));
      }
    };

    App.prototype.setView = function(view) {
      console.log("Set view to ");
      console.log(view);
      this.camera.Reset(view.eye, view.lookAt, view.up);
      this.renderer.UpdateView();
    };

    App.prototype.AttachEventHandlers = function ()
    {
      // Try to prevent accidental navigation away from app
      window.onbeforeunload = function(e) {
        return 'If you leave this page, you may lose unsaved work!'
      };

      /*** Behaviors are specified here ***/

      // orbiting rotation
      var orbiting_behavior =
        Behaviors.mousedrag(this.uimap, 'right')
          .ondrag(function(data) {
            var left = -data.dx * Constants.cameraOrbitSpeed;
            var up = data.dy * Constants.cameraOrbitSpeed;
            this.camera.OrbitLeft(left);
            this.camera.OrbitUp(up);
            this.renderer.UpdateView();
            this.uilog.log(UILog.EVENT.CAMERA_ORBIT,
              data,
              {
                orbitLeft: left,
                orbitUp: up
              });
          }.bind(this));

      // dollying
      var dollying_behavior =
        Behaviors.mousedrag(this.uimap, 'middle, shift+right')
          .ondrag(function(data) {
            var left = data.dx * Constants.cameraDollySpeed;
            var up = data.dy * Constants.cameraDollySpeed;
            this.camera.DollyLeft(left);
            this.camera.DollyUp(up);
            this.renderer.UpdateView();
            this.uilog.log(UILog.EVENT.CAMERA_DOLLY,
              data,
              {
                dollyLeft: left,
                dollyUp: up
              });
          }.bind(this));

      // no need to install handlers, as events are
      // dynamically routed by the machine
      var focus = FSM.focusmachine(this);
      // inhibit focusing during view manipulations
      orbiting_behavior
        .onstart(focus.start_interruption.bind(focus))
        .onfinish(focus.finish_interruption.bind(focus));
      dollying_behavior
        .onstart(focus.start_interruption.bind(focus))
        .onfinish(focus.finish_interruption.bind(focus));

      // mouse wheel scrolls
      addWheelHandler(this.canvas, this.MouseWheel.bind(this));

      // change views
      var inc_view_behavior =
        Behaviors.keypress(this.uimap, 'ctrl+.')
          .onpress(function(data) {
            data.preventDefault();
            this.currentViewIndex = (this.currentViewIndex + 1).mod(this.predefinedViews.length);
            this.setView(this.predefinedViews[this.currentViewIndex]);
          }.bind(this));

      var dec_view_behavior =
        Behaviors.keypress(this.uimap, 'ctrl+,')
          .onpress(function(data) {
            data.preventDefault();
            this.currentViewIndex = (this.currentViewIndex - 1).mod(this.predefinedViews.length);
            this.setView(this.predefinedViews[this.currentViewIndex]);
          }.bind(this));

      if (this.allowEdit) {
        // also make sure insertion inhibits focusing
        this.insertion_behavior = this.CreateInsertionBehavior()
          .onstart(focus.start_interruption.bind(focus))
          .onfinish(function(data) {
            this.FinishModelInsertion(data.instance);
            focus.finish_interruption();
          }.bind(this))
          .onhover(function(data) {
            this.ContinueModelInsertion(data.x, data.y);
          }.bind(this))
          .oncancel(function(data) {
            this.CancelModelInsertion(data.instance);
            focus.finish_interruption();
          }.bind(this));

        // some support functions
        var ensureInstance = function(toWrap) {
          var helper = function(opts) {
            if(this.insertion_behavior.isActive()) {
              opts.instance = this.insertion_behavior.instance();
            } else if(this.uistate.selectedInstance) {
              opts.instance = this.uistate.selectedInstance;
              opts.saveUndo = true;
            } else {
              return false;
            }
            return true;
          }.bind(this);
          if($.isFunction(toWrap)) {
            return function(opts) {
              if(helper(opts))
                toWrap(opts);
            };
          } else  {
            return mapTable(toWrap, function(key, callback) {
              return function(opts) {
                if(helper(opts))
                  callback(opts);
              };
            });
          }
        }.bind(this);

        // Keyboard Rotate/Scale
        var rotateIncrement = Constants.keyboardRotationIncrementUnmodified;
        var scaleIncrement  = Constants.keyboardScaleFactorUnmodified;
        var rotate_left_behavior =
          Behaviors.keyhold(this.uimap, 'left')
            .onhold(ensureInstance(function(opts) {
              opts.instance.CascadingRotate(rotateIncrement);
              this.renderer.postRedisplay();
              var targetModelIndex = this.scene.ObjectToIndex(opts.instance);
              this.uilog.log(UILog.EVENT.MODEL_ROTATE,
                opts,
                {rotateBy: rotateIncrement,
                 modelIndex: targetModelIndex});
            }.bind(this)))
            .onfinish(ensureInstance(function(opts) {
              if(opts.saveUndo) {
                this.undoStack.pushCurrentState(Constants.CMDTYPE.ROTATE,
                  opts.instance);
              }
            }.bind(this)));

        var rotate_right_behavior =
          Behaviors.keyhold(this.uimap, 'right')
            .onhold(ensureInstance(function(opts) {
              opts.instance.CascadingRotate(-rotateIncrement);
              this.renderer.postRedisplay();
              var targetModelIndex = this.scene.ObjectToIndex(opts.instance);
              this.uilog.log(UILog.EVENT.MODEL_ROTATE,
                opts,
                {rotateBy: -rotateIncrement,
                 modelIndex: targetModelIndex});
            }.bind(this)))
            .onfinish(ensureInstance(function(opts) {
              if(opts.saveUndo) {
                this.undoStack.pushCurrentState(Constants.CMDTYPE.ROTATE,
                  opts.instance);
              }
            }.bind(this)));

        var scale_up_behavior =
          Behaviors.keyhold(this.uimap, 'up')
            .onhold(ensureInstance(function(opts) {
              opts.instance.CascadingScale(scaleIncrement);
              this.renderer.postRedisplay();
              var targetModelIndex = this.scene.ObjectToIndex(opts.instance);
              this.uilog.log(UILog.EVENT.MODEL_SCALE,
                opts,
                {scaleBy: scaleIncrement,
                 modelIndex: targetModelIndex});
            }.bind(this)))
            .onfinish(ensureInstance(function(opts) {
              if(opts.saveUndo) {
                this.undoStack.pushCurrentState(Constants.CMDTYPE.SCALE,
                  opts.instance);
              }
            }.bind(this)));

        var scale_down_behavior =
          Behaviors.keyhold(this.uimap, 'down')
            .onhold(ensureInstance(function(opts) {
              opts.instance.CascadingScale(1.0 / scaleIncrement);
              this.renderer.postRedisplay();
              var targetModelIndex = this.scene.ObjectToIndex(opts.instance);
              this.uilog.log(UILog.EVENT.MODEL_SCALE,
                opts,
                {scaleBy: 1.0/scaleIncrement,
                 modelIndex: targetModelIndex});
            }.bind(this)))
            .onfinish(ensureInstance(function(opts) {
              if(opts.saveUndo) {
                this.undoStack.pushCurrentState(Constants.CMDTYPE.SCALE,
                  opts.instance);
              }
            }.bind(this)));

        // Keyboard Tumble
        Behaviors.keyhold(this.uimap, 'ctrl+M')
          .onhold(ensureInstance(function(opts) {
            this.Tumble(opts, opts.instance, false);
            this.renderer.postRedisplay();
          }.bind(this)))
          .onfinish(ensureInstance(function(opts) {
            if(opts.saveUndo) {
              this.undoStack.pushCurrentState(
                Constants.CMDTYPE.SWITCHFACE, opts.instance);
            }
          }.bind(this)));

        // Copy/Paste
        Behaviors.keypress(this.uimap, 'ctrl+C')
          .onpress(function(data) {
            data.preventDefault();
            this.Copy(data);
            this.renderer.postRedisplay();
          }.bind(this));
        Behaviors.keypress(this.uimap, 'ctrl+V')
          .onpress(function(data) {
            data.preventDefault();
            this.Paste(data);
            this.renderer.postRedisplay();
          }.bind(this));

        // Undo/Redo
        Behaviors.keypress(this.uimap, 'ctrl+Z')
          .onpress(function(data) {
            data.preventDefault();
            this.insertion_behavior.cancel();
            this.Undo(data);
            this.renderer.postRedisplay();
          }.bind(this));
        Behaviors.keypress(this.uimap, 'ctrl+Y')
          .onpress(function(data) {
            data.preventDefault();
            this.insertion_behavior.cancel();
            this.Redo(data);
            this.renderer.postRedisplay();
          }.bind(this));

        // Save
        Behaviors.keypress(this.uimap, 'ctrl+S')
          .onpress(function(data) {
            this.uilog.log(UILog.EVENT.SCENE_SAVE, data, {});
            data.preventDefault();
            this.SaveScene();
          }.bind(this));

        // Delete object, Escape selection
        Behaviors.keypress(this.uimap, 'delete, backspace')
          .onpress(function(data) {
            data.preventDefault();
            this.Delete(data);
            this.renderer.postRedisplay();
          }.bind(this));
        Behaviors.keypress(this.uimap, 'escape')
          .onpress(function(data) {
            if (this.uistate.selectedInstance) {
              var targetModelIndex = this.scene.ObjectToIndex(this.uistate.selectedInstance);
              this.uilog.log(UILog.EVENT.MODEL_DESELECT,
                data,
                {modelIndex: targetModelIndex});
            }
            data.preventDefault();
            this.insertion_behavior.cancel();
            this.SelectInstance(null);
            this.renderer.postRedisplay();
          }.bind(this));

        // debug which instance is currently being manipulated
        Behaviors.keypress(this.uimap, 'ctrl+B')
          .onpress(ensureInstance(function(opts) {
            console.log(opts.instance.model.id);
          }));
      }

      // spit out bare JSON data for the scene
      Behaviors.keypress(this.uimap, 'ctrl+K')
        .onpress(function(data) {
          data.preventDefault();
          console.log(this.loader.SerializeBare(this.scene));
        }.bind(this));

      if (this.allowEdit) {
        // toggle text2scene console
        Behaviors.keypress(this.uimap, 'alt+T')
          .onpress(function(data) {
            data.preventDefault();
            this.text2scene.ToggleConsole();
          }.bind(this));
      }
      // Save image
      Behaviors.keypress(this.uimap, 'ctrl+I')
        .onpress(function(data) {
          data.preventDefault();
          this.SaveImage();
        }.bind(this));
    };

    // This encapsulates access to the current state/progress
    // of an insertion, as well as access to the instance being inserted.
    // one consequence is to ensure that the instance
    // being inserted is always valid when needed!
    App.prototype.CreateInsertionBehavior = function()
    {
      var app = this;
      var uimap = app.uimap;

      // The main course; the locally scoped, protected state;
      // YES, it's the...
      var insertInstance = null;

      function nullShim(fsm, params, next) {
        if(!params) params = {};
        params.instance = insertInstance;
        insertInstance = null;
        next(fsm, params);
      }
      var insertion_template = FSM.template()
          .output('start', 'hover', 'finish', 'cancel')
          .state('empty')
          .step('start', function(fsm, params) {
            if(params.instance) {
              insertInstance = params.instance;
              fsm.jump('up', 'start');
            }
          })
          .state('up')
          .step('mousemove', 'up', 'hover')
          .step('mousedown', 'down')
          .step('cancel', 'empty', 'cancel')
          .shim('cancel', nullShim)
          .state('down')
          .step('mousemove', 'down', 'hover')
          .step('mouseup', 'empty', 'finish')
          .shim('mouseup', nullShim)
          .step('cancel', 'empty', 'cancel')
          .shim('cancel', nullShim)
        ;

      var insertion_filter =
        Behaviors.createFilter('left', '')
          .listen(uimap, ['mousedown', 'mouseup', 'mousemove']);
      var fsm = insertion_template.compile().listen(insertion_filter);

      // expose a non-writable interface to insertInstance;
      // all re-assignment is handled by the state-machine
      fsm.isActive = function() {
        return insertInstance !== null;
      };
      fsm.instance = function() {
        return insertInstance;
      };

      return fsm;
    };

    App.prototype.ToggleBusy = function (isBusy)
    {
      this.uistate.isBusy = isBusy;
      if (isBusy)
        $('#ui').addClass('busy');
      else
        $('#ui').removeClass('busy');
    };

    App.prototype.MouseWheel = function (dx, dy, evt)
    {
      var zoom = dy * Constants.cameraZoomSpeed;
      this.camera.Zoom(zoom);
      this.uilog.log(UILog.EVENT.CAMERA_ZOOM, evt, {zoom: zoom});
      this.renderer.UpdateView();
    };

    App.prototype.Undo = function(evt)
    {
      this.undoStack.undo();
      this.uilog.log(UILog.EVENT.UNDOSTACK_UNDO, evt, {});
      this.renderer.postRedisplay();
    };

    App.prototype.Redo = function(evt)
    {
      this.undoStack.redo();
      this.uilog.log(UILog.EVENT.UNDOSTACK_REDO, evt, {});
      this.renderer.postRedisplay();
    };

    App.prototype.Copy = function(evt)
    {
      if (this.uistate.selectedInstance)
      {
        // Clear the existing copied instance, if there is one.
        if (this.uistate.copyInstance)
          this.uistate.copyInstance.Remove();
        // Set up the new copied instance.
        this.uistate.copyInstance = this.uistate.selectedInstance.Clone();

        var targetModelIndex = this.scene.ObjectToIndex(this.uistate.selectedInstance);
        this.uilog.log(UILog.EVENT.MODEL_COPY, evt,
          {modelIndex: targetModelIndex});

        this.Publish('CopyCompleted');
      }
    };

    App.prototype.Paste = function(opts)
    {
      if (this.uistate.copyInstance)
      {
        // Cancel any other insertions that are in-progress
        this.insertion_behavior.cancel();

        // get a copy and initialize an insertion using it
        var hi = this.uistate.copyInstance.Clone();
        this.insertion_behavior.start({instance: hi});

        hi.renderState.isSelected = false;
        hi.renderState.isPickable = false;
        hi.renderState.isInserting = true;

        hi.SetParent(null);

        // Necessary to get the inserting model to show up
        // without having to move the mouse.
        // If no mouse position data is provided, then we
        // assume that we can wait until the mouse starts moving
        if(opts)
          this.ContinueModelInsertion(opts.x, opts.y);

        var targetModelIndex = this.scene.ObjectToIndex(this.uistate.copyInstance);
        this.uilog.log(UILog.EVENT.MODEL_PASTE, opts,
          {modelIndex: targetModelIndex});
      }
    };

    App.prototype.Delete = function(evt)
    {
      var selectedMinst = this.uistate.selectedInstance;
      if (selectedMinst)
      {
        var targetModelIndex = this.scene.ObjectToIndex(selectedMinst);
        this.uilog.log(UILog.EVENT.MODEL_DELETE, evt,
            {modelIndex: targetModelIndex});

        this.RemoveModelInstance(selectedMinst);
        this.undoStack.pushCurrentState(Constants.CMDTYPE.DELETE, null);
      }
    };

    App.prototype.Tumble = function(evt, mInst, doRecordUndoEvent)
    {
      mInst.Tumble();
      doRecordUndoEvent && this.undoStack.pushCurrentState(Constants.CMDTYPE.SWITCHFACE, mInst);
      var targetModelIndex = this.scene.ObjectToIndex(mInst);
      this.uilog.log(UILog.EVENT.MODEL_TUMBLE, evt,
        {modelIndex: targetModelIndex});
      this.renderer.postRedisplay();
    };

    App.prototype.LoadScene = function(on_success, on_error)
    {
      if (this.onLoadUrl) {
        getViaJquery(this.onLoadUrl)
          .error(on_error).success(function(json) {
            var scene_json = JSON.parse(json.scene);
            this.uilog.fromJSONString(json.ui_log);
            this.loader.LoadFromNetworkSerialized(this.scene,
              scene_json,
              this.assman,
              on_success);
          }.bind(this));
      } else {
        console.log("Cannot load scene: No load url.");
        this.CreateEmpty();
      }
    };

    App.prototype.SaveScene_ = function(on_success, on_error)
    {
      if (this.onSaveUrl) {
        var serialized = this.loader.SerializeForNetwork(this.scene);
        var preview = (this.savePreview)? this.GetPreviewImageData():undefined;
        putViaJQuery(this.onSaveUrl,
          {
            scene: JSON.stringify(serialized),
            ui_log: this.uilog.stringify(),
            preview: preview
          }).error(on_error).success(on_success);
      } else {
        showAlert("Cannot save scene: No save url", 'alert-danger');
      }
    };

    App.prototype.SaveSceneMeta = function(on_success, on_error)
    {
      if (this.onSaveUrl) {
        var data = $('#EditSceneForm').serializeObject();
        //console.log(data);
        putViaJQuery(this.onSaveUrl, data).error(on_error).success(on_success);
      } else {
        showAlert("Cannot save scene meta data: No save url", 'alert-danger');
      }
      $('#EditSceneModal').modal('hide');
    };

    App.prototype.Close = function()
    {
      if (this.autoSaveOnClose) {
        // Automatically saves the scene
        this.SaveAndCloseScene();
      } else {
        var hasChanges = !this.undoStack.isEmpty();
        console.log("has changes " + hasChanges);
        if (hasChanges) {
          // Ask if user wants to save
          $('#ExitSceneModal').modal('show');
        } else {
          this.CloseScene();
        }
      }
    };

    App.prototype.SaveAndCloseScene = function() {
      $('#ExitSceneModal').modal('hide');
      this.SaveScene(
        function() { // on success
          this.CloseScene();
        }.bind(this),
        function() { // on failure
          // Add dialog to ask if the user wants to leave
          // even though nothing was saved in event of error
          $('#ExitSceneErrorSavingModal').modal('show');
        }
      );
    };

    App.prototype.CloseScene = function() {
      $('#ExitSceneModal').modal('hide');
      $('#ExitSceneErrorSavingModal').modal('hide');
      if (this.onCloseCallback) {
        this.onCloseCallback(this);
      } else {
        this.ExitTo(this.on_close_url);
      }
    };

     App.prototype.ExitTo = function(destination)
    {
      window.onbeforeunload = null;
      window.location.href = destination;
    };

    // This exists to permit us to drag objects around
    // and intersect the surface underneath them (instead of the object itself)
    // so that we can actually place the object...
    App.prototype.ToggleSuppressPickingOnSelectedInstance = function (toggle)
    {
      if (this.uistate.selectedInstance)
      {
        var wasPickable =
          this.uistate.selectedInstance.renderState.isPickable;
        this.uistate.selectedInstance.renderState.isPickable =
          !toggle;

        // If pickability changed ensure picking pass runs now to avoid out of sync pick buffer
        if (wasPickable !==
          this.uistate.selectedInstance.renderState.isPickable)
        {
          this.renderer.pickingDrawPass();
        }
      }
    };

    App.prototype.RemoveModelInstance = function (mInst)
    {
      mInst.Publish('Removed');
      mInst.Remove();
      this.scene.UpdateModelList();
      this.renderer.postRedisplay();
    };

    App.prototype.SelectInstance = function (mInst)
    {
      // Deselect the current selected instance
      var oldsi = this.uistate.selectedInstance;
      if (oldsi)
      {
        oldsi.Unsubscribe('Removed', this);
        oldsi.renderState.isSelected = false;
        this.uistate.selectedInstance = null;
        this.scene.DetachManipulators();
      }

      // Select the new one
      if (mInst)
      {
        mInst.Subscribe('Removed', this, function ()
        {
          this.SelectInstance(null);
        });
        mInst.renderState.isSelected = true;
        this.uistate.selectedInstance = mInst;
        this.scene.AttachManipulators(mInst);
      }
      this.Publish('SelectedInstanceChanged', oldsi, mInst);
    };

    App.prototype.PickTriangle = function (x, y)
    {
      return this.renderer.picker.PickTriangle(x, y, this.camera, this.renderer);
    };

    // This call is only being used by the Search Controller.
    // It may be very poorly designed for anything else...
    App.prototype.BeginModelInsertion = function (modelid, metadata, callback)
    {
      // If there is an existing insert instance (meaning, we were already in
      // model insertion mode), then clear this hoverinstance and release
      // the previous model
      this.insertion_behavior.cancel();

      // Clear the current selection (gets rid of widgets, etc.)
      this.SelectInstance(null);

      // Now, fetch the new model, and when it is ready,
      // set the new insert instance.
      // Don't forget to call back into the Search widget
      // so that things can be updated appropriately there.
      this.assman.GetModel(modelid, function (model)
      {
        model.metadata = metadata;
        console.log("Got metadata: ");
        console.log(model.metadata);

        if(this.insertion_behavior.isActive())  {
          console.log("ERROR!!!  Race On Model Insertion!");
          console.log("   Last One in wins!");
          this.insertion_behavior.cancel();
        }
        var hi = new ModelInstance(model, null);
        this.insertion_behavior.start({instance: hi});

        hi.renderState.isPickable = false;
        hi.renderState.isInserting = true;
        hi.SetReasonableScale(this.scene);
        this.renderer.postRedisplay();
        callback();
      }.bind(this));
    };

    App.prototype.ContinueModelInsertion = function (x, y)
    {
      var hi = this.insertion_behavior.instance();
      var intersect = this.PickTriangle(x, y);
      if (intersect)
      {
        intersect.inst = this.scene.IndexToObject(intersect.modelID);
        hi.UpdateStateFromRayIntersection(intersect);
      }
      else
      {
        hi.SetParent(null);
      }
      this.scene.UpdateModelList();
      this.renderer.postRedisplay();
    };

    App.prototype.CancelModelInsertion = function (hi)
    {
      this.searchController.ResultDeselected(hi.model.id);
      this.RemoveModelInstance(hi);
      this.renderer.postRedisplay();
    };

    App.prototype.FinishModelInsertion = function (hi)
    {
      // If the click happened while the mouse was over empty space
      // (and thus the insert instance has no parent),
      // treat this the same as canceling the insert.
      if (!hi.parent)
      {
        this.CancelModelInsertion(hi); // A little clunky.  Oh well!
      }
      else
      // Otherwise, leave the model in the scene and clean up.
      {
        this.searchController.ResultDeselected(hi.model.id);
        hi.renderState.isPickable = true;
        hi.renderState.isInserting = false;

        this.SelectInstance(hi);
        this.undoStack.pushCurrentState(Constants.CMDTYPE.INSERT, hi);
        this.renderer.postRedisplay();
      }
    };

    App.prototype.SaveImage = function(maxWidth,maxHeight) {
      var dataUrl = this.GetImageData(maxWidth,maxHeight);
      window.open(dataUrl);
    };

    App.prototype.GetPreviewImageData = function() {
      return this.GetImageData(Constants.previewMaxWidth, Constants.previewMaxHeight);
    };

    App.prototype.GetImageData = function(maxWidth,maxHeight) {
      this.renderer.UpdateView();
      var dataUrl  = getTrimmedCanvasDataUrl(this.canvas,maxWidth,maxHeight);
      return dataUrl;
    };

    // Exports
    return App;

  });
