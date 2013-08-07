class CreateMtHits < ActiveRecord::Migration
  def change
    create_table :mt_hits do |t|
      t.string :mtId
      t.string :name
      t.text :mtParams

      t.timestamps
    end
    add_index :mt_hits, [:mtId, :name]
  end
end
