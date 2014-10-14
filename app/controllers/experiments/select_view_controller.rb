class Experiments::SelectViewController < ApplicationController
  require 'action_view'

  include ActionView::Helpers::DateHelper
  include MturkHelper
  include Experiments::ExperimentsHelper
  include Experiments::SelectViewHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data, only: [:index]
  before_filter :estimate_task_time, only: [:index]

  before_filter :can_manage_tasks_filter, only: [:results, :view, :load]
  before_filter :retrieve_list, only: [:results]
  before_filter :retrieve_item, only: [:view, :load]

  layout 'webgl_viewport', only: [:index, :view]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("select_view")
    end
    @title = @task.title
    if @entries.any? then
      render "experiments/select_view/index", layout: true
    else
      @message = @no_entries_message
      render "mturk/message", layout: false
    end
  end

  def results
    render "experiments/select_view/results", layout: true
  end

  def view
    render "experiments/select_view/view", layout: true
  end

  def load
    if @item.data
      if @data['scene']
        render :json => @data
      else
        # Scene was not saved, get scene from url
        redirect_to @entry['url']
      end
    else
      raise ActionController::RoutingError.new('Item Not Found')
    end
  end

  private
    def retrieve_list
      @task = MtTask.find_by_name!("select_view")
      @completed = get_completed_items(@task.id)
    end

end