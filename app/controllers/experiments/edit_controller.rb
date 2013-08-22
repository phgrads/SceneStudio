class Experiments::EditController < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]
  layout 'webgl_viewport'

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("edit")
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
      render 'scenes/edit'
    else
      flash[:error] = @scene.errors.full_messages.to_sentence
    end
  end
end