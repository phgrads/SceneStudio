class CreateScenes < ActiveRecord::Migration
  def change
    create_table :scenes do |t|
      t.string :name
      t.integer :user_id
      t.text :data
      t.text :ui_log

      t.timestamps
    end
    add_index :scenes, [:user_id, :created_at]
  end
end
