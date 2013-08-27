k =2;
[X,Y,Z] = get_camera_observables('data.yml');
data = horzcat(X,Y,Z);
datasize = size(data);
dim = datasize(1);
obj = gmdistribution.fit(data,k,'Regularize', .001);
s = struct(obj);
savejson('', s, 'gaussiandata.json');
