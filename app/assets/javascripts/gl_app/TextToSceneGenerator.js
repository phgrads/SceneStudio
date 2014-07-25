/**
 * Interface to Scene Generator
 */

'use strict';

define(['./Constants'],
    function(Constants)
{
    function TextToSceneGenerator(params) {
        this.timeout = 10000;
        if (params) {
            // Application callback when scene generation has succeeded
            // Parameters: resultList (list of scenes)
            this.generateSucceededCallback = params.generateSucceededCallback;
            // Application callback when scene generation has failed
            // Parameters: jqXHR, textStatus, errorThrown
            this.generateFailedCallback = params.generateFailedCallback;
            this.timeout = params.timeout;
        }
    }

    TextToSceneGenerator.prototype.generate = function(text, currentSceneState, generateSucceededCallback, generateFailedCallback) {
        if (!generateSucceededCallback) {
            // Use default generate succeeded callback
            generateSucceededCallback = this.generateSucceeded.bind(this);
        }
        if (!generateFailedCallback) {
            // Use default generate failed callback
            generateFailedCallback = this.generateFailed.bind(this);
        }

        var url = Constants.sceneGenerationUrl;
        var queryData = {
            'text': text,
            'nscenes': 1
        };
        if (currentSceneState && !text.startsWith("generate")) {
          // Some kind of interaction, let's pass the current scene state
          var ss = currentSceneState.toJsonString();
          queryData['initialSceneState'] = ss;
        } else {
          queryData['options'] = {
            sceneUp: Constants.defaultSceneUp,
            sceneFront: Constants.defaultSceneFront,
            sceneUnit: Constants.defaultSceneUnit
          };
        }
        var method = 'POST';
        $.ajax
        ({
            type: method,
            url: url,
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(queryData),
            dataType: 'json',
            success: generateSucceededCallback,
            error: generateFailedCallback,
            timeout: this.timeout		// in milliseconds. With JSONP, this is the only way to get the error handler to fire.
        });
    };

    TextToSceneGenerator.prototype.generateSucceeded = function(data, textStatus, jqXHR)
    {
        if (this.generateSucceededCallback) {
            this.generateSucceededCallback(data.results.scenes);
        } else {
            console.log( "got scene " + data );
        }
    };

    TextToSceneGenerator.prototype.generateFailed = function(jqXHR, textStatus, errorThrown)
    {
        if (this.generateFailedCallback) {
            this.generateFailedCallback(jqXHR, textStatus, errorThrown);
        } else {
            console.log( textStatus + ' ' + errorThrown );
        }
    };

    // Exports
    return TextToSceneGenerator;

});


