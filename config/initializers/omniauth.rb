# Be sure to restart your server when you modify this file.

# ensure redirect on failed login in development mode
OmniAuth.config.on_failure = Proc.new {
  |env| OmniAuth::FailureEndpoint.new(env).redirect_to_failure
}

Rails.application.config.middleware.use OmniAuth::Builder do
  provider :twitter,
           INIT_CONFIG['TWITTER_CONSUMER_KEY'],
           INIT_CONFIG['TWITTER_CONSUMER_SECRET']
  provider :google_oauth2,
           INIT_CONFIG['GOOGLE_CONSUMER_KEY'],
           INIT_CONFIG['GOOGLE_CONSUMER_SECRET']
  provider :identity, on_failed_registration:
    lambda { |env| IdentitiesController.action(:new).call(env) }
  # go to these URLs to manage:
  # https://dev.twitter.com
  # https://code.google.com/apis/console
end

