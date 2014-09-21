class AddStatusToMtCompletedItems < ActiveRecord::Migration
  def change
    add_column :mt_completed_items, :status, :string
  end
end
