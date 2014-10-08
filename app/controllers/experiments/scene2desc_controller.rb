class Experiments::Scene2descController < ApplicationController
  require 'action_view'

  include ActionView::Helpers::DateHelper
  include MturkHelper
  include Experiments::ExperimentsHelper
  include Experiments::Scene2descHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data, only: [:index]
  before_filter :estimate_task_time, only: [:index]

  before_filter :signed_in_user_filter, only: [:results, :view, :load]
  before_filter :retrieve_list, only: [:results]
  before_filter :retrieve, only: [:view, :load]

  layout 'webgl_viewport', only: [:index, :view]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("desc2scene")
    end
    @title = @task.title
    render "experiments/scene2desc/index", layout: true
  end

  def results
    render "experiments/scene2desc/results", layout: true
  end

  def view
    render "experiments/scene2desc/view", layout: true
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
      @task = MtTask.find_by_name!("scene2desc")
      @completed = CompletedItemsView.where('taskId = ?', @task.id)
    end

    def retrieve
      @item = CompletedItemsView.find(params[:id])
      @data = JSON.parse(@item.data)
      @entry = @data['entry']
      @title = @item.taskName + ' ' + @item.condition + ' ' + @item.item
    end

end