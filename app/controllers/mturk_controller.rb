class MturkController < ApplicationController
  include MturkHelper

  before_filter :load_iframe_params, only: [:task]
  before_filter :require_assignment, only: [:report, :coupon, :report_item]
  before_filter :load_task_conf, only: [:coupon]

  before_filter :signed_in_user_filter, only: [:tasks]
  before_filter :list_tasks, only: [:tasks]

  # IFrame to be displayed in Amazon MTurk redirecting workers to actual task
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

  # Stores a completed item in the database
  def report_item
    if (params['id']) then
      # Update
      @item = MtCompletedItem.find(params['id'])
      # Verify hash, assignment id, item, and condition
      if @item.code != params['code']
        logger.warn("hash mismatch: #{@item.code} expected")
        fail_JSON_response and return
      elsif @item.mt_assignment_id != @assignment.id
        logger.warn("mt_assignment_id mismatch: #{@item.mt_assignment_id} expected")
        fail_JSON_response and return
      elsif @item.mt_item != params['item']
        logger.warn("mt_item mismatch: #{@item.mt_item} expected")
        fail_JSON_response and return
      elsif @item.mt_condition != params['condition']
        logger.warn("mt_condition mismatch: #{@item.mt_condition} expected")
        fail_JSON_response and return
      else
        @item.data = params['data']
      end
    else
      # New item
      @item = MtCompletedItem.new(mt_assignment_id: @assignment.id,
                                  mt_item: params['item'],
                                  mt_condition: params['condition'],
                                  data: params['data'])
    end

    @item.code = generate_hash(8)
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
      render json: {
          success: "success",
          status_code: "200",
          item: {
            id: @item.id,
            code: @item.code
          }
      }
    else
      fail_JSON_response
    end
  end

  # Indicates that this assignment was done
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

  # Provides a coupon for the workers to validate and get credit for their work
  def coupon
    submitted_code  = params[:coupon_code]
    true_code       = @assignment.coupon_code
    if submitted_code == true_code then
      # Only return data if task wants to save data with amazon as well
      if @conf['uploadSummary'] then
        render json: {
            success: "success",
            status_code: "200",
            data: @assignment.data
        }
      else
        ok_JSON_response
      end
    else
      fail_JSON_response
    end
  end

  # Shows the tasks we have
  # For developers to check task results and debug/develop task
  def tasks
    render 'mturk/tasks'
  end

  private
    def require_assignment
      @assignment = MtAssignment.find_by_mtId!(params['assignmentId'])
      @task = @assignment.mt_task
    end

    def load_task_conf
      @conf = YAML.load_file("config/experiments/#{@task.name}.yml")['conf']
    end

    def list_tasks
      @tasks = MtTask.all()
      @completed_items_count = CompletedItemsView.group(:taskId).count()
    end

    def generate_hash(length)
      (36**(length-1) + rand(36**length - 36**(length-1))).to_s(36)
    end
end
