module Experiments::ExperimentsHelper
  require 'csv'
  require 'set'

  def load_data
    @conf = YAML.load_file("config/experiments/#{controller_name}.yml")['conf']
    @entries = load_and_select_random(@conf['inputFile'], @conf['doneFile'], @conf['doneThreshold'], @conf['nScenes'])
  end

  def estimate_task_time
    sceneTimeInSecs = @conf['sceneEditSecs']
    taskTimeInSecs = @conf['sceneEditSecs']*@conf['nScenes']
    @taskTime = {
      'sceneTimeInSecs' => sceneTimeInSecs,
      'sceneTime' => distance_of_time_in_words(sceneTimeInSecs),
      'taskTimeInSecs'  => taskTimeInSecs,
      'taskTime'  => distance_of_time_in_words(taskTimeInSecs)
    }
  end

  def load_and_select_random(inputFile, doneFile, doneThreshold, n)
    # Figure out task and worker id
    taskId = @task.id
    workerId = @worker ? @worker.mtId : ''
    # Load entries from file
    all_entries = load_entries(inputFile)
    # Filter all entries by entries that were deemed overall "DONE"
    if (doneFile != nil && doneFile != "")
      # Use file to figure out what items are done
      if (doneThreshold != nil && doneThreshold > 0)
        # Load done entries from file
        done_entries = load_entries_done(doneFile)
        # Only consider those items with a count greater than the threshold to be done
        all_done_count = done_entries.size
        done_entries = done_entries.select{ |x| x[:count].to_i >= doneThreshold }
        done_count = done_entries.size
        logger.debug "Keep done " + done_count.to_s + " of " + all_done_count.to_s + " (threshold " + doneThreshold.to_s + ")"
        # Remove done from all
        done = done_entries.map{ |x| x[:id] }.to_set
        entries = all_entries.select{ |x| !done.include?(x[:id]) }
      else
        entries = all_entries
      end
    else
      if (doneThreshold != nil && doneThreshold > 0)
        # Figure out count of done items from database
        # done_entries is a hash of item id to count
        done_entries = count_completed_entries(taskId)

        # Only consider those items with a count greater than the threshold to be done
        all_done_count = done_entries.size
        done_entries = done_entries.select{ |k,v| v.to_i >= doneThreshold }
        done_count = done_entries.size
        logger.debug "Keep done " + done_count.to_s + " of " + all_done_count.to_s + " (threshold " + doneThreshold.to_s + ")"
        done = done_entries.map{ |k,v| k }.to_set

        # Remove done from all
        entries = all_entries.select{ |x| !done.include?(x[:id]) }
      else
        entries = all_entries
      end
    end
    # Filter by entries that were already done for the worker
    entries = filter_worker_completed_entries(entries, taskId, workerId)

    # Do random selection from final remaining entries
    logger.debug "Selecting " + n.to_s + " random entries from " + entries.size.to_s + " entries"
    select_random(entries, n)
  end

  def filter_worker_completed_entries(entries, taskId, workerId)
    worker_completed = load_worker_completed_entries(taskId, workerId)
    logger.debug "Worker " + workerId.to_s + " has already completed " + worker_completed.size.to_s + " entries"
    worker_done = worker_completed.map{ |x| x[:item] }.to_set
    entries.select{ |x| !worker_done.include?(x[:id]) }
  end

  def load_worker_completed_entries(taskId, workerId)
    # Load entries that were already done by the worker for this task
    CompletedItemsView.where('taskId = ? AND workerId = ?', taskId, workerId)
  end

  def load_completed_entries(taskId)
    # Load entries that were already done for this task
    CompletedItemsView.where('taskId = ?', taskId)
  end

  def count_completed_entries(taskId)
    # Count entries already done for this task
    # TODO: Only count approved
    CompletedItemsView.group(:item).where('taskId = ?', taskId).count()
  end

  def load_entries(file)
    # Loads entries from file
    csv_file = File.join(Rails.root,file)
    csv = CSV.read(csv_file, { :headers => true, :col_sep => "\t"})
    csv.map { |row|
      {
          id: row['id'],
          description: row['description'],
          category: row['category'],
          url: row['url']
      }
    }
  end

  def load_entries_done(file)
    # Loads entry ids from file
    csv_file = File.join(Rails.root,file)
    csv = CSV.read(csv_file, :headers => false)
    csv.map { |row|
      {
          id: row[0],
          count: row[1]
      }
    }
  end

  def select_random(entries, n)
    if (entries.length > n)
      entries.shuffle.take(n)
    else
      entries.shuffle
    end
  end
end