class MtCompletedItem < ActiveRecord::Base
  belongs_to :mt_assignment
  attr_accessible :data, :mt_assignment_id, :mt_condition, :mt_item

  validates :data, presence: true
  validates :mt_assignment_id, presence: true
  validates :mt_item, presence: true
end
