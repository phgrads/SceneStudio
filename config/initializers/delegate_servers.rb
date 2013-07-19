# Be sure to restart your server when you modify this file.

# This initializer is used to launch child process servers
# and reverse-proxy requests to these servers.

# NOTE: In production, it would probably be a better idea to
# use Apache or nginx to reverse proxy the requests

# configure reverse proxy on dev machines
require 'rack/reverse_proxy'
Rails.application.config.middleware.use Rack::ReverseProxy do 
  # Set :preserve_host to true globally (default is true already)
  #reverse_proxy_options :preserve_host => true

  # Forward the path /test* to http://example.com/test*
  #reverse_proxy '/test', 'http://example.com/'

  # Forward the path /foo/* to http://example.com/bar/*
  #reverse_proxy /^\/foo(\/.*)$/, 'http://example.com/bar$1',
  #              :username => 'name', :password => 'basic_auth_secret'

  reverse_proxy '/solr', 'http://127.0.0.1:8983/'
end

# launch solr server
solr_pid = fork do
  exec("cd vendor/solr; python StartServer.py >& ../../log/solr.log")
end

# When the ruby/rails process exits, take down all the forked
# processes with it.
at_exit do
  Process.kill('INT', -Process.getpgrp)
end
