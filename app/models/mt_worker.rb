# == Schema Information
#
# Table name: mt_workers
#
#  id         :integer          not null, primary key
#  mtId       :string(255)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class MtWorker < ActiveRecord::Base
  attr_accessible :mtId

  has_many  :mt_assignments, dependent: :destroy

  validates :mtId, presence: true
end
