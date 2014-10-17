require 'concerns/filterable'
require 'concerns/exportable'
class AssignmentsView < ActiveRecord::Base
  include Filterable
  include Exportable
  self.table_name = 'assignments_view'  # for rails >= 3.2
  attr_readonly :data, :assignmentId, :hitId, :taskName, :workerId, :conf, :created_at, :updated_at, :completed_at

  default_scope order: 'assignments_view.created_at DESC'

  scope :workerId, lambda { |workerId| where(workerId: workerId) }
  scope :hitId, lambda { |hitId| where(hitId: hitId) }
  scope :taskName, lambda { |taskName| where(taskName: taskName) }

  def completed?
    !!completed_at
  end

  def sec_to_complete
    (completed_at.to_f - created_at.to_f) if completed_at
  end

end
