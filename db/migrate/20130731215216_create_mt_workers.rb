class CreateMtWorkers < ActiveRecord::Migration
  def change
    create_table :mt_workers do |t|
      t.string :mtId

      t.timestamps
    end
    add_index :mt_workers, [:mtId]
  end
end
