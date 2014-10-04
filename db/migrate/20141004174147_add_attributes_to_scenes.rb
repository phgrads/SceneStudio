class AddAttributesToScenes < ActiveRecord::Migration
  def change
    add_column :scenes, :description, :string
    add_column :scenes, :category, :string
    add_column :scenes, :tag, :string
    add_column :scenes, :dataset, :string
    add_column :scenes, :noedit, :boolean
  end
end
