'use strict';

define([
    './Constants',
    './Camera',
    './FPCamera',
    './Renderer',
    './AssetManager',
    './ModelInstance',
    './Scene',
    './CameraControls',
    './PubSub',
    './uimap',
    './uibehaviors',
    './fsm',
    './UILog',
    './ModelUtils',
    'jquery',
    'game-shim'
], function (Constants, Camera, FPCamera, Renderer, AssetManager, ModelInstance, Scene, CameraControls, PubSub, uimap,
             Behaviors, FSM, UILog, ModelUtils) {

        function SceneViewer(canvas) {
            // Extend PubSub
            PubSub.call(this);

            // the following variables from globalViewData
            // should be rendered by the jade template
            this.user_record    = window.globalViewData.user;
            this.scene_record   = window.globalViewData.scene;
            this.on_close_url   = window.globalViewData.on_close_url;
            this.base_url   = window.globalViewData.base_url;

            this.canvas = canvas;
            this.uimap = uimap.create(canvas);
            this.scene = new Scene();
            this.camera = new FPCamera(this.scene);
            this.renderer = new Renderer(canvas, this.scene, undefined, this.camera);
            this.assman = new AssetManager(this.renderer.gl_);
            this.uilog = new UILog.UILog();
            this.uilog.clear();
            this.modelUtils = new ModelUtils(this.renderer.gl_);
            this.mturk = !!window.globalViewData.assignmentId;
            this.cameraViews = [];

            this.ViewSelectionTaskLogic();
        }

        // Extend PubSub
        SceneViewer.prototype = Object.create(PubSub.prototype);

        SceneViewer.prototype.Launch = function () {
            this.LoadScene(
                function() { // on success finish up some setup
                    this.camera.SetRandomPositionAndLookAtPointInSceneBounds();
                    this.renderer.UpdateView();
                }.bind(this),
                function() { // on failure create an empty room
                    this.assman.GetModel('room', function (model) {
                        this.scene.Reset(new ModelInstance(model, null));
                        this.camera.SetRandomPositionAndLookAtPointInSceneBounds();
                        this.renderer.UpdateView();
                    }.bind(this));
                }.bind(this)
            );

            this.camera.AttachControls(this);

            this.renderer.resizeEnd();
        };

        SceneViewer.prototype.ViewSelectionTaskLogic = function () {
            // Get message box and text
            var msgBox = $('#message');
            var msgTxt = msgBox.children('span');
            var instructions = id('instructions');

            // Fullscreeen on canvas click and fade message in
            instructions.addEventListener('click', function() {
                id("ui").requestFullScreen();
                msgBox.fadeIn('slow');
                $(instructions).html("<p>Left click to go back to task.</p>" +
                    "<p>Controls: mouse for looking, AWSD for horizontal motion, R and F for vertical height.</p>");
            });

            // Pointerlock on fullscreen (seems to require direct attachment to document otherwise fails)
            document.addEventListener('fullscreenchange', function() {
                this.canvas.requestPointerLock();
                this.canvas.focus();
            }.bind(this));

            // Initialize task stage counter and messages
            var taskStage = 0;
            var taskMessages = [
                //taskStage = 0
                "Please find and take a picture of a view most people would agree shows the scene best. Use AWSD and RF to move, ENTER to save.",
                //taskStage = 1
                "Are you sure this is a good view? Press ENTER again to confirm or DELETE to cancel.",
                //taskStage = 2
                "Please find and take a picture of a bad view. Use AWSD and RF to move, ENTER to save.",
                //taskStage = 3
                "Are you sure this is a bad view? Press ENTER again to confirm or DELETE to cancel.",
                //taskStage = 4
                "Worst view saved. Press ENTER again to save results and exit."
            ];
            msgTxt.text(taskMessages[0]);

            // Canceling with delete decrements task counter and updates message
            Behaviors.keypress(this.uimap, 'delete').onpress(function() {
                if (taskStage == 1 || taskStage == 3) {
                    taskStage--;
                    msgTxt.text(taskMessages[taskStage]);
                    msgBox.hide().fadeIn('slow');
                }
            });

            // Confirming with enter takes action, increments task counter and updates message
            Behaviors.keypress(this.uimap, 'enter').onpress(function() {
                if (taskStage == 1) {
                    this.LogCamera('CAMBEST');
                }
                else if (taskStage == 3) {
                    this.LogCamera('CAMWORST');
                }
                else if (taskStage == 4) {
                    // TODO: Replace this with saving of UI log through special route
                    if(!this.mturk){
                        console.log("saving and exiting");
                        this.ExitTo(window.globalViewData.on_close_url)
                    }
                    else{
                        this.SaveMTurkResults();
                    }
                }
                taskStage++;
                msgTxt.text(taskMessages[taskStage]);
                msgBox.hide().fadeIn('slow');
            }.bind(this));


            //TODO: Load in saved camera json, not current cam
            Behaviors.keypress(this.uimap, 'C').onpress(function() {
              var camJson = this.camera.toJSONString();
              this.LoadCamera(camJson);
            }.bind(this));

            preventSelection(this.canvas);
        };

        SceneViewer.prototype.LoadScene = function(on_success, on_error)
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

        SceneViewer.prototype.SaveMTurkResults = function(on_success, on_error){
            on_success = on_success || function(response) {
                document.cancelFullScreen();
                document.body.innerHTML = "<p>Thanks for participating!</p>" +
                "<p>Your coupon code is: " + response.coupon_code + "</p>" +
                "Copy your code back to the first tab and close this tab when done.";
            };

            on_error = on_error || function() { alert("Error saving results. Please close tab and do task again.");};

            submit_mturk_report(this.cameraViews).error(on_error).success(on_success);
        };

        SceneViewer.prototype.SaveLog = function(on_success, on_error)
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

        SceneViewer.prototype.LogCamera = function(tag)
        {
            var record = {
                user: this.user_record,
                scene: this.scene_record,
                tag: tag,
                camera: this.camera.toJSONString()
            };
            if(this.mturk){
                this.cameraViews.push(record);
            }
            else{
                this.uilog.log(UILog.EVENT.MISC, record);
            }
            console.log(record);
            $("#ui").fadeOut('fast').fadeIn('fast');
        };

        SceneViewer.prototype.LoadCamera = function(camJson)
        {
            var cam = new Camera();
            cam.ResetFromJSONString(camJson);
            var marker = this.modelUtils.CreateCameraMarker(cam, {parent: app.scene.root});
            console.log(marker);
            this.renderer.UpdateView();
        };

        SceneViewer.prototype.ExitTo = function(destination)
        {
            this.SaveLog(function() {
                window.onbeforeunload = null;
                window.location.href = destination;
            }.bind(this));
        };

        // Exports
        return SceneViewer;

    });
