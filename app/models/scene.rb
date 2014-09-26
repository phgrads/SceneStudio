# == Schema Information
#
# Table name: scenes
#
#  id         :integer          not null, primary key
#  name       :string(255)
#  user_id    :integer
#  data       :text
#  ui_log     :text
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class Scene < ActiveRecord::Base
  attr_accessible :data, :name, :ui_log
  dragonfly_accessor :preview do
    storage_options do |a|
      # self is the model and a is the attachment
      { path: "scenes/#{a.name}" }
    end
  end
  #validates_size_of :preview, maximum: 500.kilobytes

  has_paper_trail

  belongs_to :user

  validates :name,    presence: true, length: { maximum: 80 }
  validates :user_id, presence: true

  default_scope order: 'scenes.created_at DESC'
end
