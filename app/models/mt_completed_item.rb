class MtCompletedItem < ActiveRecord::Base
  belongs_to :mt_assignment
  attr_accessible :data, :mt_assignment_id, :mt_condition, :mt_item, :code
  dragonfly_accessor :preview do
    storage_options do |a|
      # self is the model and a is the attachment
      { path: "mturk/#{a.meta['task']}/#{a.meta['condition']}/#{a.name}" }
    end
  end
  validates_size_of :preview, maximum: 500.kilobytes

  validates :data, presence: true
  validates :mt_assignment_id, presence: true
  validates :mt_item, presence: true

  def ok?
    status != 'REJ'
  end
end
