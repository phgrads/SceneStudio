class Experiments::EditController < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]
  layout 'webgl_viewport'

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("edit")
    end
    @scene = @task.user.scenes.build({
      name: params[:assignmentId],
    })
    puts @scene
    if @scene.save
      flash[:success] = 'Scene created!'
      render 'scenes/edit'
    else
      flash[:error] = @scene.errors.full_messages.to_sentence
    end
  end
end