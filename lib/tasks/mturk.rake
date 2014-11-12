namespace :mturk do
  desc 'setup database for development'
  task :develop, [:name] => :environment do |_, args|
    name = args.name.underscore

    # give user friendly error when we get a name collision
    if MtTask.where(name: name).exists? then
      raise "FAIL: could not mturk:develop #{name} because " +
            "apparently the task's db entries have been created."
    end

    config_params = YAML.load_file("config/experiments/#{name}.yml")
    config_params['name'] = name

    MtTask.create_and_develop(config_params)
  end

  desc 'launch the experiment on mturk'
  task :run, [:name]  => :environment do |_, args|
    name = args.name.underscore

    # give user friendly error when we can't run
    task = MtTask.find_by_name(name)
    if task then
      if task.submitted? then
        if task.completed? then
          puts "Found completed task #{name} in db (probably mturk:recall). " +
               'Updating config and resubmitting.'
        else
          raise "FAIL: could not mturk:run #{name} because " +
              "apparently it's already been submitted."
        end
      else
        puts "Found task #{name} in db (probably mturk:develop). " +
             'Destroying first and recreating before submission.'
        task.destroy
        task = nil
      end
    end

    # load in the parameters for this task
    config_params = YAML.load_file("config/experiments/#{name}.yml")

    # set base host url from environment variable or use default from template
    host_base_url = INIT_CONFIG['HOST_BASE_URL'] || 'http://localhost:3000/'

    url  = host_base_url + 'mturk/task'

    # extend the parameters object with other useful parameters
    config_params['name'] = name
    config_params['url']  = url

    if task then
      MtTask.update_and_submit(task, config_params)
    else
      MtTask.create_and_submit(config_params)
    end
  end

  desc 'end the experiment on mturk'
  task :expire, [:name]  => :environment do |_, args|
    task = get_task(args.name)
    task.expire! if task.live?
  end

  desc 'approve and pay all the workers'
  task :approve, [:name]  => :environment do |_, args|
    task = get_task(args.name)
    task.approve! if task.live?
  end

  desc 'recall the experiment (from mturk) and pay all the workers'
  task :recall, [:name]  => :environment do |_, args|
    task = get_task(args.name)
    task.complete! if task.live?
  end

  desc 'delete all evidence/data of the experiment having been run'
  task :destroy, [:name]  => :environment do |_, args|
    task = get_task(args.name)
    task.complete! if task.live?
    task.destroy
  end

  desc 'allow user to manage mturk tasks'
  task :allow, [:user]  => :environment do |_, args|
    user = get_user(args.user)
    user.role = "mturk"
    user.save!
  end

  desc 'convert task items with old scene format to new scene format'
  task :convert_all => :environment do |_, args|
    items = get_all_items
    items.each do |item|
      update_scene_data(item)
    end
  end




  desc 'expire all HITs currently on mturk'
  task :expire_all => :environment do
    MtTask.all.each do |task|
      task.expire! if task.live?
    end
  end

  desc 'close out and pay all HITs currently on mturk'
  task :complete_all => :environment do
    MtTask.all.each do |task|
      task.complete! if task.live?
    end
  end

  private
    def get_task(name)
      name = name.underscore
      task = MtTask.find_by_name(name)
      raise "Could not find launched task #{name}" unless task
      return task
    end

    def get_user(name)
      user = User.find_by_name(name)
      raise "Could not find user #{name}" unless user
      return user
    end

    def get_all_items
      items = MtCompletedItem.all
      return items
    end


    # Convert old scene data into updated scene format with camera
    def to_array(v)
      v.include?('0')? [ v['0'], v['1'], v['2']]:v
    end

    def update_scene_data(item)
      old_data = JSON.parse(item.data)
      puts("Got item #{old_data}")
      if old_data.include?('scene') then
        # Potentially a old scene
        scene_data = old_data['scene']
        unless scene_data.include?('format') then
          puts("Converting old scene #{item.id}")
          # Yes, this is a old scene (no format)

          # 1. Convert scene into ssj format
          scene_data = JSON.parse(scene_data)
          #puts("Got scene #{scene_data}")
          objects = scene_data.map{ |x| JSON.parse(x) }
          new_scene_data = {
              'format' => 'ssj',
              'objects' => objects
          }

          # 2. Convert uilog into camera data
          uilog_data = old_data['ui_log']
          uilog_data = JSON.parse(uilog_data)
          #puts("Got uilog #{uilog_data}")
          if uilog_data.length > 0 then
            last_state_scene = uilog_data[uilog_data.length-1]
            last_camera_data = JSON.parse(last_state_scene['data'])
            #puts("Got camdata #{last_camera_data}")
            #puts("Got cam eye #{last_camera_data['eyePos']}")
            last_camera = {
                'name' => 'current',
                'eye' => last_camera_data['eyePos'],
                'lookAt' => last_camera_data['lookAtPoint'],
                'up' => [0,0,1]
            }
            new_scene_data['cameras'] = [last_camera]
            #puts("Got cam #{last_camera}")
          end
          new_uilog_data = []

          new_data = old_data
          new_data['scene'] = JSON.dump(new_scene_data)
          new_data['ui_log'] = JSON.dump(new_uilog_data)
          puts("Converted to new data #{new_data}")
        else
          # 3. Trim cameras in scene string
          scene_data = JSON.parse(scene_data)
          scene_cameras = scene_data['cameras']
          scene_cameras.map!{ |x|
            puts("camera is #{x}")
            eye = to_array(x['eye'])
            lookAt = to_array(x['lookAt'])
            up = to_array(x['up'])
            {
                'name' => x['name'],
                'eye' => eye,
                'lookAt' => lookAt,
                'up' => up
            }
          }

          new_data = old_data
          new_data['scene'] = JSON.dump(scene_data)
          puts("Converted to new data #{new_data}")
        end
      end
    end
end
