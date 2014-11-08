class CreateMtCompletedItemsWithAssignmentId < ActiveRecord::Migration
  def up
    execute <<-SQL
      DROP VIEW completed_items_view;
    SQL
    execute <<-SQL
      CREATE VIEW completed_items_view AS
        SELECT items.id,
               items.mt_condition AS 'condition',
               items.mt_item AS item,
               items.data,
               items.status AS status,
               items.preview_uid AS preview_uid,
               items.preview_name AS preview_name,
               items.created_at,
               items.updated_at,
               tasks.id AS taskId,
               tasks.name AS taskName,
               hits.mtId AS hitId,
               assignments.mtId AS assignmentId,
               workers.mtId AS workerId
        FROM mt_completed_items items
        JOIN mt_assignments assignments ON (items.mt_assignment_id = assignments.id)
        JOIN mt_hits hits ON (hits.id = assignments.mt_hit_id)
        JOIN mt_tasks tasks ON (tasks.id = hits.mt_task_id)
        JOIN mt_workers workers ON (workers.id = assignments.mt_worker_id);
    SQL
  end

  def down
    execute <<-SQL
      DROP VIEW completed_items_view;
    SQL
    execute <<-SQL
      CREATE VIEW completed_items_view AS
        SELECT items.id,
               items.mt_condition AS 'condition',
               items.mt_item AS item,
               items.data,
               items.preview_uid AS preview_uid,
               items.preview_name AS preview_name,
               items.created_at,
               items.updated_at,
               tasks.id AS taskId,
               tasks.name AS taskName,
               workers.mtId AS workerId
        FROM mt_completed_items items
        JOIN mt_assignments assignments ON (items.mt_assignment_id = assignments.id)
        JOIN mt_hits hits ON (hits.id = assignments.mt_hit_id)
        JOIN mt_tasks tasks ON (tasks.id = hits.mt_task_id)
        JOIN mt_workers workers ON (workers.id = assignments.mt_worker_id);
    SQL
  end
end
