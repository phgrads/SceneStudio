class Experiments::Image2sceneController < ApplicationController
  include MturkHelper
  include Experiments::ExperimentsHelper
  include Experiments::Image2sceneHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data, only: [:index]
  layout 'webgl_viewport'

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("image2scene")
    end
    @title = @task.title
    render "experiments/image2scene/index", layout: true
  end
end