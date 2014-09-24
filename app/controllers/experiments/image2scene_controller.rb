class Experiments::Image2sceneController < ApplicationController
  include MturkHelper
  include Experiments::ExperimentsHelper
  include Experiments::Image2sceneHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data, only: [:index]

  before_filter :signed_in_user_filter, only: [:results, :view, :load]
  before_filter :retrieve_list, only: [:results]
  before_filter :retrieve, only: [:view, :load]

  layout 'webgl_viewport', only: [:index, :view]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("image2scene")
    end
    @title = @task.title
    render "experiments/image2scene/index", layout: true
  end

  def results
    render "experiments/image2scene/results", layout: true
  end

  def view
    render "experiments/image2scene/view", layout: true
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
      @task = MtTask.find_by_name!("image2scene")
      @completed = CompletedItemsView.where('taskId = ?', @task.id)
    end

    def retrieve
      @item = CompletedItemsView.find(params[:id])
      @data = JSON.parse(@item.data)
      @entry = @data['entry']
      @title = @item.taskName + ' ' + @item.condition + ' ' + @item.item
    end

end