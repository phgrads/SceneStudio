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

require 'spec_helper'

describe MtHit do
  pending "add some examples to (or delete) #{__FILE__}"
end
