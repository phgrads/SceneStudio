'use strict';

// TODO: namespace.
$.fn.serializeObject = function()
{
  var o = {};
  var a = this.serializeArray();
  $.each(a, function() {
    if (o[this.name] !== undefined) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || '');
    } else {
      o[this.name] = this.value || '';
    }
  });
  return o;
};

function camelCase(string) {
  return string.toLowerCase().replace(/(^[a-zA-Z]|\s+[a-zA-Z])/g, function($1) {
    return $1.toUpperCase().replace(' ','');
  })
}

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

// Javascript mod on negative numbers keep number negative
if (typeof Number.prototype.mod != 'function') {
  Number.prototype.mod = function(n) { return ((this%n)+n)%n; };
}

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
}

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
}


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
    };

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


// Utility functions for working with the canvas

// Function to get a potentially resized canvas with a given maxWidth and maxHeight
// while retaining the aspect ratio of the original canvas
// The quality of the resized image is probably not great
function getResizedCanvas(canvas, maxWidth, maxHeight)
{
  var scale = 1.0;
  if (maxWidth && canvas.width > maxWidth) {
    scale = Math.min(scale, maxWidth/canvas.width);
  }
  if (maxHeight && canvas.height > maxHeight) {
    scale = Math.min(scale, maxHeight/canvas.height);
  }
  if (scale != 1.0) {
    var newCanvas = document.createElement("canvas");
    newCanvas.width = scale*canvas.width;
    newCanvas.height = scale*canvas.height;
    var ctx = newCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, newCanvas.width, newCanvas.height);
    return newCanvas;
  } else {
    return canvas;
  }
}

// Copies the image contents of the canvas
function copyCanvas(canvas) {
  var c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  var ctx = c.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  return c;
}

// Trims the canvas to non-transparent pixels?
// Taken from https://gist.github.com/remy/784508
function trimCanvas(c) {
  var ctx = c.getContext('2d');
  var copy = document.createElement('canvas').getContext('2d');
  var pixels = ctx.getImageData(0, 0, c.width, c.height);
  var l = pixels.data.length;
  var bound = {
    top: null,
    left: null,
    right: null,
    bottom: null
  };
  var i, x, y;

  for (i = 0; i < l; i += 4) {
    if (pixels.data[i+3] !== 0) {
      x = (i / 4) % c.width;
      y = ~~((i / 4) / c.width);

      if (bound.top === null) {
        bound.top = y;
      }

      if (bound.left === null) {
        bound.left = x;
      } else if (x < bound.left) {
        bound.left = x;
      }

      if (bound.right === null) {
        bound.right = x;
      } else if (bound.right < x) {
        bound.right = x;
      }

      if (bound.bottom === null) {
        bound.bottom = y;
      } else if (bound.bottom < y) {
        bound.bottom = y;
      }
    }
  }

  var trimHeight = bound.bottom - bound.top + 1;
  var trimWidth = bound.right - bound.left + 1;
  if (trimHeight > 0 && trimWidth > 0) {
    if (trimHeight === c.height && trimWidth === c.width) {
      // No need to trim, just return original
      return c;
    } else {
      var trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

      copy.canvas.width = trimWidth;
      copy.canvas.height = trimHeight;
      copy.putImageData(trimmed, 0, 0);

      // open new window with trimmed image:
      return copy.canvas;
    }
  } else {
    console.error("Invalid trimmed height or width, returning original canvas");
    return c;
  }
}

function getTrimmedCanvasDataUrl(canvas,maxWidth,maxHeight) {
  var copy = copyCanvas(canvas);
  var trimmed = trimCanvas(copy);
  var newCanvas = getResizedCanvas(trimmed, maxWidth, maxHeight);
  return newCanvas.toDataURL();
}

// UI functions using JQuery
function showLarge(elem) {
  var url = elem.attr("src");
  elem.addClass("enlarged");
  var align = elem.attr("enlarge_align");
  if (!align) {
    align = "center";
  }
  $('#large img').show();
  $('#large img').attr("src", url);
  $('#large img').position({
    my: align,
    at: align,
    of: elem
  });
  $('#large img').hover(function(){
  },function(){
    $(this).hide();
    elem.removeClass("enlarged");
  });
}

function showAlert(message, style) {
  window.setTimeout(function() { hideAlert(); }, 5000);
  $('#alertMessage').text(message);
  $('#alert').attr('class', 'alert');
  $('#alert').addClass(style);
  $('#alert').show();
}

function hideAlert() {
  $('#alert').hide();
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
