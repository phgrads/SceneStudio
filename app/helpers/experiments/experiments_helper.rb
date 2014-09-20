module Experiments::ExperimentsHelper
  require 'csv'
  require 'set'

  def load_data
    @conf = YAML.load_file("config/experiments/#{controller_name}.yml")['conf']
    @entries = load_and_select_random(@conf['inputFile'], @conf['doneFile'], @conf['doneThreshold'], @conf['nScenes'])
  end

  def load_and_select_random(inputFile, doneFile, doneThreshold, n)
    all_entries = load_entries(inputFile)
    if (doneFile != nil && doneFile != "")
      done_entries = load_entries_done(doneFile)
      if (doneThreshold != nil && doneThreshold > 0)
        # Only consider those items with a count greater than the threshold to be done
        all_done_count = done_entries.size
        done_entries = done_entries.select{ |x| x[:count].to_i >= doneThreshold }
        done_count = done_entries.size
        logger.debug "Keep done " + done_count.to_s + " of " + all_done_count.to_s + " (threshold " + doneThreshold.to_s + ")"
      end
      # Remove done from all
      done = done_entries.map{ |x| x[:id] }.to_set
      entries = all_entries.select{ |x| !done.include?(x[:id]) }
    else
      entries = all_entries
    end
    logger.debug "Selecting " + n.to_s + " random entries from " + entries.size.to_s + " entries"
    select_random(entries, n)
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