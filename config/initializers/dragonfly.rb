require 'dragonfly'

# Configure
Dragonfly.app.configure do
  plugin :imagemagick

# imagemagick (http://www.imagemagick.org/) path for Windows (use for thumbnails)
#  plugin :imagemagick,
#    convert_command: "C:/Program\\ Files/ImageMagick-6.8.9-Q16/convert.exe",
#    identify_command: "C:/Program\\ Files/ImageMagick-6.8.9-Q16/identify.exe"

  secret "9d0c9c3dc750d3ee3e41b2faf299cf6d6ee8bbbbc6f87d1647d5e8bf79306281"

  url_format "/media/:job/:name"

  datastore :file,
    root_path: Rails.root.join('public/system/dragonfly', Rails.env),
    server_root: Rails.root.join('public')
end

# Logger
Dragonfly.logger = Rails.logger

# Mount as middleware
Rails.application.middleware.use Dragonfly::Middleware

# Add model functionality
if defined?(ActiveRecord::Base)
  ActiveRecord::Base.extend Dragonfly::Model
  ActiveRecord::Base.extend Dragonfly::Model::Validations
end