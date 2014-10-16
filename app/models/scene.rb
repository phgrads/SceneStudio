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
  attr_accessible :data, :ui_log
  attr_accessible :name, :description, :category, :tag, :dataset, :noedit
  dragonfly_accessor :preview do
    storage_options do |a|
      # self is the model and a is the attachment
      { path: "scenes/#{a.name}" }
    end
  end
  validates_size_of :preview, maximum: 500.kilobytes

  has_paper_trail

  belongs_to :user

  validates :name,    presence: true, length: { maximum: 80 }
  validates :user_id, presence: true

  default_scope order: 'scenes.created_at DESC'

  def self.as_csv
    CSV.generate do |csv|
      csv << column_names
      all.each do |item|
        csv << item.attributes.values_at(*column_names)
      end
    end
  end
end
