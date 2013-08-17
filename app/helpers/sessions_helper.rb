module SessionsHelper

  def current_user=(user)
    @current_user = user
  end

  def on_mturk?
    !!(params['assignmentId'] || params['task_id'])
  end

  def mturk_task
    if params['task_id']  # Manually specified task_id when debugging
      @task = MtTask.find(params['task_id'])
    elsif params['hitId'] # Retrieve task from hitId provided by Mturk (e.g. when previewing)
      mt_hit = MtHit.find_by_mtId(params['hitId'])
      @task = MtTask.find(mt_hit)
    elsif params['assignmentId'] # Retrieve task from specific assignmentId (when worker is doing task)
      @assignment = MtAssignment.find_by_mtId!(params['assignmentId'])
      @task = @assignment.mt_task
    else # Couldn't find task so throw error
      raise ActionController::RoutingError.new('Task Not Found')
    end
    @task
  end

  def mturk_user
    mturk_task.user
  end

  def current_user
    if on_mturk? then
      @current_user = mturk_user
    else
      @current_user ||= User.find(session[:user_id]) if session[:user_id]
    end
  end

  def current_user?(user)
    user == current_user
  end

  def signed_in?
    not current_user.nil?
  end

  def signed_in_user_filter
    unless signed_in?
      redirect_to signin_url, notice: 'Please sign in.'
    end
  end

  def non_mturk_filter
    if on_mturk?
      raise ActionController::RoutingError.new('Not Found')
    end
  end
end
