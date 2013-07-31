# == Schema Information
#
# Table name: mt_hits
#
#  id         :integer          not null, primary key
#  mtId       :string(255)
#  name       :string(255)
#  mtParams   :text
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class MtHit < ActiveRecord::Base
  attr_accessible :mtId, :mtParams, :name

  has_many  :mt_assignments, dependent: :destroy

  #validates :mtId,      presence: true
  validates :mtParams,  presence: true
  validates :name,      presence: true, length: { maximum: 80 }
end
