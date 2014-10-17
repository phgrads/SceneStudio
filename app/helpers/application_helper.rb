module ApplicationHelper
  def get_base_url
	  @base_url = ENV['RAILS_RELATIVE_URL_ROOT'] ||= ''
  end

  def full_title(page_title)
    base_title = 'SceneStudio'
    if page_title.empty? then
      base_title
    else
      "#{base_title} | #{page_title}"
    end
  end

  def as_csv(array, column_names, *options)
    if column_names.nil?
      column_names = array.first.keys
    end
    CSV.generate(*options) do |csv|
      csv << column_names
      array.each do |item|
        csv << item.values_at(*column_names)
      end
    end
  end

  def get_path(url)
    if url.start_with?("/")
      @base_url + url
    else
      url
    end
  end
end
