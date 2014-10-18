class Experiments::Desc2sceneController < ApplicationController
  require 'action_view'

  include ActionView::Helpers::DateHelper
  include MturkHelper
  include Experiments::ExperimentsHelper
  include Experiments::Desc2sceneHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data, only: [:index]
  before_filter :estimate_task_time, only: [:index]

  before_filter :can_manage_tasks_filter, only: [:results, :view]
  before_filter :retrieve_list, only: [:results]
  before_filter :retrieve_item, only: [:view, :load]

  layout 'webgl_viewport', only: [:index, :view]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("desc2scene")
    end
    @title = @task.title
    if @entries.any? then
      render "experiments/desc2scene/index", layout: true
    else
      @message = @no_entries_message
      render "mturk/message", layout: false
    end
  end

  def results
    render "experiments/desc2scene/results", layout: true
  end

  def view
    render "experiments/desc2scene/view", layout: true
  end

  def load
    if @item.data
      render :json => @data
    else
      raise ActionController::RoutingError.new('Item Not Found')
    end
  end

  private
    def retrieve_list
      @task = MtTask.find_by_name!("desc2scene")
      @completed = get_completed_items(@task.id)
    end

end