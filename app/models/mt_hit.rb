# == Schema Information
#
# Table name: mt_hits
#
#  id         :integer          not null, primary key
#  mtId       :string(255)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  mt_task_id :integer
#

class MtHit < ActiveRecord::Base
  attr_accessible :mtId, :mt_task_id

  has_many   :mt_assignments, dependent: :destroy
  belongs_to :mt_task

  validates :mtId, presence: true
  validates :mt_task_id, presence: true
  
  
end
