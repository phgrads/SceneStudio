class CreateMtAssignments < ActiveRecord::Migration
  def change
    create_table :mt_assignments do |t|
      t.string :mtId
      t.integer :mt_hit_id
      t.integer :mt_worker_id
      t.text :input_data
      t.text :output_data
      t.boolean :completed

      t.timestamps
    end
    add_index :mt_assignments, [:mtId, :mt_hit_id, :mt_worker_id]
  end
end
