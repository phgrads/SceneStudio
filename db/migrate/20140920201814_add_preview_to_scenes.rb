class AddPreviewToScenes < ActiveRecord::Migration
  def change
    add_column :scenes, :preview_uid,  :string
    add_column :scenes, :preview_name, :string
  end
end
