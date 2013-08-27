function [ X,Y,Z,Pitch,Yaw] = get_camera_observables( filename )
%UNTITLED3 Summary of this function goes here
%   Detailed explanation goes here
    X = [];
    Y = [];
    Z = []; 
    Pitch = [];
    Yaw = []; 
    

    yaml = ReadYaml(filename);
    records = yaml.mt_assignments.records;
    for i = 1:length(records)
        if records{i}{3} ~= 6 || isempty(records{i}{8})
            continue;
        end
        obj = loadjson(records{i}{8});
        for i=1:length(obj)
            if strcmp(obj(i).tag, 'CAMBEST')
                camera = loadjson(obj(i).camera);
                X = [X; camera.eyePos(1)];
                Y = [Y; camera.eyePos(2)];
                Z = [Z; camera.eyePos(3)];
                Pitch = [Pitch; camera.pitch];
                Yaw = [Yaw; camera.yaw];
            end
        end
    end
            
            
%    filestring = fileread(filename);
%     obj = parse_json(filestring);
%     for i = 1:length(obj{1})
%         c = parse_json(obj{1}{i}.data.camera); 
%         camera = c{1};
%         X = [X; camera.eyePos{1}]
%         Y = [Y; camera.eyePos{2}]
%         Z = [Z; camera.eyePos{3}]
%         Pitch = [Pitch; camera.pitch];
%         Yaw = [Yaw; camera.yaw];
%     end
        


end

