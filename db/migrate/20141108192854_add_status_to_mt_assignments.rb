class AddStatusToMtAssignments < ActiveRecord::Migration
  def change
    add_column :mt_assignments, :status, :string
  end
end
