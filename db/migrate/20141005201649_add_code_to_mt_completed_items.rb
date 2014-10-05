class AddCodeToMtCompletedItems < ActiveRecord::Migration
  def change
    add_column :mt_completed_items, :code, :string
  end
end
