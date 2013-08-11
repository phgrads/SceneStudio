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
    'jquery',
    'game-shim'
], function (Constants, Camera, FPCamera, Renderer, AssetManager, ModelInstance, Scene, CameraControls, PubSub, uimap,
             Behaviors, FSM, UILog) {

        function SceneViewer(canvas) {
            // Extend PubSub
            PubSub.call(this);

            // CSRF authenticity token for AJAX requests to Rails
            $.ajaxSetup({ headers: { 'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content') } });

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

            this.AttachEventHandlers();
        }

        // Extend PubSub
        SceneViewer.prototype = Object.create(PubSub.prototype);

        SceneViewer.prototype.Launch = function () {
            this.LoadScene(
                function() { // on success finish up some setup
                    this.camera.SetRandomPositionInSceneBounds();
                }.bind(this),
                function() { // on failure create an empty room
                    this.assman.GetModel('room', function (model) {
                        this.scene.Reset(new ModelInstance(model, null));
                        this.camera.SetRandomPositionInSceneBounds();
                    }.bind(this));
                }.bind(this)
            );

            this.camera.AttachControls(this);

            this.renderer.resizeEnd();
            this.renderer.UpdateView();
        };

        SceneViewer.prototype.AttachEventHandlers = function () {
            // TODO: Best, worst view logic and hooking to prompts
            Behaviors.keypress(this.uimap, 'enter')
                .onpress(function() {
                    this.SaveCamera('BESTVIEW');
                }.bind(this));

            preventSelection(this.canvas);
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

        SceneViewer.prototype.SaveCamera = function(tag)
        {
            var record = {
                user: this.user_record,
                scene: this.scene_record,
                tag: tag,
                camera: this.camera.toJSONString()
            };
            this.uilog.log(UILog.EVENT.MISC, record);
            console.log(record);
        };

        SceneViewer.prototype.LoadCamera = function(cam)
        {
            this.camera.ResetFromJSONString(cam);
            this.renderer.UpdateView();
        };

        SceneViewer.prototype.ExitTo = function(destination)
        {
            this.SaveScene(function() {
                window.onbeforeunload = null;
                window.location.href = destination;
            }.bind(this));
        };

        // Exports
        return SceneViewer;

    });