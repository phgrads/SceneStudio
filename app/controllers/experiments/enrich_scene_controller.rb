class Experiments::EnrichSceneController < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("enrich_scene")
    end
    render "experiments/enrich_scene/index", layout: false
  end
end