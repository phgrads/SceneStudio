module SessionsHelper

  def current_user=(user)
    @current_user = user
  end

  def on_mturk?
    !!(params['assignmentId'] || params['task_id'])
  end

  def mturk_user
    if params['assignmentId'] then
      @assignment = MtAssignment.find_by_mtId!(params['assignmentId'])
      @task = @assignment.mt_task
    else
      @task = MtTask.find(params['task_id'])
    end
    @task.user
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
