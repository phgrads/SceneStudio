class Experiments::AlignText2sceneController < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("align_text2scene")
    end
    render "experiments/align_text2scene/index", layout: false
  end
end