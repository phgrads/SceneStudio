class Scene < ActiveRecord::Base
  attr_accessible :data, :name, :ui_log

  has_paper_trail

  belongs_to :user

  validates :name,    presence: true, length: { maximum: 80 }
  validates :user_id, presence: true

  default_scope order: 'scenes.created_at DESC'
end
