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

require 'spec_helper'

describe MtAssignment do
  pending "add some examples to (or delete) #{__FILE__}"
end
