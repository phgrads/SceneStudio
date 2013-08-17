class Experiments::<%= class_name %>Controller < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("<%= file_name %>")
    end
    render "experiments/<%= file_name %>/index", layout: false
  end
end