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

require 'spec_helper'

describe MtAssignment do
  pending "add some examples to (or delete) #{__FILE__}"
end
