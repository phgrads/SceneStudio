class CreateMtCompletedItems < ActiveRecord::Migration
  def change
    create_table :mt_completed_items do |t|
      t.references :mt_task
      t.references :mt_worker
      t.integer :mt_hit_id
      t.integer :mt_assignment_id
      t.string :mt_condition
      t.string :mt_item
      t.text :data

      t.timestamps
    end
    add_index :mt_completed_items, :mt_task_id
    add_index :mt_completed_items, :mt_worker_id
  end
end
