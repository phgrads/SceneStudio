class AddNameIndexToMtTask < ActiveRecord::Migration
  def change
    add_index :mt_tasks, [:name]
  end
end
