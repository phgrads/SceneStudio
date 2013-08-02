module ApplicationHelper
  def base_url
	  ENV['RAILS_RELATIVE_URL_ROOT'] ||= ''
  end

  def full_title(page_title)
    base_title = 'SceneStudio'
    if page_title.empty? then
      base_title
    else
      "#{base_title} | #{page_title}"
    end
  end

end
