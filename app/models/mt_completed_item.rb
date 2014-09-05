class MtCompletedItem < ActiveRecord::Base
  belongs_to :mt_task
  belongs_to :mt_worker
  attr_accessible :data, :mt_assignment_id, :mt_condition, :mt_hit_id, :mt_item
end
