class Experiments::Desc2sceneController < ApplicationController
  include MturkHelper
  include Experiments::ExperimentsHelper
  include Experiments::Desc2sceneHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data, only: [:index]
  before_filter :retrieve_list, only: [:results]
  before_filter :retrieve, only: [:view, :load]
  layout 'webgl_viewport', only: [:index, :view]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("desc2scene")
    end
    @title = @task.title
    render "experiments/desc2scene/index", layout: true
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
      @completed = CompletedItemsView.where('taskId = ?', @task.id)
    end

    def retrieve
      @item = CompletedItemsView.find(params[:id])
      @data = JSON.parse(@item.data)
      @title = @data["entry"]["description"]
    end

end