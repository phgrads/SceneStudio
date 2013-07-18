'use strict';

define([
	'Constants',
	'Camera',
	'FPCamera',
	'Renderer',
	'AssetManager',
	'ModelInstance',
	'Scene',
	'SearchController',
    'ArchitectureGenerator',
	'Manipulators',
    'UndoStack',
	'Toolbar',
	'CameraControls',
	'PubSub',
	'SplitView',
	'uimap',
	'uibehaviors',
	'fsm',
    'UILog',
	'jquery'
],
function (Constants, Camera, Renderer, AssetManager, ModelInstance, Scene, SearchController,
		  ArchitectureGenerator, Manipulators, UndoStack, Toolbar, CameraControls, PubSub, SplitView, uimap, Behaviors, FSM, ViewPortOptimizer)
{
    // support function should be factored out...?
    function mapTable(table, perField) {
        var result = {};
        for(var key in table)
            result[key] = perField(key, table[key]);
        return result;
    }

    function UIState(gl)
    {
        // Model selection
        this.selectedInstance = null;

        // Model copying/pasting
        this.copyInstance = null;

        this.isBusy = false;
    }

function App(canvas, mode)
    {
		// Extend PubSub
		PubSub.call(this);
	this.mode = mode; 
        this.canvas = canvas;

        // ensure that AJAX requests to Rails will properly
        // include the CSRF authenticity token in their headers
        $.ajaxSetup({
            headers: {
                'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
            }
        });
        
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
        this.renderer = new Renderer(canvas, this.scene);
        this.viewportoptimizer = new ViewPortOptimizer(this.renderer, this.scene, this.camera, this);
        this.assman = new AssetManager(this.renderer.gl_);
		this.uistate = new UIState(this.renderer.gl_);

        preventSelection(this.canvas);

        this.scene.AddManipulator(new Manipulators.RotationManipulator(this.renderer.gl_));
		this.scene.AddManipulator(new Manipulators.ScaleManipulator(this.renderer.gl_));

        this.AttachEventHandlers();

		this.undoStack = new UndoStack.UndoStack(this, Constants.undoStackMaxSize);
		this.toolbar = new Toolbar(this);
		this.cameraControls = new CameraControls(this);
        this.searchController = new SearchController(this);
        this.architectureGenerator = new ArchitectureGenerator(this);
        this.uilog = new UILog.UILog();
		
		SplitView.MakeSplitView({
			leftElem: $('#graphicsOverlay'),
			rightElem: $('#searchArea'),
			rightMinWidth: Constants.searchAreaMinWidth,
			rightMaxWidth: Constants.searchAreaMaxWidth,
			snapToGrid: Constants.searchAreaResizeGrid
		});
    }
	
	// Extend PubSub
	App.prototype = Object.create(PubSub.prototype);
	
    App.prototype.Launch = function ()
    {
        this.LoadScene(
        function() { // on success finish up some setup
			this.camera.SaveStateForReset();
			this.camera.UpdateSceneBounds(this.scene.Bounds());
            this.undoStack.clear();
            this.uilog.log(UILog.EVENT.SCENE_LOAD, null);
            this.renderer.postRedisplay();
        }.bind(this),
        function() { // on failure create an empty room
            this.assman.GetModel('room', function (model)
            {
                this.scene.Reset(new ModelInstance(model, null));
                this.camera.SaveStateForReset();
                this.camera.UpdateSceneBounds(this.scene.Bounds());
                this.undoStack.clear();
                this.uilog.log(UILog.EVENT.SCENE_CREATE, null);
                this.renderer.postRedisplay();
            }.bind(this));
        }.bind(this)
        );
		
        
		this.renderer.resizeEnd();
        this.UpdateView();
    };
    
    App.prototype.UpdateView = function ()
    {
        this.renderer.view_ = this.camera.LookAtMatrix();
        mat4.multiply(this.renderer.proj_, this.renderer.view_,
                      this.renderer.viewProj_);
        this.renderer.postRedisplay();
    };
    
    App.prototype.AttachEventHandlers = function ()
    {
        // Try to prevent accidental navigation away from app
        window.onbeforeunload = function(e) {
            return 'If you leave this page, you may lose unsaved work!'
        }
        
        /*** Behaviors are specified here ***/
        
        // orbiting rotation
        var orbiting_behavior =
            Behaviors.mousedrag(this.uimap, 'right')
            .ondrag(function(data) {
                this.camera.OrbitLeft(-data.dx * Constants.cameraOrbitSpeed);
                this.camera.OrbitUp(data.dy * Constants.cameraOrbitSpeed);
                this.UpdateView();
            }.bind(this));

        // dollying
        var dollying_behavior =
            Behaviors.mousedrag(this.uimap, 'middle, shift+right')
            .ondrag(function(data) {
                this.camera.DollyLeft(data.dx * Constants.cameraDollySpeed);
                this.camera.DollyUp(data.dy * Constants.cameraDollySpeed);
                this.UpdateView();
            }.bind(this));
        
        // no need to install handlers, as events are
        // dynamically routed by the machine
        var focus = this.focusMachine = this.CreateFocusMachine();
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
                this.CancelModelInsertion(data.instance)
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
        
        // open dialog
        Behaviors.keypress(this.uimap, 'Q')
            .onpress(function(data) {
                this.architectureGenerator.openDialog();
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
		}.bind(this))
    };
    
    // HOW TO MAKE AN OBJECT FOCUSABLE:
    //  (1) The object must be pickable
    //  (2) The object must supply a 'focus_listener' member object
    //  (3) This object must have an FSM-like listen/dispatch interface
    //          to which events will be routed during focus
    //  (4) Events which will be dispatched:
    //          mousedown, mouseup, mousemove,
    //          keydown, keyup
    //          focus, defocus
    // The focus machine built here is responsible for centralizing
    // and managing the concept of application focus.
    App.prototype.CreateFocusMachine = function()
    {
        var app = this;
        var uimap = app.uimap;
        
        // hidden state: which object is currently focused on
        var focusedObject = null;
        // hidden state: keep track of mouse position so we can spoof...
        var prevX = null, prevY = null;
        function xyShim(fsm, params, next) {
            prevX = params.x;
            prevY = params.y;
            next(fsm, params);
        }
        
        // "semaphore" for keeping track of how many extra
        // interruptions are occuring right now.
        var extra_interruptions = 0;
        
        function augmentShim(fsm, params, next) {
            params.lockFocus = fsm.lock.bind(fsm);
            params.unlockFocus = fsm.unlock.bind(fsm);
            params.app = app;
            next(fsm, params);
        }
        
        function focusable(obj) {
            return obj && obj.focus_listener;
        }
        function focusOn(fsm, target) {
            if(focusable(target)) {
                focusedObject = target;
                // hook up the new object
                target.focus_listener.listen(fsm);
                // and inform it that it's been focused on
                fsm.emit('focus', {app: app});
            }
        }
        function defocusShim(fsm, params, next) {
            if(focusedObject) {
                fsm.emit('defocus', {app: app});
                fsm.detach();
                focusedObject = null;
            }
            if(next) next(fsm, params); // guard to allow non-shim use
        }
        function updateFocus(fsm, x, y) {
            var oldobj = focusedObject;
            var newobj = app.renderer.picker.PickObject(x, y, app.renderer);
            if (newobj !== oldobj) {
                defocusShim(fsm);
                focusOn(fsm, newobj);
            }
        }
        function reset(fsm, params) {
            fsm.jump('free');
            updateFocus(fsm, prevX, prevY);
        }
        var uimap_signals = ['mousedown', 'mousemove', 'mouseup',
                             'keydown', 'keyup'];
        var focus_template = FSM.template()
            .output(uimap_signals) // spoof uimap to the object...
            .output('focus', 'defocus') // extra signals
            .state('free')
                .step('mousemove', function(fsm, params) {
                    updateFocus(fsm, params.x, params.y);
                    fsm.emit('mousemove', params);
                })
                .repeat('mousedown', 'mouseup', 'keydown', 'keyup')
                    .shim('mousemove', xyShim)
                    .shim(uimap_signals, augmentShim)
                .step('lock', 'locked')
                .step('start_interruption', 'interrupted')
                    .shim('start_interruption', defocusShim)
            .state('interrupted')
                // ERROR: need semaphore counter for this state...
                // ALSO: should have some kind of global UI monitor/reset
                //          for safety...
                .step('start_interruption', function(fsm, params) {
                    extra_interruptions += 1;
                })
                .step('finish_interruption', function(fsm, params) {
                    if(extra_interruptions > 0)
                        extra_interruptions -= 1;
                    else
                        reset(fsm, params);
                })
                .step('mousemove', 'interrupted') // jump nowhere
                    .shim('mousemove', xyShim) // but update xy data
            .state('locked')
                .step('start_interruption', 'interrupted')
                    .shim('start_interruption', defocusShim)
                .repeat(uimap_signals)
                    .shim('mousemove', xyShim)
                    .shim(uimap_signals, augmentShim)
                // call from focused object to release lock
                .step('unlock', reset)
            ;
        
        var fsm = focus_template.compile().listen(uimap);
        
        // non-writable interface
        fsm.isFocused = function() { // not whether it's locked...
            return !!(focusedObject);
        }
        fsm.isLocked = function() {
            return fsm.curr_state == 'locked';
        }
        fsm.instance = function() {
            return focusedObject;
        }
        
        return fsm;
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
    }
    
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
        this.UpdateView();
    };
	
	App.prototype.Undo = function()
	{
		this.undoStack.undo();
		this.renderer.postRedisplay();
	}
	
	App.prototype.Redo = function()
	{
		this.undoStack.redo();
		this.renderer.postRedisplay();
	}
    
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
	}
	
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
	}
    
	App.prototype.Delete = function()
	{
		var selectedMinst = this.uistate.selectedInstance;
		if (selectedMinst)
		{
			this.RemoveModelInstance(selectedMinst);
			this.undoStack.pushCurrentState(UndoStack.CMDTYPE.DELETE, null);
		}
	}
	
	App.prototype.Tumble = function(mInst, doRecordUndoEvent)
	{
		mInst.Tumble();
		doRecordUndoEvent && this.undoStack.pushCurrentState(UndoStack.CMDTYPE.SWITCHFACE, mInst);
		this.renderer.postRedisplay();	
	}
	
	
	
	App.prototype.SaveScene = function(on_success, on_error)
	{
        on_success = on_success || function() {
            alert('saved!  Please develop a better UI alert');
        };
        on_error = on_error || function() {
            alert('did not save!  Please develop a better UI alert');
        };
        var serialized = this.scene.SerializeForNetwork();
        $.ajax({
            type: 'POST',
            url: this.base_url + '/scenes/' +
                 this.scene_record.id,
            data: {
                _method: 'PUT', // PUT verb for Rails
                scene_file: JSON.stringify(serialized),
                ui_log: this.uilog.stringify()
            },
            dataType: 'json',
            timeout: 10000
        }).error(on_error).success(on_success);
	}
    
    App.prototype.ExitTo = function(destination)
    {
        this.SaveScene(function() { // on success
            window.onbeforeunload = null;
            window.location.href = this.on_close_url;
        }.bind(this)); // should add dialog to ask if the user wants to leave
        // even though nothing was saved in event of error
    }
    
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
    App.prototype.BeginModelInsertion = function (modelid, callback)
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
