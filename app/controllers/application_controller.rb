class ApplicationController < ActionController::Base
  protect_from_forgery
  include ApplicationHelper
  include SessionsHelper

  before_filter :get_base_url

  # for responding SUCCESS to AJAX actions
  def ok_JSON_response
    render json: { success: "success", status_code: "200" }
  end

  def fail_JSON_response
    render status: 500, json: { status_code: "500" }
  end
end
