class ScenesController < ApplicationController
  before_filter :signed_in_user_filter
  before_filter :access_by_owner, only: [:edit, :update, :destroy]
  before_filter :retrieve, only: [:edit, :load, :view, :preview, :update, :destroy]
  layout 'webgl_viewport', only: [:edit, :view]

  def index
    @scene_list = current_user.scenes

    respond_to do |format|
      format.html
      format.csv {
        columns = params[:columns]
        if columns
          columns = columns.split(',')
        end

        if params[:expr]
          # Exporting for use in experiment
          # Remap the scenes
          mapped = @scene_list.map{ |item| {
              id: "scene-#{item.id}",
              url: "/scenes/#{item.id}/load"
              #              url: item.preview.url
          }}
          send_data as_csv(mapped, columns, :col_sep => "\t")
        else
          send_data @scene_list.as_csv(columns)
        end
      }
    end
  end

  def create
    @scene = current_user.scenes.build({
      name: params[:name],
      description: params[:description],
      category: params[:category],
      tag: params[:tag],
      dataset: params[:dataset]
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
    render 'edit'
  end

  def load
    if @scene.data
      render :json => { :scene => @scene.data, :ui_log => @scene.ui_log }
    else
      raise ActionController::RoutingError.new('Scene Not Found')
    end
  end

  # view for observing the scene available at scenes/#id/view
  def view
    render 'view'
  end

  # preview for scene image available at scenes/#id/preview
  def preview
    redirect_to get_path(@scene.preview.url)
  end

  # send PUT to scenes/#id to update
  def update
    if params[:scene] then
      # Saving scene
      @scene.data = params[:scene]
      @scene.ui_log = params[:ui_log]
      if params['preview'] then
        preview_data = params['preview']
        image_data = Base64.decode64(preview_data['data:image/png;base64,'.length .. -1])
        @scene.preview = image_data
        @scene.preview.name = 'scene' + @scene.id.to_s + '.png'
        @scene.preview.meta = {
            "name" => @scene.preview.name,
            "time" => Time.now
        }
      end
      @scene.save!

      # send 200 response
      ok_JSON_response
    elsif params[:name] then
      # Saving meta data
      @scene.update_attributes!({
        :name => params[:name],
        :description => params[:description],
        :category => params[:category],
        :tag => params[:tag],
        :dataset => params[:dataset],
        :noedit => params[:noedit]
      })

      # send 200 response
      ok_JSON_response
    else
      # send error response
      fail_JSON_response
    end
  end

  # send DELETE to scenes/#id to destroy
  def destroy
    @scene.destroy
    flash[:success] = 'Scene deleted.'
    redirect_to scenes_url
  end

  private
    def access_by_owner
      userscenes = current_user.scenes
      if userscenes.empty? || !userscenes.where(id: params[:id]).exists?
        flash[:error] = "Cannot access scene with id=#{params[:id]}."
        redirect_to(scenes_path)
      end
    end

    def retrieve
      @scene = Scene.find(params[:id])
      @title = @scene.name
      @on_close_url = scenes_path
    end
end
