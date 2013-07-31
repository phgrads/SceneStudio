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

require 'spec_helper'

describe MtHit do
  pending "add some examples to (or delete) #{__FILE__}"
end
