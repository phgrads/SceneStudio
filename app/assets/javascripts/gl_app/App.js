'use strict';

define([
  './Constants',
  './Camera',
  './Renderer',
  './AssetManager',
  './ModelInstance',
  './Scene',
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
  'jquery'
],
  function (Constants, Camera, Renderer, AssetManager, ModelInstance, Scene, SearchController,
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

    function App(canvas)
    {
      // Extend PubSub
      PubSub.call(this);

      this.canvas = canvas;

      // the following variables from globalViewData
      // should be rendered by the jade template
      this.user_record    = window.globalViewData.user;
      this.scene_record   = window.globalViewData.scene;
      this.on_close_url   = window.globalViewData.on_close_url;
      this.user_name  = window.globalViewData.user_name;
      this.scene_name = window.globalViewData.scene_name;
      this.base_url   = window.globalViewData.base_url;

      this.uimap = uimap.create(canvas);

      this.camera = new Camera();
      var cameraData = JSON.parse("{\"eyePos\":{\"0\":3.776055335998535,\"1\":-187.77793884277344,\"2\":164.77069091796875,\"buffer\":{\"byteLength\":12},\"length\":3,\"byteOffset\":0,\"byteLength\":12},\"lookAtPoint\":{\"0\":0,\"1\":1,\"2\":0,\"buffer\":{\"byteLength\":12},\"length\":3,\"byteOffset\":0,\"byteLength\":12},\"upVec\":{\"0\":-0.01314918976277113,\"1\":0.6573730707168579,\"2\":0.7534525990486145,\"buffer\":{\"byteLength\":12},\"length\":3,\"byteOffset\":0,\"byteLength\":12},\"lookVec\":{\"0\":-0.015068011358380318,\"1\":0.7533015012741089,\"2\":-0.6575027108192444,\"buffer\":{\"byteLength\":12},\"length\":3,\"byteOffset\":0,\"byteLength\":12},\"leftVec\":{\"0\":-0.9998010993003845,\"1\":-0.019998691976070404,\"2\":0,\"buffer\":{\"byteLength\":12},\"length\":3,\"byteOffset\":0,\"byteLength\":12}}");
      $.extend(this.camera, cameraData);

      this.scene = new Scene();
      this.renderer = new Renderer(canvas, this.scene, undefined, this.camera);
      this.assman = new AssetManager(this.renderer.gl_);
      this.uistate = new UIState(this.renderer.gl_);
      this.uilog = new UILog.UILog();

      // Initialize text2scene
      this.text2scene = new TextToScene(this);

      this.scene.AddManipulator(new Manipulators.RotationManipulator(this.renderer.gl_));
      this.scene.AddManipulator(new Manipulators.ScaleManipulator(this.renderer.gl_));

      this.AttachEventHandlers();

      this.undoStack = new UndoStack.UndoStack(this, Constants.undoStackMaxSize);
      this.toolbar = new Toolbar(this);
      this.cameraControls = new CameraControls(this);
      this.searchController = new SearchController(this);

      SplitView.MakeSplitView({
        leftElem: $('#graphicsOverlay'),
        rightElem: $('#searchArea'),
        rightMinWidth: Constants.searchAreaMinWidth,
        rightMaxWidth: Constants.searchAreaMaxWidth,
        snapToGrid: Constants.searchAreaResizeGrid
      });

      // TODO: Clean up MTurk stuff
      this.mturk = (window.globalViewData.assignment || window.globalViewData.task_id);
      if (this.mturk) {
        $('#mturkoverlay').css("display","inline");
      }
      this.onSaveCallback = window.globals.onSaveCallback;

      preventSelection(this.canvas);
    }

    // Extend PubSub
    App.prototype = Object.create(PubSub.prototype);

    // TODO: Clean up MTurk stuff
    App.prototype.SaveScene = function() {
      if (this.onSaveCallback) {
        this.onSaveCallback(this);
      } else if(this.mturk) {
        if(this.scene.modelList.length > 1){
          this.SaveMTurkResults();
        }
        else{
          alert("You haven't added anything to the scene yet");
        }
      } else{
        this.SaveScene_();
      }
    };

    // TODO: Clean up MTurk stuff
    App.prototype.SaveMTurkResults = function(on_success, on_error){
      on_success = on_success || function(response) {
        document.body.innerHTML = "<p>Thanks for participating!</p>" +
          "<p>Your coupon code is: " + response.coupon_code + "</p>" +
          "Copy your code back to the first tab and close this tab when done.";
      };
      on_error = on_error || function() { alert("Error saving results. Please close tab and do task again.");};
      var results = this.GetSceneResults();
      submit_mturk_report(results).error(on_error).success(on_success);
    };

    App.prototype.GetSceneResults = function() {
      var finalcamera=this.camera.toJSONString();
      this.uilog.log('STATE_SCENE',finalcamera);
      var serialized = this.scene.SerializeForNetwork();
      var results = {
        scene_file: JSON.stringify(serialized),
        ui_log: this.uilog.stringify()
      };
      return results;
    };

    App.prototype.Launch = function () {
      this.LoadScene(
        function() { // on success finish up some setup
          this.camera.SaveStateForReset();
          this.camera.UpdateSceneBounds(this.scene.Bounds());
          this.camera.InitToSceneBounds();
          this.undoStack.clear();
          this.renderer.resizeEnd();
          this.renderer.UpdateView();
        }.bind(this),
        function() { // on failure create an empty room
          this.assman.GetModel('room', function (model)
          {
            this.scene.Reset(new ModelInstance(model, null));
            this.camera.UpdateSceneBounds(this.scene.Bounds());
            this.camera.InitToSceneBounds();
            this.undoStack.clear();
            this.renderer.resizeEnd();
            this.renderer.UpdateView();
          }.bind(this));
        }.bind(this));
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
            this.camera.OrbitLeft(-data.dx * Constants.cameraOrbitSpeed);
            this.camera.OrbitUp(data.dy * Constants.cameraOrbitSpeed);
            this.renderer.UpdateView();
          }.bind(this));

      // dollying
      var dollying_behavior =
        Behaviors.mousedrag(this.uimap, 'middle, shift+right')
          .ondrag(function(data) {
            this.camera.DollyLeft(data.dx * Constants.cameraDollySpeed);
            this.camera.DollyUp(data.dy * Constants.cameraDollySpeed);
            this.renderer.UpdateView();
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

      // mouse wheel scrolls
      addWheelHandler(this.canvas, this.MouseWheel.bind(this));

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
          }.bind(this)))
          .onfinish(ensureInstance(function(opts) {
            if(opts.saveUndo)
              this.undoStack.pushCurrentState(UndoStack.CMDTYPE.ROTATE,
                opts.instance);
          }.bind(this)));

      var rotate_right_behavior =
        Behaviors.keyhold(this.uimap, 'right')
          .onhold(ensureInstance(function(opts) {
            opts.instance.CascadingRotate(-rotateIncrement);
            this.renderer.postRedisplay();
          }.bind(this)))
          .onfinish(ensureInstance(function(opts) {
            if(opts.saveUndo)
              this.undoStack.pushCurrentState(UndoStack.CMDTYPE.ROTATE,
                opts.instance);
          }.bind(this)));

      var scale_up_behavior =
        Behaviors.keyhold(this.uimap, 'up')
          .onhold(ensureInstance(function(opts) {
            opts.instance.CascadingScale(scaleIncrement);
            this.renderer.postRedisplay();
          }.bind(this)))
          .onfinish(ensureInstance(function(opts) {
            if(opts.saveUndo)
              this.undoStack.pushCurrentState(UndoStack.CMDTYPE.SCALE,
                opts.instance);
          }.bind(this)));

      var scale_down_behavior =
        Behaviors.keyhold(this.uimap, 'down')
          .onhold(ensureInstance(function(opts) {
            opts.instance.CascadingScale(1.0 / scaleIncrement);
            this.renderer.postRedisplay();
          }.bind(this)))
          .onfinish(ensureInstance(function(opts) {
            if(opts.saveUndo)
              this.undoStack.pushCurrentState(UndoStack.CMDTYPE.SCALE,
                opts.instance);
          }.bind(this)));

      // Keyboard Tumble
      Behaviors.keyhold(this.uimap, 'M')
        .onhold(ensureInstance(function(opts) {
          this.Tumble(opts.instance, false);
          this.renderer.postRedisplay();
        }.bind(this)))
        .onfinish(ensureInstance(function(opts) {
          if(opts.saveUndo)
            this.undoStack.pushCurrentState(
              UndoStack.CMDTYPE.SWITCHFACE, opts.instance);
        }.bind(this)));

      // Copy/Paste
      Behaviors.keypress(this.uimap, 'C, ctrl+C')
        .onpress(function(data) {
          data.preventDefault();
          this.Copy();
          this.renderer.postRedisplay();
        }.bind(this));
      Behaviors.keypress(this.uimap, 'V, ctrl+V')
        .onpress(function(data) {
          data.preventDefault();
          this.Paste(data);
          this.renderer.postRedisplay();
        }.bind(this));

      // Undo/Redo
      Behaviors.keypress(this.uimap, 'Z, ctrl+Z')
        .onpress(function(data) {
          data.preventDefault();
          this.insertion_behavior.cancel();
          this.Undo();
          this.renderer.postRedisplay();
        }.bind(this));
      Behaviors.keypress(this.uimap, 'Y, ctrl+Y')
        .onpress(function(data) {
          data.preventDefault();
          this.insertion_behavior.cancel();
          this.Redo();
          this.renderer.postRedisplay();
        }.bind(this));

      // Save
      Behaviors.keypress(this.uimap, 'S, ctrl+S')
        .onpress(function(data) {
          data.preventDefault();
          this.SaveScene();
        }.bind(this));

      // Delete object, Escape selection
      Behaviors.keypress(this.uimap, 'delete, backspace')
        .onpress(function(data) {
          data.preventDefault();
          this.Delete();
          this.renderer.postRedisplay();
        }.bind(this));
      Behaviors.keypress(this.uimap, 'escape')
        .onpress(function(data) {
          data.preventDefault();
          this.insertion_behavior.cancel();
          this.SelectInstance(null);
          this.renderer.postRedisplay();
        }.bind(this));

      // debug which instance is currently being manipulated
      Behaviors.keypress(this.uimap, 'X')
        .onpress(ensureInstance(function(opts) {
          console.log(opts.instance.model.id);
        }));

      // spit out bare JSON data for the scene
      Behaviors.keypress(this.uimap, 'K')
        .onpress(function() {
          console.log(this.scene.SerializeBare());
        }.bind(this));

      // toggle text2scene console
      Behaviors.keypress(this.uimap, 'T')
        .onpress(function() {
          this.text2scene.ToggleConsole();
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

    App.prototype.MouseWheel = function (dx, dy)
    {
      this.camera.Zoom(dy * Constants.cameraZoomSpeed);
      this.renderer.UpdateView();
    };

    App.prototype.Undo = function()
    {
      this.undoStack.undo();
      this.renderer.postRedisplay();
    };

    App.prototype.Redo = function()
    {
      this.undoStack.redo();
      this.renderer.postRedisplay();
    };

    App.prototype.Copy = function()
    {
      if (this.uistate.selectedInstance)
      {
        // Clear the existing copied instance, if there is one.
        if (this.uistate.copyInstance)
          this.uistate.copyInstance.Remove();
        // Set up the new copied instance.
        this.uistate.copyInstance = this.uistate.selectedInstance.Clone();

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
      }
    };

    App.prototype.Delete = function()
    {
      var selectedMinst = this.uistate.selectedInstance;
      if (selectedMinst)
      {
        this.RemoveModelInstance(selectedMinst);
        this.undoStack.pushCurrentState(UndoStack.CMDTYPE.DELETE, null);
      }
    };

    App.prototype.Tumble = function(mInst, doRecordUndoEvent)
    {
      mInst.Tumble();
      doRecordUndoEvent && this.undoStack.pushCurrentState(UndoStack.CMDTYPE.SWITCHFACE, mInst);
      this.renderer.postRedisplay();
    };

    App.prototype.LoadScene = function(on_success, on_error)
    {
      getViaJquery(this.base_url + '/scenes/' +
        this.scene_record.id + '/load')
        .error(on_error).success(function(json) {
          var scene_json = JSON.parse(json.scene);
          this.uilog.fromJSONString(json.ui_log);
          this.scene.LoadFromNetworkSerialized(scene_json,
            this.assman,
            on_success);
        }.bind(this));
    };

    App.prototype.SaveScene_ = function(on_success, on_error)
    {
      on_success = on_success || function() {
        alert('saved!  Please develop a better UI alert');
      };
      on_error = on_error || function() {
        alert('did not save!  Please develop a better UI alert');
      };
      var serialized = this.scene.SerializeForNetwork();
      putViaJQuery(this.base_url + '/scenes/' + this.scene_record.id,
        {
          scene_file: JSON.stringify(serialized),
          ui_log: this.uilog.stringify()
        }).error(on_error).success(on_success);
    };

    App.prototype.ExitTo = function(destination)
    {
      this.SaveScene(function() { // on success
        window.onbeforeunload = null;
        window.location.href = this.on_close_url;
      }.bind(this)); // should add dialog to ask if the user wants to leave
      // even though nothing was saved in event of error
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
        this.undoStack.pushCurrentState(UndoStack.CMDTYPE.INSERT, hi);
        this.renderer.postRedisplay();
      }
    };

    // Exports
    return App;

  });
