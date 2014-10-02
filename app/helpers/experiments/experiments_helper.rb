module Experiments::ExperimentsHelper
  require 'csv'
  require 'set'

  def load_data
    @conf = YAML.load_file("config/experiments/#{controller_name}.yml")['conf']
    @entries = load_and_select_random(@conf['inputFile'], @conf['doneFile'],
                                      @conf['doneThreshold'], @conf['perWorkerItemCompletedThreshold'], @conf['nScenes'])
    @no_entries_message = "You already completed all items in this task!  There are no more items for you to complete."
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

  def load_and_select_random(inputFile, doneFile, doneThreshold, itemCompletedThreshold, n)
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
        logger.debug "Keep done #{done_count} of #{all_done_count} (threshold #{doneThreshold})"
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
        logger.debug "Keep done #{done_count} of #{all_done_count} (threshold #{doneThreshold})"
        done = done_entries.map{ |k,v| k }.to_set

        # Remove done from all
        entries = all_entries.select{ |x| !done.include?(x[:id]) }
      else
        entries = all_entries
      end
    end

    # Filter by entries that were already done for the worker
    if itemCompletedThreshold != nil && itemCompletedThreshold > 0
      entries = filter_worker_completed_entries(entries, taskId, workerId, itemCompletedThreshold)
    end

    # Experimental code for different selection policies
    select_policy = "random"
    logger.debug "Selecting #{n} entries from #{entries.size} entries"
    if select_policy == "random" || select_policy == nil
      # Do random selection from final remaining entries
      select_random(entries, n)
    elsif select_policy == "mincount"
      # Select entries that were completed least
      entries_counts = count_completed_entries_for(taskId, entries)
      select_by_count_min(entries_counts, n)
    elsif select_policy == "mincount_random"
      # Select entries randomly, favoring those with minimum completed count
      entries_counts = count_completed_entries_for(taskId, entries)
      select_random_grouped(entries_counts, n)
    else
      raise "Invalid selection policy #{select_policy}"
    end
  end

  def filter_worker_completed_entries(entries, taskId, workerId, itemCompletedThreshold)
    worker_completed_counts = count_worker_completed_entries(taskId, workerId)
    worker_completed = worker_completed_counts.select{ |k,v| v.to_i >= itemCompletedThreshold }
    logger.debug "Worker #{workerId} has already completed #{worker_completed_counts.size} entries, #{worker_completed.size} >= #{itemCompletedThreshold}"
    worker_done = worker_completed.map{ |k,v| k }.to_set
    entries.select{ |x| !worker_done.include?(x[:id]) }
  end

  def load_worker_completed_entries(taskId, workerId)
    # Load entries that were already done by the worker for this task
    CompletedItemsView.where('taskId = ? AND workerId = ?', taskId, workerId)
  end

  def count_worker_completed_entries(taskId, workerId)
    # Count entries that were already done by the worker for this task
    # TODO: Only count approved
    CompletedItemsView.group(:item).where('taskId = ? AND workerId = ?', taskId, workerId).count()
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

  def count_completed_entries_for(taskId, entries)
    completed_counts = count_completed_entries(taskId)
    entries.each { |x| x[:count] = completed_counts[x[:id]]? completed_counts[x[:id]]:0 }
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

  def select_random_grouped(entries, n)
    if (entries.length > n)
      logger.debug(entries)
      grouped = entries.group_by{ |x| x[:count] }
      logger.debug(grouped)
      grouped.sort_by{ |k,v| k }.map{ |k,v| v.shuffle }.flatten.take(n)
    else
      entries.shuffle
    end
  end

  def select_by_count_min(entries, n)
    if (entries.length > n)
      sorted = entries.sort_by{ |x| x[:count] }
      sorted.take(n).shuffle
    else
      entries.keys.shuffle
    end
  end
end