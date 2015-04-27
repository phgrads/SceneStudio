# Be sure to restart your server when you modify this file.

# This initializer is used to set up the mechanical turk interface

RTurk::setup( INIT_CONFIG['AWS_ACCESS_KEY_ID'],
              INIT_CONFIG['AWS_SECRET_ACCESS_KEY'],
              sandbox: true)

# dump RTurk log statements to the main Rails log
RTurk::Logger.logger = Rails.logger

