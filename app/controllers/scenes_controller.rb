class ScenesController < ApplicationController
  before_filter :signed_in_user_filter
  before_filter :special_access, only: [:index]
  before_filter :access_by_owner, only: [:edit, :load, :update, :destroy]

  def index
    @scene_list = current_user.scenes
  end

  def create
    @scene = current_user.scenes.build({
      name: params[:name],
    })
    if @scene.save
      flash[:success] = 'Scene created!'
      redirect_to scenes_url
    else
      flash[:error] = @scene.errors.full_messages.to_sentence
      redirect_to scenes_url
    end
  end

  # view for working on the scene available at scenes/#id/edit
  def edit
    @on_close_url = scenes_path
    render 'edit', layout: false
  end
  def view
    @on_close_url = '/scenes'
    render 'view', layout:false
  end
  def load
    if @scene.data
      render :json => { :scene => @scene.data, :ui_log => @scene.ui_log }
    else
      raise ActionController::RoutingError.new('Scene Not Found')
    end
  end

  # view for observing the scene available at scenes/#id
  #def show
  #end

  # send PUT to scenes/#id to update
  def update
    @scene.update_attributes!({
      :data => params[:scene_file],
      :ui_log => params[:ui_log]
    })
    # if that failed, an error is raised, otherwise...

    # send 200 response
    ok_JSON_response
  end

  # send DELETE to scenes/#id to destroy
  def destroy
    @scene.destroy
    flash[:success] = 'Scene deleted.'
    redirect_to scenes_url
  end

  private
    def access_by_owner
      @scene = current_user.scenes.find(params[:id])
      # this should probably be a 404 error or such...
      redirect_to(root_path) unless @scene
    end
    
    def special_access 
      if current_user.name=="viewer"
        @mode = "view"
      end
    end
end
