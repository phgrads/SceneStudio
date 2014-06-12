'use strict';

define([
	'./Framebuffer',
	'./Picker',
	'./Constants',
	'./Renderer',
    './Distribution',
	'gl-matrix',
	'gl-matrix-ext',
	'jquery'
],
function(Framebuffer, Picker, Constants, Renderer, Distribution){

	
	function ViewPortOptimizer(renderer, scene, camera, app){
		this.width = 20;
		this.height = 20;
		//this.canvas = document.createElement('canvas');
		this.renderer = renderer;//new Renderer(this.canvas, app.scene,{width:this.width, height:this.height});
		this.gl_ = this.renderer.gl_;
		this.scene = scene;
		this.framebuffer = new Framebuffer(this.gl_, {width:this.width, height:this.height});
		//this.modellist = this.scene.modellist;
		this.camera = camera;	
		this.app = app;	
		this.positionfunction = null; 
    //this.distribution = new Distribution.NormalDistribution(1, 0)
	}
  
  	ViewPortOptimizer.prototype.inclinationGoodnessFunction = function(state, sigma, mu){
    		return 1/(sigma * Math.sqrt(2 * Math.PI)) * Math.exp(-1 *Math.pow(state.phi - mu,2)/( 2 * Math.pow(sigma, 2)));
  	};
  	ViewPortOptimizer.prototype.heightGoodnessFunction = function(state, sigma, mu){
    		return Math.exp( -1 *(state.eyePos.z - mu)/sigma ^ 2);
  	};
  	ViewPortOptimizer.prototype.areaGoodnessFunction = function(){
    		var val = 1; 
		for(var i = 1; i < this.scene.modelList.length; i++){
			val *= this.calculateModelArea(this.scene.modelList[i]);
		}
		return val;
  	};
	ViewPortOptimizer.prototype.getStateValue = function(state){
		this.camera.Reset(state.eyePos, state.lookAtPoint, null);
 		this.app.renderer.UpdateView();
	  	return this.areaGoodnessFunction(); 
    };

	ViewPortOptimizer.prototype.calculateModelArea = function(targetModel){
		
		var area = this.width * this.height;
		var pixels = 0;
		this.framebuffer.bind(this.gl_);
		this.renderer.setViewport_({width:this.width, height:this.height});
		this.renderer.areaPickingDrawPass();
		var pixelValues = new Uint8Array(area * 4);
		this.gl_.readPixels(0, 0, this.width, this.height, this.gl_.RGBA, this.gl_.UNSIGNED_BYTE, pixelValues );
		this.framebuffer.unbind(this.gl_);
		var ids = Picker.generalUnpackIDs(pixelValues);
		for(var i = 0; i < area; i++){
			var currid = ids[i];
    			currid[0] -= 1;
    			currid[1] -= 1;
    			var picked = this.renderer.scene.IndexToObject(currid[0]);
				if( picked != null && picked.modelID == targetModel.modelID){
					pixels+= 1; 
				}

		}
		return pixels/area;
	};
	
	ViewPortOptimizer.sortDecreasing = function(liveSet){
		liveSet.sort(function(a, b){
				return b.value - a.value;
		});
	};

	ViewPortOptimizer.popMin = function(liveSet){
		ViewPortOptimizer.sortDecreasing(liveSet);
		liveSet.pop();
	};

	ViewPortOptimizer.prototype.randomPosition = function(center, maxdist){
		var theta = 2 * Math.PI * Math.random();  //http://mathworld.wolfram.com/SpherePointPicking.html 
		var phi = Math.acos( 2 * Math.random() - 1); 
		var rho = maxdist * Math.random();
		var x = rho * Math.sin(phi) * Math.cos(theta);
		var y = rho * Math.sin(phi) * Math.sin(theta);
		var z = rho * Math.cos(phi);
		var translation = vec3.create([x,y,z]);
		var newposition = vec3.create();
		vec3.add(center, translation, newposition);
		return newposition; 
	};
	ViewPortOptimizer.prototype.getRandomArbitrary = function(minimum, maximum) {
    		return Math.random() * (maximum - minimum) + minimum;
	};
	ViewPortOptimizer.prototype.randomBBoxPosition = function(bbox){
		var x = this.getRandomArbitrary(bbox.mins[0], bbox.maxs[0]);
		var y = this.getRandomArbitrary(bbox.mins[1], bbox.maxs[1]);
		var z = this.getRandomArbitrary(0, bbox.maxs[2]);
		return vec3.create([x,y,z]);
	};
  	ViewPortOptimizer.prototype.randomViewPerturbation = function(phi, theta){
    		var thetagauss = new NormalDistribution(1, theta);
    		var phigauss = new NormalDistribution(1, phi);
    		var newtheta = (thetagauss.sample()) % (2 * Math.PI); 
    		var newphi = (phigauss.sample()) % (Math.PI); 
    		return {phi:newphi, theta:newtheta}; 
  	};
  	ViewPortOptimizer.prototype.randomView = function(){
    		var phi = Math.acos( 2 * Math.random() - 1); 
    		var theta = 2 * Math.PI * Math.random(); 
    		return {phi:phi, theta:theta};
  	};
  	ViewPortOptimizer.sphericalToCartesian = function(phi, theta){
    		var x = Math.sin(phi) * Math.cos(theta);
		var y = Math.sin(phi) * Math.sin(theta);
	  	var z = Math.cos(phi);
      		return vec3.create([x,y,z]);
  	};

  	ViewPortOptimizer.prototype.generateSeedState = function(){
    		var pos = this.randomPosition(this.camera.sceneBounds.Centroid(), this.camera.sceneBounds.Radius());
		//var pos = this.randomBBoxPosition(this.scene.Bounds());
		//var pos = this.positionfunction(this.scene.Bounds());
    		var view = this.randomView();
    		var lookAt = vec3.create();
    		vec3.add(pos, ViewPortOptimizer.sphericalToCartesian(view.phi, view.theta), lookAt);
    		return {eyePos:pos, lookAtPoint:lookAt, phi:view.phi, theta:view.theta};
  	};

    

	ViewPortOptimizer.prototype.generatePerturbedState = function(currentstate, maxdist){
		var pos = this.randomPosition(currentstate.eyePos, maxdist);
		var view = this.randomViewPerturbation(currentstate.phi, currentstate.theta);
    		var lookAt = vec3.create();
    		vec3.add(pos, ViewPortOptimizer.sphericalToCartesian(view.phi, view.theta), lookAt);
    		return {eyePos:pos, lookAtPoint:lookAt, phi:view.phi, theta:view.theta};
	};
	
	ViewPortOptimizer.prototype.randomSeedInitialization = function(numSeeds){
		var liveSet = [];
		for(var i = 0; i < numSeeds; i++){
			var state = this.generateSeedState();
			var value = this.getStateValue(state);
			liveSet.push({state:state, value:value })
		}
		return liveSet;	
	};
	ViewPortOptimizer.prototype.gridSeedInitialization = function(){
		
	};
	ViewPortOptimizer.prototype.optimizeCameraState = function(){
		this.camera.SaveStateForReset();
		var maxIter = 10;
		var numSeeds = 10;  
		var scenecenter = this.camera.sceneBounds.Centroid();
		var sceneradius = this.camera.sceneBounds.Radius();
    		var liveSet = this.randomSeedInitialization(numSeeds);
		var iter = 0;
		while(iter < maxIter){
			var nextSet = []; 
			ViewPortOptimizer.sortDecreasing(liveSet);
			for(var i =0 ; i < liveSet.length; i++){
				var seed = liveSet[i]; 
				var candidatestate = this.generatePerturbedState(seed.state, 100);
				var candidatevalue = this.getStateValue(candidatestate);
				if(candidatevalue > seed.value){
					liveSet.pop();
					nextSet.push({state:candidatestate, value:candidatevalue});
				}
			}
			liveSet = nextSet.concat(liveSet);
			iter++;
		}
		ViewPortOptimizer.sortDecreasing(liveSet);
		//console.log(liveSet);
		//this.camera.ResetSavedState();
		console.log(liveSet[0].value);
		return liveSet[0].state;

	};

	ViewPortOptimizer.prototype.testSeeding = function(){
		var numtests = 15;
		var bboxtotal = 0;
		var spheretotal = 0;
		for( var i = 0 ; i < numtests; i++){
			this.positionfunction = this.randomBBoxPosition; 
			bboxtotal += this.optimizeCameraState();
			this.positionfunction = this.randomPosition;
			spheretotal += randomPosition;
		}
		console.log('bbox avg: ', bboxtotal/numtests);
		console.log('sphere avg: ', spheretotal/numtests);
	};
	return ViewPortOptimizer;
	


})
