class CompletedItemsView < ActiveRecord::Base
  #self.table_name = 'completed_items_view'  # for rails >= 3.2
  self.set_table_name 'completed_items_view' # for rails <= 3.1
  attr_readonly :data, :taskId, :taskName, :workerId, :condition, :item
  belongs_to :mt_task, :foreign_key => 'taskId'
end
