class AddConfToMtHits < ActiveRecord::Migration
  def change
    add_column :mt_hits, :completed_at, :datetime
    add_column :mt_hits, :conf, :string
  end
end
