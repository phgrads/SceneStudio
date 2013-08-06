// by Sean McCullough (banksean@gmail.com)
// 25.December 2007

/** 
 * Javascript implementation of the Box-Muller transform.
 * http://en.wikipedia.org/wiki/Box-Muller_transform
 * The zigurat algorithm is more efficient, but this is
 * easier to implement. This particular implementation is a 
 * version of http://www.dreamincode.net/code/snippet1446.htm
 * @constructor 
 * @param {Number} sigma The standard-deviation of the distribution
 * @param {Number} mu The center of the distribution
 */
function NormalDistribution(sigma, mu) {
	return new Object({
		sigma: sigma,
		mu: mu,
		sample: function() {
			var res;
			if (this.storedDeviate) {
				res = this.storedDeviate * this.sigma + this.mu;
				this.storedDeviate = null;
			} else {
				var dist = Math.sqrt(-1 * Math.log(Math.random()));
				var angle = 2 * Math.PI * Math.random();
				this.storedDeviate = dist*Math.cos(angle);
				res = dist*Math.sin(angle) * this.sigma + this.mu;
			}
			return res;
		},
		sampleInt : function() {
			return Math.round(this.sample());
		}
	});
}

// conveneience function, works on bounds instead of sigma, mu.
// also unemcumbered by maintaining a stored deviate.  This makes it
// much less effiecient than the NormalDistribution class, but maybe
// easier to use.
// WARNING: this probably doesn't work with negative numbers.

function generateNormallyDistributedRandomVar(min, max) {
	var mu = (max+min)/2;
	var sigma = mu/2;
	var res = min - 1;
	while (res > max || res < min) {
		var dist = Math.sqrt(-1 * Math.log(Math.random()));
		var angle = 2 * Math.PI * Math.random();
		res = dist*Math.sin(angle) * sigma + mu;
	}
	
	return res;		
}

// convenience extension to Array so you can sample indexes on this distribution
Array.prototype.sampleIndex = function() {
	//if the array size has changed, we need to update the distribution object
	if (this.lastLength != this.length) {
		this.samplingDistribution = new NormalDistribution((this.length/6), (this.length/2)-1);
		this.lastLength = this.length;
	}
	return this.samplingDistribution.sampleInt();
}
