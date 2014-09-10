class RemoveMtWorkerIdFromMtCompletedItems < ActiveRecord::Migration
  def change
    remove_column :mt_completed_items, :mt_task_id, :integer
    remove_column :mt_completed_items, :mt_worker_id, :integer
    remove_column :mt_completed_items, :mt_hit_id, :integer
  end
end
