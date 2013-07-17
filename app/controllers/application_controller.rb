class ApplicationController < ActionController::Base
  protect_from_forgery
  include SessionsHelper

  # for responding SUCCESS to AJAX actions
  def ok_JSON_response
    render json: { :success => "success", :status_code => "200" }
  end
end
