namespace :mturk do
  desc 'launch the experiment on mturk'
  task :run, [:name]  => :environment do |_, args|
    name = args.name.underscore

    # give user friendly error when we get a name collision
    if MtTask.where(name: name).exists? then
      raise "FAIL: could not mturk:run #{name} because " +
            "apparently it's already been run."
    end

    # load in the parameters for this task
    config_params = YAML.load_file("config/experiments/#{name}.yml")

    # set base host url from environment variable or use default from template
    host_base_url = INIT_CONFIG['HOST_BASE_URL'] || 'http://localhost:3000/'

    url  = host_base_url + 'mturk/task'

    # extend the parameters object with other useful parameters
    config_params['name'] = name
    config_params['url']  = url
    
    MtTask.create_and_submit(config_params)
  end

  desc 'end the experiment on mturk'
  task :expire, [:name]  => :environment do |_, args|
    task = get_task(args.name)
    task.expire! if task.live?
  end

  desc 'delete the experiment (from mturk) and pay all the workers'
  task :delete, [:name]  => :environment do |_, args|
    task = get_task(args.name)
    task.complete! if task.live?
  end

  desc 'delete all evidence/data of the experiment having been run'
  task :recall, [:name]  => :environment do |_, args|
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