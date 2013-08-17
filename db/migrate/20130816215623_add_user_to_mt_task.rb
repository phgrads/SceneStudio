class AddUserToMtTask < ActiveRecord::Migration
  def change
    add_column :mt_tasks, :user_id, :integer
    add_index :mt_tasks, [:user_id]
  end
end
