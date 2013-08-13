class Experiments::<%= class_name %>Controller < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]

  def index
    render "experiments/<%= file_name %>/index", layout: false
  end
end