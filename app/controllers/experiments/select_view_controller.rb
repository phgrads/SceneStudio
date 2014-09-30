class Experiments::SelectViewController < ApplicationController
  require 'action_view'

  include ActionView::Helpers::DateHelper
  include MturkHelper
  include Experiments::ExperimentsHelper
  include Experiments::SelectViewHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :load_data, only: [:index]
  before_filter :estimate_task_time, only: [:index]

  layout 'webgl_viewport', only: [:index]

  def index
    if not @via_turk then
      @task = MtTask.find_by_name!("select_view")
    end
    @title = @task.title
    render "experiments/select_view/index", layout: true
  end
end