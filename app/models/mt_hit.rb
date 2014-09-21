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
  attr_accessible :mt_task_id, :completed_at
  attr_readonly :mtId

  has_many   :mt_assignments, dependent: :destroy
  belongs_to :mt_task

  validates :mtId, presence: true
  validates :mt_task_id, presence: true

  # Config
  attr_accessible :conf
  serialize :conf, Hash

  def live?
    not self.completed?
  end

  def completed?
    !!self.completed_at
  end

  def complete!
    self.completed_at = DateTime.now
    save!
  end

end
