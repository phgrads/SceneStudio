# == Schema Information
#
# Table name: mt_assignments
#
#  id           :integer          not null, primary key
#  mtId         :string(255)
#  mt_hit_id    :integer
#  mt_worker_id :integer
#  input_data   :text
#  output_data  :text
#  completed    :boolean
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class MtAssignment < ActiveRecord::Base
  attr_accessible :completed, :input_data, :output_data,
                  :mtId, :mt_hit_id, :mt_worker_id

  belongs_to :mt_hit
  belongs_to :mt_worker
  has_one    :mt_task, through: :mt_hit

  before_validation :set_defaults

  validates :mtId,          presence: true
  validates :mt_hit_id,     presence: true
  validates :mt_worker_id,  presence: true

  validates :input_data,    presence: true
  validates :completed,     presence: true

  private
    def set_defaults
      self.completed ||= false
    end

end
