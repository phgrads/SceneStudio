class Experiments::TestController < ApplicationController
  include MturkHelper

  before_filter :load_new_tab_params, only: [:index]
  before_filter :mturk_user
  before_filter :get_scene
  layout 'webgl_viewport', only: [:view, :index]

  def index
  	#render 'index'
  	render '/scenes/view'
  	#redirect_to action:'view', id:@scene.id #Can't just call render because you need the correct id
  	#render 'view'
  end

  def view
  	#render 'scenes/view'
  end

  def update

  end

  private

  def get_scene
  	@scene = @mturk_user.scenes.first
  end

  def mturk_user
  	@mturk_user = User.find_by_name("worker")
  end
end

