'use strict';

// Model manifest description. Contains objects like:
// name: {
//   materials: { 'material_name': { ... } ... },
//   decodeParams: {
//     decodeOffsets: [ ... ],
//     decodeScales: [ ... ],
//   },
//   urls: {
//     'url': [
//       { material: 'material_name',
//         attribRange: [#, #],
//         indexRange: [#, #],
//         names: [ 'object names' ... ],
//         lengths: [#, #, # ... ]
//       }
//     ],
//     ...
//   }
// }
//var MODELS = {};

var DEFAULT_DECODE_PARAMS = {
  decodeOffsets: [-4095, -4095, -4095, 0, 0, -511, -511, -511],
  decodeScales: [1/8191, 1/8191, 1/8191, 1/1023, 1/1023, 1/1023, 1/1023, 1/1023],
  // TODO: normal decoding? (see walt.js)
  // needs to know: input, output (from vertex format!)
  //
  // Should split attrib/index.
  // 1) Decode position and non-normal attributes.
  // 2) Decode indices, computing normals
  // 3) Maybe normalize normals? Only necessary for refinement, or fixed?
  // 4) Maybe refine normals? Should this be part of regular refinement?
  // 5) Morphing
};

// Triangle strips!

// TODO: will it be an optimization to specialize this method at
// runtime for different combinations of stride, decodeOffset and
// decodeScale?
function decompressAttribsInner_(str, inputStart, inputEnd,
                                 output, outputStart, stride,
                                 decodeOffset, decodeScale) {
  var prev = 0;
  for (var j = inputStart; j < inputEnd; j++) {
    var code = str.charCodeAt(j);
    prev += (code >> 1) ^ (-(code & 1));
    output[outputStart] = decodeScale * (prev + decodeOffset);
    outputStart += stride;
  }
}

function decompressIndices_(str, inputStart, numIndices,
                            output, outputStart) {
  var highest = 0;
  for (var i = 0; i < numIndices; i++) {
    var code = str.charCodeAt(inputStart++);
    output[outputStart++] = highest - code;
    if (code == 0) {
      highest++;
    }
  }
}

function decompressAABBs_(str, inputStart, numBBoxen,
                          decodeOffsets, decodeScales) {
  var numFloats = 6 * numBBoxen;
  var inputEnd = inputStart + numFloats;
  var bboxen = new Float32Array(numFloats);
  var outputStart = 0;
  for (var i = inputStart; i < inputEnd; i += 6) {
    var minX = str.charCodeAt(i + 0) + decodeOffsets[0];
    var minY = str.charCodeAt(i + 1) + decodeOffsets[1];
    var minZ = str.charCodeAt(i + 2) + decodeOffsets[2];
    var radiusX = (str.charCodeAt(i + 3) + 1) >> 1;
    var radiusY = (str.charCodeAt(i + 4) + 1) >> 1;
    var radiusZ = (str.charCodeAt(i + 5) + 1) >> 1;
    bboxen[outputStart++] = decodeScales[0] * (minX + radiusX);
    bboxen[outputStart++] = decodeScales[1] * (minY + radiusY);
    bboxen[outputStart++] = decodeScales[2] * (minZ + radiusZ);
    bboxen[outputStart++] = decodeScales[0] * radiusX;
    bboxen[outputStart++] = decodeScales[1] * radiusY;
    bboxen[outputStart++] = decodeScales[2] * radiusZ;
  }
  return bboxen;
}

function decompressMesh(str, url, index, meshParams, decodeParams, callback) {
  // Extract conversion parameters from attribArrays.
  var stride = decodeParams.decodeScales.length;
  var decodeOffsets = decodeParams.decodeOffsets;
  var decodeScales = decodeParams.decodeScales;
  var attribStart = meshParams.attribRange[0];
  var numVerts = meshParams.attribRange[1];

  // Decode attributes.
  var inputOffset = attribStart;
  var attribsOut = new Float32Array(stride * numVerts);
  for (var j = 0; j < stride; j++) {
    var end = inputOffset + numVerts;
    var decodeScale = decodeScales[j];
    if (decodeScale) {
      // Assume if decodeScale is never set, simply ignore the
      // attribute.
      decompressAttribsInner_(str, inputOffset, end,
                              attribsOut, j, stride,
                              decodeOffsets[j], decodeScale);
    }
    inputOffset = end;
  }

  var indexStart = meshParams.indexRange[0];
  var numIndices = 3*meshParams.indexRange[1];
  var indicesOut = new Uint16Array(numIndices);
  decompressIndices_(str, inputOffset, numIndices, indicesOut, 0);

  // Decode bboxen.
  var bboxen = undefined;
  var bboxOffset = meshParams.bboxes;
  if (bboxOffset) {
    bboxen = decompressAABBs_(str, bboxOffset, meshParams.names.length,
                              decodeOffsets, decodeScales);
  }
  callback(attribsOut, indicesOut, bboxen, url, index, meshParams);
}

function downloadMesh(path, url, meshEntry, decodeParams, callback) {
  var idx = 0;
  function onprogress(req, e) {
    while (idx < meshEntry.length) {
      var meshParams = meshEntry[idx];
      var indexRange = meshParams.indexRange;
      var meshEnd = indexRange[0] + 3*indexRange[1];
      if (req.responseText.length < meshEnd) break;

      decompressMesh(req.responseText, url, idx, meshParams, decodeParams, callback);
      ++idx;
    }
  };
  return getHttpRequest(path, function(req, e) {
    if (req.status === 200 || req.status === 0) {
      onprogress(req, e);
    }
  });
}

function downloadMeshes(path, meshUrlMap, decodeParams, callback) {
  var downloads = {};
  for (var url in meshUrlMap) {
    var meshEntry = meshUrlMap[url];
    downloads[url] = downloadMesh(path + url, url, meshEntry, decodeParams, callback);
  }
  return downloads;
}
