class Experiments::Interact2descController < ApplicationController
  require 'action_view'

  include ActionView::Helpers::DateHelper
  include MturkHelper
  include Experiments::ExperimentsHelper
  include Experiments::Interact2descHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data_generic_tsv, only: [:index]
  before_filter :estimate_task_time, only: [:index]

  before_filter :can_manage_tasks_filter, only: [:results, :view]
  before_filter :retrieve_list, only: [:results]
  before_filter :retrieve_item, only: [:view, :load]

  layout 'webgl_viewport', only: [:index, :view] # TODO: delete!

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("interact2desc")
    end
    @title = @task.title
    if @entries.any? then
      render "experiments/interact2desc/index", layout: true
    else
      @message = @no_entries_message
      render "mturk/message", layout: false
    end
  end

  def results
    render "experiments/interact2desc/results", layout: true
  end

  def view
    render "experiments/interact2desc/view", layout: true
  end

  private
  def retrieve_list
    @task = MtTask.find_by_name!("interact2desc")
    @completed = get_completed_items(@task.id)
  end

end
