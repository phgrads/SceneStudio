module MturkHelper
  # any page which is passed GET parameters
  # as if it were an iframe loaded on mturk
  # can use this method to load those parameters
  # into member variables in the controller object
  def load_iframe_params
    @via_turk = !!params['assignmentId']
    @preview  = (params['assignmentId'] == 'ASSIGNMENT_ID_NOT_AVAILABLE')
    @sandbox  = RTurk.sandbox?

    if @via_turk then
      @hit        = MtHit.find_by_mtId!(params['hitId'])
      @task       = @hit.mt_task
      if not @preview then
        get_worker        params['workerId']
        get_assignment    params['assignmentId']

        @turk_submit_to = params['turkSubmitTo']
      end
    end

    true # in case this function is used as a filter
  end

  # Load parameters (assignment, task, sandbox, etc.) as if it were a
  # new tab (on SceneStudio?).
  # The difference is we don't have to worry about preview mode or hit
  # id
  def load_new_tab_params
    @via_turk = !!params['assignmentId']
    @sandbox  = RTurk.sandbox?
    if @via_turk then
      @assignment = MtAssignment.find_by_mtId!(params['assignmentId'])
      @task = @assignment.mt_task
      @worker = @assignment.mt_worker
    end
  end

  # Assign qualification to workers
  def assign_qualification(qual_type_id, worker_ids, notification, value)
    worker_ids.each do |worker_id|
      RTurk.AssignQualification(:qualification_type_id => qual_type_id,
                                :worker_id => worker_id,
                                :send_notification => notification,
                                :integer_value => value)
    end
  end

  # Assign qualification to workers
  def notify_workers(worker_ids, subject, message_text)
    RTurk.NotifyWorkers(:worker_ids => worker_ids,
                        :subject => subject,
                        :message_text => message_text)
  end

  private
    def get_worker(mt_id)
      @worker = MtWorker.find_by_mtId(mt_id) ||
                MtWorker.create! do |worker|
                  worker.mtId = mt_id
                end
    end

    def get_assignment(mt_id)
      @assignment = MtAssignment.find_by_mtId(mt_id) ||
                    MtAssignment.register_and_save(mtId: mt_id,
                                                   worker: @worker,
                                                   hit: @hit)
    end
end
