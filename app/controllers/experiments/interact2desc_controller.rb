class Experiments::Interact2descController < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("interact2desc")
    end
    render "experiments/interact2desc/index", layout: false
  end
end