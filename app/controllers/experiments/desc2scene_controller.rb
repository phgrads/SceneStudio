class Experiments::Desc2sceneController < ApplicationController
  include MturkHelper
  include Experiments::Desc2sceneHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data
  layout 'webgl_viewport'

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("desc2scene")
      @scene = @task.user.scenes.build({
                                           name: Time.now.to_s,
                                       })
    else
      @scene = @task.user.scenes.build({
                                           name: params[:assignmentId],
                                       })
    end
    if @scene.save
      flash[:success] = 'Scene created!'
      render "experiments/desc2scene/index", layout: true
    else
      flash[:error] = @scene.errors.full_messages.to_sentence
    end
  end

end