'use strict';

define([
	'./Constants',
	'./Mesh',
	'./Texture',
	'./Model',
	'./AssetCache',
	'./Material',
	'./loader',
    'base'
],
function(Constants, Mesh, Texture, Model, AssetCache, Material){

function AssetManager(gl)
{
	this.gl = gl;
	this.nullTexture = new Texture(gl, "NULLTEXTURE", null);
	
	this.modelCache = new AssetCache(Constants.modelCacheMaxSize);
	this.textureCache = new AssetCache(Constants.textureCacheMaxSize);
	
	// Keep track of active downloads
	this.downloadingModels = {};
	this.downloadingMeshes = {};
	this.downloadingImages = {};
	this.callOnDownload    = {}; // callbacks for when downloads finish
}

AssetManager.prototype.ClearCache = function()
{
	this.modelCache.Clear();
	this.textureCache.Clear();
};

AssetManager.prototype.CancelDownloads = function()
{
	// 'this.downloadingModels' maps model IDs to
	// XHR objects.
	for (var id in this.downloadingModels)
		this.downloadingModels[id].abort();
	this.downloadingModels = {};
	
	// 'this.downloadingMeshes' maps mesh URLs to
	// XHR objects.
	for (var url in this.downloadingMeshes)
		this.downloadingMeshes[url].abort();
	this.downloadingMeshes = {};
	
	// 'this.downloadingImages' maps texture URLS
	// to Image objects.
	this.downloadingImages = {};
};

AssetManager.prototype.GetModel = function(id, callback)
{
	var m = this.modelCache.GetAsset(id);
	if (m) {
		callback(m);
	} else if(this.callOnDownload[id]) {
        var oldCallback = this.callOnDownload[id];
        this.callOnDownload[id] = function(model) {
            oldCallback(model);
            callback(model);
        };
    } else {
		this.DownloadModel(id, callback);
    }
};

AssetManager.prototype.GetTexture = function(url, callback)
{
	var t = this.textureCache.GetAsset(url);
	if (t)
	{
		callback(t);
	}
	else
		this.DownloadTexture(url, callback);
};

AssetManager.prototype.DownloadModel = function(id, callback)
{
	var that = this;

	var materials = {};
	var numUrls = 0;
	var numMeshesPerUrl = {};
	var numMeshesDecompressedPerUrl = {};
	var numUrlsDownloaded = 0;
	var numTextures = 0;
	var numTexturesRetrieved = 0;
	var meshDump = {};

  var modelOptions = {};
  if (id.startsWith("vf.")) {
    modelOptions['geomDir'] = Constants.vfDir;
    modelOptions['jsonFile'] = Constants.vfDir + id.substring(3) + '.json';
  } else {
    modelOptions['geomDir'] = Constants.geomDir;
    modelOptions['jsonFile'] = Constants.modelDir + id + '.json';
  }

	var jsonFileDownloaded = function (req)
	{
		// It should be impossible for this callback to fire if the model download was aborted.
		// But just in case, we'll make sure we do nothing here if the model is not in the active download list.
		if(!(id in that.downloadingModels))
		  throw "jsonFileDownloaded() should never fire "+
		        "if download is aborted.";
		if (!(id in that.downloadingModels)) return;
		delete that.downloadingModels[id];
		
		var jsonObj = JSON.parse(req.responseText);
		materials = jsonObj.materials;
		var keys = Object.keys(jsonObj.urls);
		numUrls = keys.length;
		keys.forEach(
			function(meshUrl)
			{
				numMeshesPerUrl[meshUrl] = jsonObj.urls[meshUrl].length;
				numMeshesDecompressedPerUrl[meshUrl] = 0;
			}
		);
		
		for (var i = 0; i < numUrls; i++)
		{
			meshDump[keys[i]] = [];
		}

		var downloads = downloadMeshes(modelOptions.geomDir, jsonObj.urls, jsonObj.decodeParams, meshDecompressed);
		AppendObject(downloads, that.downloadingMeshes);
	};
	
	var meshDecompressed = function(attribArray, indexArray, bboxen, meshUrl, meshIndex, meshParams)
	{
		// It should be impossible for this callback to fire if the mesh download was aborted.
		// But just in case, we'll make sure we do nothing here if the mesh is not in the active download list.
		if (!(meshUrl in that.downloadingMeshes)) return;
		
		var m = new Mesh(that.gl, attribArray, indexArray, Mesh.DEFAULT_VERTEX_FORMAT, bboxen);
		meshDump[meshUrl][meshIndex] = { mesh: m, matname: meshParams.material};
		
		numMeshesDecompressedPerUrl[meshUrl]++;
		if (numMeshesDecompressedPerUrl[meshUrl] === numMeshesPerUrl[meshUrl])
		{
			delete that.downloadingMeshes[meshUrl];
			numUrlsDownloaded++;
			if (numUrlsDownloaded == numUrls)
				getTextures();
		}
	};

	var getTextures = function()
	{
		var texnames = {};
		for (var matname in materials)
		{
			var mat = materials[matname];
			if (mat.map_Kd)
				texnames[mat.map_Kd] = "";
		}
		numTextures = Object.keys(texnames).length;
		if (numTextures == 0)
			finalizeModel();
		else
		{
			for (var texname in texnames)
				that.GetTexture(texname, textureReady);
		}
	};

	var textureReady = function(texture)
	{
		numTexturesRetrieved++;
		if (numTexturesRetrieved == numTextures)
			finalizeModel();
	};
	
	var finalizeModel = function()
	{
		// Store the meshes lexicographically by url (gives a deterministic
		// ordering to 'components')
		// If they come from the same url, then sort by position in the list.
		var components = [];
		var sortedUrls = Object.keys(meshDump);
		sortedUrls.sort();
		for (var i = 0; i < numUrls; i++)
		{
			var meshMatList = meshDump[sortedUrls[i]];
			var numPairs = meshMatList.length;
			for (var j = 0; j < numPairs; j++)
			{
				var pair = meshMatList[j];
				var mat = materials[pair.matname];
				var tex = (mat.map_Kd && that.textureCache.GetAsset(mat.map_Kd)) || that.nullTexture;
				var options = {
					color: mat.Kd || vec3.create([0,0,0]),
					transparency: mat.d,
					texture: tex
				};
				components.push(
				{
					mesh: pair.mesh,
					material: new Material.ModelMaterial(that.gl, options)
				});
			}
		}
		var model = new Model(id, components);
		that.modelCache.AddAsset(id, model);

		// safely uninstall, and then call callback
		var toCall = that.callOnDownload[id];
		delete that.callOnDownload[id];
		toCall(model);
	};

  var download = getHttpRequest(modelOptions.jsonFile, function(req, e) { jsonFileDownloaded(req); });
	this.downloadingModels[id] = download;
	this.callOnDownload[id] = callback;
};

AssetManager.prototype.DownloadTexture = function(url, callback)
{
	var that = this;
	
	var image = new Image;
	image.onload = function()
	{
		// If this download was cancelled, ignore this image
		// There unfortunately is no stable way to stop the download of an image, so
		// we have to wait for it to finish and just ignore it
		if (!(url in that.downloadingImages)) {
            if (callback) callback();
            else return;
        }
		delete that.downloadingImages[url];
		
		var gl = that.gl;
		image = ensurePowerOfTwo(image);
		
		var glTexObj = gl.createTexture();
		var texture = new Texture(gl, url, glTexObj);
		texture.Bind();
		
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.generateMipmap(gl.TEXTURE_2D);
		
		that.textureCache.AddAsset(url, texture);
		callback(texture);
	};
	image.onerror = function()
	{
		throw new Error("Texture.DownloadAsync - Could not load texture '" + url + "'");
	};

	this.downloadingImages[url] = image;
	image.src = Constants.textureDir + url;
};

// Exports
return AssetManager;

});