class ExperimentGenerator < Rails::Generators::NamedBase
  source_root File.expand_path('../templates', __FILE__)

  def add_routes
    route("get 'experiments/#{file_name}', " +
          "to: 'experiments/#{file_name}#index'")
  end

  def create_controller_file
    template "controller.rb",
             "app/controllers/experiments/#{file_name}_controller.rb"
  end

  def create_view_file
    copy_file "index.html.erb",
              "app/views/experiments/#{file_name}/index.html.erb"
  end

  def create_config_file
    copy_file "config.yml",
              "config/experiments/#{file_name}.yml"
  end

end
