class Experiments::SelectViewController < ApplicationController
  require 'action_view'

  include ActionView::Helpers::DateHelper
  include MturkHelper
  include Experiments::ExperimentsHelper
  include Experiments::SelectViewHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data, only: [:index]
  before_filter :estimate_task_time, only: [:index]

  before_filter :signed_in_user_filter, only: [:results]
  before_filter :retrieve_list, only: [:results]

  layout 'webgl_viewport', only: [:index]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("select_view")
    end
    @title = @task.title
    render "experiments/select_view/index", layout: true
  end

  def results
    render "experiments/select_view/results", layout: true
  end

  def view
    render "experiments/select_view/view", layout: true
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
      @task = MtTask.find_by_name!("select_view")
      @completed = CompletedItemsView.where('taskId = ?', @task.id)
    end

    def retrieve
      @item = CompletedItemsView.find(params[:id])
      @data = JSON.parse(@item.data)
      @entry = @data['entry']
      @title = @item.taskName + ' ' + @item.condition + ' ' + @item.item
    end

end