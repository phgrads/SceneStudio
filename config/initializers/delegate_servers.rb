# Be sure to restart your server when you modify this file.

# This initializer is used to launch child process servers
# and reverse-proxy requests to these servers.

if Rails.env.development? || Rails.env.test?
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
end

# launch solr server
#solrlog = File.open('log/solr.log','w')
#solrpid = spawn('python StartServer.py', [:out, :err]=>solrlog, :chdir=>'vendor/solr')

# When the ruby/rails process exits, take down all the forked
# processes with it.
at_exit do
  #getpgrp is unavailable on Windows but kill works there anyway so not a problem
  # if RUBY_PLATFORM == 'i386-mingw32'
  #   Process.kill('INT', solrpid)
  # else
  #   begin
  #     Process.kill('INT', -Process.getpgrp)
  #   rescue Interrupt
  #     # do nothing, but suppress senseless message by doing this
  #   end
  # end
end

