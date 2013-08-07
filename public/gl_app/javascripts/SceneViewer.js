'use strict';

define([
    'Constants',
    'Camera',
    'FPCamera',
    'Renderer',
    'AssetManager',
    'ModelInstance',
    'Scene',
    'CameraControls',
    'PubSub',
    'uimap',
    'uibehaviors',
    'fsm',
    'UILog',
    'jquery',
    'game-shim'
], function (Constants, Camera, FPCamera, Renderer, AssetManager, ModelInstance, Scene, CameraControls, PubSub, uimap,
             Behaviors, FSM, UILog) {

        function SceneViewer(canvas) {
            // Extend PubSub
            PubSub.call(this);

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
            this.scene = new Scene();
            this.camera = new FPCamera(this.scene);
            this.renderer = new Renderer(canvas, this.scene, undefined, this.camera);
            this.assman = new AssetManager(this.renderer.gl_);
            this.uilog = new UILog.UILog();

            this.bestCollected = false;
            this.worstCollected = false;

            this.AttachEventHandlers();

            preventSelection(this.canvas);
        }

        // Extend PubSub
        SceneViewer.prototype = Object.create(PubSub.prototype);

        // TODO: Move camera event handling into camera class
        SceneViewer.prototype.AttachViewSelectionEventHandlers = function() {

            var pointerLockChange = function() {
                if (document.pointerLockElement === this.canvas) {
                    this.camera.ResetSavedState();
                    this.renderer.UpdateView();
                } else {
                    //console.log("Pointer Lock was lost.");
                }
            }.bind(this);
            var fullscreenChange = function() {
                this.camera.SaveStateForReset();
                this.canvas.requestPointerLock();
            }.bind(this);
            this.canvas.addEventListener( 'click', function() {
                this.canvas.requestFullScreen();
            }.bind(this));

            // TODO: Clean and normalize these hookups
            document.addEventListener('fullscreenchange', fullscreenChange, false);
            document.addEventListener('mozfullscreenchange', fullscreenChange, false);
            document.addEventListener('webkitfullscreenchange', fullscreenChange, false);


            document.addEventListener('pointerlockchange', pointerLockChange, false);
            document.addEventListener('mozpointerlockchange', pointerLockChange, false);
            document.addEventListener('webkitpointerlockchange', pointerLockChange, false);

            // TODO: Use Behaviors FSM
            document.addEventListener("mousemove", function(e) {
                // FP view manipulation
                var movementX = e.movementX;
                var movementY = e.movementY;
                //console.log("movementX=" + movementX, "movementY=" + movementY);
                this.camera.PanLeft( -1 * movementX/(Math.PI * 100));
                this.camera.PanUp(movementY/(Math.PI * 100));
                this.renderer.UpdateView();
            }.bind(this), false);

            // FP movement manipulation
            document.addEventListener("keydown", function(e) {
                var movespeed = 5;
                var actualkey=String.fromCharCode(e.keyCode);
                //console.log(actualkey);
                if(actualkey == "A") {
                    this.camera.DollyLeft(movespeed);
                    this.renderer.UpdateView();
                }
                else if(actualkey=="W") {
                    this.camera.DollyForward(movespeed);
                    this.renderer.UpdateView();
                }
                else if(actualkey=="S") {
                    this.camera.DollyForward(-1 * movespeed);
                    this.renderer.UpdateView();
                }
                else if(actualkey=="D") {
                    this.camera.DollyLeft(-1 * movespeed);
                    this.renderer.UpdateView();
                }
                else if(e.keyCode == 13) {
                    if( !this.bestCollected ) {
                        var c = confirm("Save current view as best view?");
                        if(c) {
                            this.SaveCamera(function(){});
                            this.bestCollected = true;
                        }
                    }
                    else if( !this.worstCollected) {
                        var c = confirm("Save current view as worst view?");
                        if(c){
                            this.SaveCamera(function(){});
                            this.worstCollected = true;
                            this.ExitTo(this.on_close_url);
                        }
                    }
                }
            }.bind(this));
        };

        // TODO: Factor this out
        SceneViewer.prototype.LaunchSetup = function() {
            var pos = this.scene.Bounds().RandomPointInside();
            var eyePos = vec3.create([pos[0], pos[1] ,50]);
            this.camera.Reset(eyePos);
            this.camera.SaveStateForReset();
            this.AttachViewSelectionEventHandlers();
        };

        SceneViewer.prototype.Launch = function () {
            this.LoadScene(
                function() { // on success finish up some setup0
                    this.LaunchSetup();
                    this.camera.UpdateSceneBounds(this.scene.Bounds());
                }.bind(this),
                function() { // on failure create an empty room
                    this.assman.GetModel('room', function (model)
                    {
                        this.scene.Reset(new ModelInstance(model, null));
                        this.camera.UpdateSceneBounds(this.scene.Bounds());
                        this.LaunchSetup();
                    }.bind(this));
                }.bind(this)
            );

            this.renderer.resizeEnd();
            this.renderer.UpdateView();
        };

        // TODO: Update for camera and consider moving this out into a separate behavior events class
        SceneViewer.prototype.AttachEventHandlers = function () {
            /*** Behaviors are specified here ***/

            // spit out bare JSON data for the scene
            Behaviors.keypress(this.uimap, 'K')
                .onpress(function() {
                    console.log(this.scene.SerializeBare());
                }.bind(this))
        };

        SceneViewer.prototype.LoadScene = function(on_success, on_error)
        {
            $.get(this.base_url + '/scenes/' + this.scene_record.id + '/load')
                .error(on_error).success(function(json) {
                    var scene_json = JSON.parse(json.scene);
                    this.uilog.fromJSONString(json.ui_log);
                    this.scene.LoadFromNetworkSerialized(scene_json,
                        this.assman,
                        on_success);
                }.bind(this));
        };

        SceneViewer.prototype.SaveScene = function(on_success, on_error)
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
        };

        SceneViewer.prototype.SaveCamera = function()
        {
            this.savedCam = this.camera.toJSONString();
            console.log(this.savedCam);
        };

        SceneViewer.prototype.LoadCamera = function()
        {
            this.camera.ResetFromJSONString(this.savedCam);
            this.renderer.UpdateView();
        };

        SceneViewer.prototype.ExitTo = function(destination)
        {
            this.SaveScene(function() { // on success
                window.onbeforeunload = null;
                window.location.href = destination;
            }.bind(this));
        };

        // Exports
        return SceneViewer;

    });