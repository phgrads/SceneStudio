class TweakMtAssignment < ActiveRecord::Migration
  def up
    #temporarily remove index to prevent index name length error
    remove_index :mt_assignments, [:mtId, :mt_hit_id, :mt_worker_id]

    remove_column :mt_assignments, :completed
    remove_column :mt_assignments, :input_data
    remove_column :mt_assignments, :output_data

    add_column :mt_assignments, :completed_at, :datetime
    add_column :mt_assignments, :data, :text

    add_index :mt_assignments, [:mtId, :mt_hit_id, :mt_worker_id]
  end

  def down
    #temporarily remove index to prevent index name length error
    remove_index :mt_assignments, [:mtId, :mt_hit_id, :mt_worker_id]
    
    remove_column :mt_assignments, :data
    remove_column :mt_assignments, :completed_at

    add_column :mt_assignments, :output_data, :text
    add_column :mt_assignments, :input_data, :text
    add_column :mt_assignments, :completed, :boolean

    add_index :mt_assignments, [:mtId, :mt_hit_id, :mt_worker_id]
  end
end
