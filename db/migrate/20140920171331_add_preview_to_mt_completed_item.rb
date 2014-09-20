class AddPreviewToMtCompletedItem < ActiveRecord::Migration
  def change
    add_column :mt_completed_items, :preview_uid,  :string
    add_column :mt_completed_items, :preview_name, :string
  end
end
