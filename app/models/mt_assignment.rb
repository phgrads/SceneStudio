# == Schema Information
#
# Table name: mt_assignments
#
#  id           :integer          not null, primary key
#  mtId         :string(255)
#  mt_hit_id    :integer
#  mt_worker_id :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  completed_at :datetime
#  data         :text
#  coupon_code  :string(255)
#

class MtAssignment < ActiveRecord::Base
  attr_accessible :completed_at, :data, :mt_hit_id, :mt_worker_id
  attr_readonly   :mtId, :coupon_code

  belongs_to :mt_hit
  belongs_to :mt_worker
  has_one    :mt_task, through: :mt_hit
  has_many   :mt_completed_item, dependent: :destroy

  validates :mtId,          presence: true
  validates :mt_hit_id,     presence: true
  validates :mt_worker_id,  presence: true
  validates :coupon_code,   presence: true

  def completed?
    !!completed_at
  end

  def sec_to_complete
    (completed_at.to_f - created_at.to_f) if completed_at
  end


  def complete!(data)
    self.data = data
    self.completed_at = DateTime.now
    save!
  end

  def self.register_and_save(params)
    worker = params[:worker]
    hit    = params[:hit]

    create! do |a|
      a.mtId        = params[:mtId]
      a.mt_worker   = worker
      a.mt_hit      = hit
      a.coupon_code = 
        Digest::MD5.hexdigest(
          "#{SecureRandom.hex(10)}#{DateTime.now.to_s}#{worker.mtId}")
    end
  end
end
