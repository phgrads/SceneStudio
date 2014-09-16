class MturkController < ApplicationController
  include MturkHelper

  before_filter :load_iframe_params, only: [:task]
  before_filter :require_assignment, only: [:report, :coupon, :report_item]

  def task
    # should improve on this and be less kludgy in the future...?
    # could build a table of experiment_urls in the initializer
    # and then do a lookup into that table by name...
    if @via_turk and not @preview then
      @new_tab_href = root_url + 'experiments/' + @task.name +
                      '?assignmentId=' + @assignment.mtId
    end
    render 'mturk/task', layout: false
  end

  def report_item
    @item = MtCompletedItem.create(mt_assignment_id: @assignment.id,
                                   mt_item: params['item'],
                                   mt_condition: params['condition'],
                                   data: params['data'])
    render json: {
        success: "success",
        status_code: "200"
    }
  end

  def report
    # close out the assignment (preventing re-completion)
    @assignment.complete!(params['data']) unless @assignment.completed?
    # always send the coupon code in response
    render json: {
      success: "success",
      status_code: "200",
      coupon_code: @assignment.coupon_code
    }
  end

  def coupon
    submitted_code  = params[:coupon_code]
    true_code       = @assignment.coupon_code
    if submitted_code == true_code then
#   TODO: only return data if assignment want to save data with amazon as well
      render json: {
          success: "success",
          status_code: "200",
          data: @assignment.data
      }
    else
      fail_JSON_response
    end
  end

  private
    def require_assignment
      @assignment = MtAssignment.find_by_mtId!(params['assignmentId'])
    end
end
