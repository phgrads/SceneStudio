class Experiments::Image2sceneController < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]
  layout 'webgl_viewport'

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("image2scene")
      @scene = @task.user.scenes.build({
                                           name: Time.now.to_s,
                                       })
    else
      @scene = @task.user.scenes.build({
                                           name: params[:assignmentId],
                                       })
    end
    @title = @scene.name
    if @scene.save
      flash[:success] = 'Scene created!'
      render "experiments/image2scene/index", layout: true
    else
      flash[:error] = @scene.errors.full_messages.to_sentence
    end
  end
end