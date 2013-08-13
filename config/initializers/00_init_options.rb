# Be sure to restart your server when you modify this file.

# NOTE: this file begins with 00 to ensure it is lexicographically
# first and therefore executed before any other initalizers

# The purpose of this file is to load configuration data for other initializers

INIT_CONFIG = YAML.load_file("config/config.yml")[Rails.env]
raise "Failure: this deployment cannot be run under #{Rails.env} (no config.yml section)" unless INIT_CONFIG