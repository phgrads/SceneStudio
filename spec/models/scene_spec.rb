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

require 'spec_helper'

describe Scene do
  pending "add some examples to (or delete) #{__FILE__}"
end
