class MturkController < ApplicationController
  include MturkHelper

  before_filter :load_iframe_params, only: [:task]
  before_filter :require_assignment, only: [:report, :coupon, :report_item, :approve_assignment, :reject_assignment]
  before_filter :load_task_conf, only: [:task, :coupon]

  before_filter :can_manage_tasks_filter,
                except: [:task, :report_item, :report, :coupon]
  before_filter :list_tasks, only: [:tasks]
  before_filter :list_assignments, only: [:assignments]
  before_filter :list_items, only: [:items]
  before_filter :retrieve_item, only: [:preview_item, :destroy_item, :update_item]
  layout 'webgl_viewport', only: [:update_scenes]

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

  # Below are for mturk managers

  # Shows the tasks we have
  # For developers to check task results and debug/develop task
  def tasks
    render 'mturk/tasks'
  end

  def assignments
    respond_to do |format|
      format.html {
        render 'mturk/assignments'
      }
      format.csv {
        columns = params[:columns]
        if columns
          columns = columns.split(',')
        end
        send_data @assignments.as_csv(columns)
      }
    end
  end

  def items
    respond_to do |format|
      format.csv {
        columns = params[:columns]
        if params[:filename]
          filename = params[:filename]
        elsif params[:taskName]
          taskName = params[:taskName]
          filename = "#{taskName}-items.csv"
        else
          filename = 'items.csv'
        end
        if columns
          columns = columns.split(',')
        end

        if params[:expr]
          # Exporting for use in experiment
          # Remap the items
          mapped = @items.map{ |item| {
              id: "#{item.taskName}-#{item.id}",
              url: get_item_load_scene_url(item)
              #              url: item.preview.url
          }}
          # Special remappings
          if params[:taskName]
            case taskName
              when "scene2desc", "image2desc"
                mapped = @items.map{ |item|
                  entry = JSON.parse(item.data)
                  {
                    id: "#{item.taskName}-#{item.id}",
                    url: get_item_load_scene_url(item),
                    description: entry['description']
                  }
                }
              when "rate_scene"
                mapped = @items.map{ |item|
                  entry = JSON.parse(item.data)
                  {
                    annotationId: "#{item.id}",
                    itemId: entry['entry']['id'],
                    taskCondition: "#{item.condition}",
                    condition: entry['entry']['condition'],
                    description: entry['entry']['description'],
                    rating: entry['rating'],
                    workerId: item.workerId
                  }
                }
            end
          end
          send_data as_csv(mapped, columns), :filename => filename
        else
          # Normal export as csv
          send_data @items.as_csv(columns), :filename => filename
        end
      }
    end
  end

  def stats
    stats_name = params[:name]
    counts = nil
    case stats_name
      when "item_count"
        list_items
        field = 'item'
        counts = count(@items, field, 'count_desc')
        @title = "Item counts (#{@items.length} over #{counts.length} items)"
      when "worker_item_count"
        list_items
        field = 'workerId'
        counts = count(@items, field, 'count_desc')
        @title = "Worker item counts (#{@items.length} over #{counts.length} workers)"
      when "condition_item_count"
        list_items
        field = 'condition'
        counts = count(@items, field, 'count_desc')
        @title = "Condition item counts (#{@items.length} over #{counts.length} conditions)"
      when "task_item_count"
        list_items
        field = 'taskName'
        counts = count(@items, field, 'count_desc')
        @title = "Task item counts (#{@items.length} over #{counts.length} tasks)"
    end
    respond_to do |format|
      format.html {
        if counts
          @counts = counts
          if params[:taskName]
            taskName = params[:taskName]
            @counts.each{ |x|
              # path with current params and additional filter based on field + x.name
              x['link'] = url_for(params.merge(
                                      {:controller => "experiments/#{taskName}",
                                       :action => 'results',
                                        field => x['name']}))
            }
          end
          render 'mturk/stats'
        else
          raise StandardError.new('Error getting counts')
        end
      }
      format.csv {
        if counts
            send_data as_csv(counts, ['name', 'count'])
        else
            fail_JSON_response
        end
      }
    end
  end

  def approve_assignment
    @assignment.approve!(params['feedback'])
    flash[:success] = 'Assignment accepted.'
    redirect_to request.referer
  end

  def reject_assignment
    @assignment.reject!(params['reason'])
    flash[:success] = 'Assignment rejected.'
    redirect_to request.referer
  end

  # Updates status for multiple items (for management purposes, without updating the update time)
  def update_items
    if (params['items']) then
      items = JSON.parse(params['items'])
      items.each { |x|
        item = MtCompletedItem.find(x['id'].to_i)
        item.update_column('status', x['status'])
      }
      ok_JSON_response
    else
      fail_JSON_response
    end
  end

  # Updates item (for management purposes, without updating the update time)
  def update_item
    if @item then
      if (params['data']) then
        @item.update_column('data', params['data'])
      end
      if (params['status']) then
        @item.update_column('status', params['status'])
      end
      ok_JSON_response
    else
      fail_JSON_response
    end
  end

  # Convert old scene format into new scene format with transforms
  def update_scenes
    @title = "Update MTurk scenes..."
    add_transforms_to_scenes
  end

  def add_transforms_to_scenes
    allItems = CompletedItemsView.all
    @items = allItems.select{ |item|
      data = JSON.parse(item.data)
      if data.include?('scene') then
        # Check if the scene data has transforms
        scene_data = JSON.parse(data['scene'])
        objects = scene_data['objects']
        objects.any?{ |obj| !obj.include?('transform')}
      else
        false
      end
    }
    @entries = @items.map{
        |item|
      {
          'id' => item.id,
          'data' => JSON.parse(item.data),
          'url' => get_item_load_scene_url(item)
      }
    }
    render 'mturk/updateScenes'
  end

  def destroy_item
    @item.destroy
    flash[:success] = 'Item deleted.'
    redirect_to request.referer
  end

  # preview for item image available at mturk/results/#id/preview
  def preview_item
    redirect_to get_path(@item.preview.url)
  end

  private
    def require_assignment
      @assignment = MtAssignment.find_by_mtId!(params['assignmentId'])
      @task = @assignment.mt_task
    end

    def load_task_conf
      task_conf = YAML.load_file("config/experiments/#{@task.name}.yml")
      @require_webgl = task_conf['require_webgl']
      @conf = task_conf['conf']
    end

    def list_tasks
      @tasks = MtTask.all()
      @completed_items_count = CompletedItemsView.group(:taskId).count()
      @ok_items_count = CompletedItemsView.group(:taskId).where("status <> 'REJ' or status is null").count()
      @assignments_count = AssignmentsView.group(:taskName).count()
    end

    def list_assignments
      @assignments = AssignmentsView.filter(params.slice(:hitId, :workerId, :taskName, :assignmentId))
      if params[:completed]
        @assignments = @assignments.select{ |a| a.completed? == params[:completed].to_bool }
      end
      if params[:live]
        @assignments = @assignments.select{ |a| a.live? == params[:live].to_bool }
      end
      @assignments
    end

    def list_items
      @items = CompletedItemsView.filter(params.slice(:workerId, :taskName, :condition, :item, :status, :hitId, :assignmentId, :ok))
    end

    def get_item_load_scene_url(item)
      "/experiments/#{item.taskName}/#{item.id}/load"
    end

    def retrieve_item
      @item = MtCompletedItem.find(params[:itemId])
    end

    def generate_hash(length)
      (36**(length-1) + rand(36**length - 36**(length-1))).to_s(36)
    end

    def counts_as_hash(array, field)
      counts = array.group_by{ |x| x[field]}.map{ |k,v| [k,v.count] }
      Hash[*counts.flatten]
    end

    def count(array, field, sort = 'none')
      counts = array.group_by{ |x| x[field]}.map{ |k,v| {
          "name" => k,
          "count" => v.count
      } }
      case sort
        when "count_desc"
          counts.sort_by!{ |x| [-x["count"], x["name"]] }
        when "count_asc"
          counts.sort_by!{ |x| [x["count"], x["name"]] }
        when "name"
          counts.sort_by!{ |x| x["name"] }
      end
      counts
    end

end
