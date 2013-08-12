# == Schema Information
#
# Table name: mt_tasks
#
#  id                  :integer          not null, primary key
#  name                :string(255)
#  submitted_at        :datetime
#  completed_at        :datetime
#  title               :string(255)
#  description         :text
#  reward              :integer
#  num_assignments     :integer
#  max_workers         :integer
#  max_hits_per_worker :integer
#  keywords            :string(255)
#  shelf_life          :integer
#  max_task_time       :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#

require 'spec_helper'

describe MtTask do
  pending "add some examples to (or delete) #{__FILE__}"
end
