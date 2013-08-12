class CreateMtTasks < ActiveRecord::Migration
  def change
    create_table :mt_tasks do |t|
      t.string   :name
      t.datetime :submitted_at
      t.datetime :completed_at
      t.string   :title
      t.text     :description
      t.integer  :reward
      t.integer  :num_assignments
      t.integer  :max_workers
      t.integer  :max_hits_per_worker
      t.string   :keywords
      t.integer  :shelf_life
      t.integer  :max_task_time

      t.timestamps
    end

    add_index :mt_tasks, [:created_at]
  end
end
