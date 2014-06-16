# This file is used by Rack-based servers to start the application.

require ::File.expand_path('../config/environment',  __FILE__)
run SceneStudio::Application

# Uncomment to use reverse proxy to serve assets
require 'rack/reverse_proxy'

# TODO: Make the fuzzybox solr the default scenestudio solr
use Rack::ReverseProxy do
  reverse_proxy /^\/data\/?(.*)$/, 'http://dovahkiin.stanford.edu/scenestudio/data/$1'
#  reverse_proxy /^\/solr\/?(.*)$/, 'http://dovahkiin.stanford.edu/scenestudio/solr/$1'
  reverse_proxy /^\/solr\/?(.*)$/, 'http://dovahkiin.stanford.edu/fuzzybox/models3d/solr/$1'
end