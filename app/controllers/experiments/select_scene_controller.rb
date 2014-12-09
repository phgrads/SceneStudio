class Experiments::SelectSceneController < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("select_scene")
    end
    render "experiments/select_scene/index", layout: false
  end
end