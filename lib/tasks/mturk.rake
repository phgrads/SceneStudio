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

end
