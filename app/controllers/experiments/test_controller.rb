class Experiments::TestController < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]
  layout 'webgl_viewport'

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("test")
    end
    @scene = Scene.find(264)
	render 'scenes/view'
  end
end
