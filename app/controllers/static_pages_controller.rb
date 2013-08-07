class StaticPagesController < ApplicationController
  def home
	  if signed_in?
		  redirect_to scenes_url
	  end
  end

  def help
  end
end
