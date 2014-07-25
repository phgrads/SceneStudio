'use strict';

// TODO: namespace.
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function (str){
    return this.slice(-str.length) == str;
  };
}

Float32Array.prototype.toJSON = function() {
    var arr = [];
    for (var i=0; i < this.length; i++) arr.push(this[i]);
    return arr;
};

Float32Array.fromJSON = function(json) {
    return new Float32Array(JSON.parse(json));
};

function stringToArrayBuffer(string, callback) {
    var bb = new Blob([string]);
    var f = new FileReader();
    f.onload = function(e) {
        callback(e.target.result);
    };
    f.readAsArrayBuffer(bb);
}

function arrayBufferToString(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function never() {
  return false;
}

function clamp(val, minVal, maxVal) {
  return (val < minVal) ? minVal : ((val > maxVal) ? maxVal : val);
}

// DOM.

function id(id) {
  return document.getElementById(id);
}

function preventDefaultAction(evt) {
  evt.preventDefault();
}

function preventSelection(dom) {
  // TODO: Use PreventDefaultAction?
  dom.onselectstart = never;
  dom.onmousedown = never;
}

function addListeners(dom, listeners) {
  // TODO: handle event capture, object binding.
  for (var key in listeners) {
    dom.addEventListener(key, listeners[key]);
  }
}

function removeListeners(dom, listeners) {
  // TODO: handle event capture, object binding.
  for (var key in listeners) {
    dom.removeEventListener(key, listeners[key]);
  }
}

// drag(dx, dy, evt)
function addDragHandler(dom, drag) {
  var prevX_, prevY_;

  var LISTENERS = {
    mousemove: function(evt) {
      drag(evt.screenX - prevX_, evt.screenY - prevY_, evt);
      prevX_ = evt.screenX;
      prevY_ = evt.screenY;
    },
    mouseup: function() {
      drag(0, 0);
      removeListeners(document, LISTENERS);
    }
  };

  dom.addEventListener('mousedown', function(evt) {
    prevX_ = evt.screenX;
    prevY_ = evt.screenY;
    addListeners(document, LISTENERS);
  });
}

// wheel(dx, dy, evt)
function addWheelHandler(dom, wheel) {
  if (dom.onmousewheel !== undefined) {
    dom.addEventListener('mousewheel', function(evt) {
      if (typeof evt.wheelDeltaX !== 'undefined') {
        wheel(evt.wheelDeltaX, evt.wheelDeltaY, evt);
      } else {
        wheel(0, evt.wheelDelta, evt);
      }
    });
  } else {  // Gecko
    dom.addEventListener('MozMousePixelScroll', function(evt) {
      var detail = evt.detail;
      if (evt.axis === evt.HORIZONTAL_AXIS) {
        wheel(detail, 0, evt);
      } else {
        wheel(0, -detail, evt);
      }
    });
  }
};

// Shim layer with setTimeout fallback, adapted from:
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function(callback, unused_dom) {
    window.setTimeout(callback, 16);  // 16ms ~ 60Hz
  };

// XMLHttpRequest stuff.
function getHttpRequest(url, onload, opt_onprogress) {
  var LISTENERS = {
    load: function(e) { onload(req, e); },
    progress: function(e) { opt_onprogress && opt_onprogress(req, e); }
  };

  var req = new XMLHttpRequest();
  addListeners(req, LISTENERS);
  req.open('GET', url, true);
  req.send(null);
  
  return req;
};


// CSRF authenticity token for AJAX requests to Rails
$.ajaxSetup({
  headers: {
    'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
  }
});

function add_data(data) {
  data = data || {};
  if(window.globalViewData.assignmentId) {
    data = $.extend(data, {
      assignmentId: window.globalViewData.assignmentId
    });
  }
  if(window.globalViewData.task_id) {
    data = $.extend(data, {
      task_id: window.globalViewData.task_id
    });
  }
  return data;
}

function getViaJquery(url)
{
  var params = add_data();
  return $.get(url, params);
}

function putViaJQuery(url, data)
{
  data = add_data(data);
  return $.ajax({
    type: 'PUT',
    url: url,
    data: data,
    dataType: 'json',
    timeout: 10000
  });
}

// Concatenating object properties
function AppendObject(src, dst)
{
	for (var prop in src)
	{
		if (src.hasOwnProperty(prop))
		{
			dst[prop] = src[prop];
		}
	}
}

function getOS()
{
    var os_name = "unknown";
    if (navigator.appVersion.indexOf("Win")!=-1) os_name="windows";
    if (navigator.appVersion.indexOf("Mac")!=-1) os_name="mac";
    if (navigator.appVersion.indexOf("X11")!=-1) os_name="unix";
    if (navigator.appVersion.indexOf("Linux")!=-1) os_name="linux";
}

function roughSizeOfObject( object ) {

    var objectList = [];

    var recurse = function( value )
    {
        var bytes = 0;

        if ( typeof value === 'boolean' ) {
            bytes = 4;
        }
        else if ( typeof value === 'string' ) {
            bytes = value.length * 2;
        }
        else if ( typeof value === 'number' ) {
            bytes = 8;
        }
        else if ( typeof value === 'object' && ($.inArray(value, objectList) == -1) )
        {
            objectList[ objectList.length ] = value;

            for( var prop in value ) {
                bytes+= 8; // an assumed existence overhead
                bytes+= recurse( value[prop] )
            }
        }

        return bytes;
    }

    return recurse( object );
}

function ensurePowerOfTwo(image)
{
    if (!isPowerOfTwo(image.width) || !isPowerOfTwo(image.height))
    {
        var canvas = document.createElement("canvas");
        canvas.width = nextHighestPowerOfTwo(image.width);
        canvas.height = nextHighestPowerOfTwo(image.height);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
        return canvas;
    }
    return image;
}
function isPowerOfTwo(x)
{
    return (x & (x - 1)) == 0;
}

function nextHighestPowerOfTwo(x)
{
    --x;
    for (var i = 1; i < 32; i <<= 1) {
        x = x | x >> i;
    }
    return x + 1;
}


function mapTable(table, perField) {
    var result = {};
    for(var key in table)
        result[key] = perField(key, table[key]);
    return result;
}

// Taken from John Resig:
// http://ejohn.org/blog/partial-functions-in-javascript/
Function.prototype.partial = function(){
    var fn = this;
    var args = Array.prototype.slice.call(arguments);
    return function(){
        var merged = Array.prototype.slice.call(args); // make copy
        var arg = 0;
        for ( var i = 0; i < merged.length && arg < arguments.length; i++ )
            if ( merged[i] === undefined )
                merged[i] = arguments[arg++];
        while ( arg < arguments.length )
            merged.push(arguments[arg++]);
        return fn.apply(this, merged);
    };
};
