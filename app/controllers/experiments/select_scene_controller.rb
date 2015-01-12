class Experiments::SelectSceneController < ApplicationController
  require 'action_view'

  include ActionView::Helpers::DateHelper
  include MturkHelper
  include Experiments::ExperimentsHelper
  include Experiments::SelectSceneHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data_generic_csv, only: [:index]
  before_filter :estimate_task_time, only: [:index]

  before_filter :can_manage_tasks_filter, only: [:results, :view]
  before_filter :retrieve_list, only: [:results]
  before_filter :retrieve_item, only: [:view, :load]

  layout 'webgl_viewport', only: [:index, :view]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("select_scene")
    end
    @title = @task.title
    if @entries.any? then
      render "experiments/select_scene/index", layout: true
    else
      @message = @no_entries_message
      render "mturk/message", layout: false
    end
  end

  def results
    render "experiments/select_scene/results", layout: true
  end

  def view
    render "experiments/select_scene/view", layout: true
  end

  private
  def retrieve_list
    @task = MtTask.find_by_name!("select_scene")
    @completed = get_completed_items(@task.id)
  end

end