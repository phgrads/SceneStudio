class ReduceMtHit < ActiveRecord::Migration
  def up
    remove_column :mt_hits, :name
    remove_column :mt_hits, :mtParams

    add_column    :mt_hits, :mt_task_id, :integer
  end

  def down
    remove_column :mt_hits, :mt_task_id
    
    add_column :mt_hits, :mtParams, :text
    add_column :mt_hits, :name, :string
    add_index :mt_hits, [:name]
  end
end
