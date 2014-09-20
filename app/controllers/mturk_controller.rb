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
      # Some basic checks
      if (@hit.id != @assignment.mt_hit_id)
        @error = 'Assignment ' + @assignment.mtId + ' belongs to hit ' + @assignment.mt_hit_id.to_s + ' not ' + @hit.id.to_s
      else
        if (@task.id != @hit.mt_task_id) then
          @error = 'Assignment ' + @assignment.mtId + ' belongs to task ' + @hit.mt_task_id.to_s + ' not ' + @task.id.to_s
        end
      end
    end

    if @error then
      raise StandardError.new(@error)
    else
      render 'mturk/task', layout: false
    end
  end

  def report_item
    @item = MtCompletedItem.new(mt_assignment_id: @assignment.id,
                                mt_item: params['item'],
                                mt_condition: params['condition'],
                                data: params['data'])
    @task = @assignment.mt_task
    if params['preview'] then
      preview_data = params['preview']
      image_data = Base64.decode64(preview_data['data:image/png;base64,'.length .. -1])
      @item.preview = image_data
      @item.preview.name = params['condition'].to_s + '_' + params['item'].to_s + '_' + @assignment.id.to_s + '.png'
      @item.preview.meta = {
          "name" => @item.preview.name,
          "time" => Time.now,
          "task" => @task.name,
          "condition" => params['condition'],
          "item" => params['item'],
          "worker" => @assignment.mt_worker.mtId
      }
    end

    if @item.save then
      ok_JSON_response
    else
      fail_JSON_response
    end
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
