'use strict';

define(function(){

function AssetCache(maxSize)
{
	this.cache = {};
	this.maxSize = maxSize;
}

AssetCache.MakeCacheEntry = function(id, asset, aSize)
{
	return {
		id: id,
		asset: asset,
		aSize: aSize,
		timestamp: Date.now()
	};
}

AssetCache.prototype.GetAsset = function(id)
{
	if (this.cache.hasOwnProperty(id))
		return this.cache[id].asset;
	else
		return null;
}

// 'aSize' may be omitted, in which case it is assumed to be 1
// (i.e. we aren't actually computing the sizes of assets and are
// implicitly treating them as all the same size)
AssetCache.prototype.AddAsset = function(id, asset, aSize)
{
	if (this.cache.hasOwnProperty(id))
		return;
	
	aSize = aSize | 1;
	
	// Evict, if necessary.
	while (this.ComputeSize() + aSize > this.maxSize)
	{
		var lru = this.FindLRU();
		delete this.cache[lru.id];
	}
	
	this.cache[id] = AssetCache.MakeCacheEntry(id, asset, aSize);
}

AssetCache.prototype.ComputeSize = function()
{
	var s = 0;
	for (var id in this.cache)
	{
		if (this.cache.hasOwnProperty(id))
		{
			s += this.cache[id].aSize;
		}
	}
	return s;
}

AssetCache.prototype.FindLRU = function()
{
	var lru = null;
	var lrutime = Date.now();
	for (var id in this.cache)
	{
		if (this.cache.hasOwnProperty(id))
		{
			var entry = this.cache[id];
			if (entry.timestamp < lrutime)
			{
				lrutime = entry.timestamp;
				lru = entry;
			}
		}
	}
	return lru;
}

AssetCache.prototype.Clear = function()
{
	this.cache = {};
}

// Exports
return AssetCache;

});