# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended to check this file into your version control system.

ActiveRecord::Schema.define(:version => 20141012222918) do

  create_table "identities", :force => true do |t|
    t.string   "name"
    t.string   "email"
    t.string   "password_digest"
    t.datetime "created_at",      :null => false
    t.datetime "updated_at",      :null => false
  end

  create_table "mt_assignments", :force => true do |t|
    t.string   "mtId"
    t.integer  "mt_hit_id"
    t.integer  "mt_worker_id"
    t.datetime "created_at",   :null => false
    t.datetime "updated_at",   :null => false
    t.datetime "completed_at"
    t.text     "data"
    t.string   "coupon_code"
  end

  add_index "mt_assignments", ["mtId", "mt_hit_id", "mt_worker_id"], :name => "index_mt_assignments_on_mtId_and_mt_hit_id_and_mt_worker_id"

  create_table "mt_completed_items", :force => true do |t|
    t.integer  "mt_assignment_id"
    t.string   "mt_condition"
    t.string   "mt_item"
    t.text     "data"
    t.datetime "created_at",       :null => false
    t.datetime "updated_at",       :null => false
    t.string   "status"
    t.string   "preview_uid"
    t.string   "preview_name"
    t.string   "code"
  end

  create_table "mt_hits", :force => true do |t|
    t.string   "mtId"
    t.datetime "created_at",   :null => false
    t.datetime "updated_at",   :null => false
    t.integer  "mt_task_id"
    t.datetime "completed_at"
    t.string   "conf"
  end

  add_index "mt_hits", ["mtId"], :name => "index_mt_hits_on_mtId_and_name"

  create_table "mt_tasks", :force => true do |t|
    t.string   "name"
    t.datetime "submitted_at"
    t.datetime "completed_at"
    t.string   "title"
    t.text     "description"
    t.integer  "reward"
    t.integer  "num_assignments"
    t.integer  "max_workers"
    t.integer  "max_hits_per_worker"
    t.string   "keywords"
    t.integer  "shelf_life"
    t.integer  "max_task_time"
    t.datetime "created_at",          :null => false
    t.datetime "updated_at",          :null => false
    t.integer  "user_id"
  end

  add_index "mt_tasks", ["created_at"], :name => "index_mt_tasks_on_created_at"
  add_index "mt_tasks", ["name"], :name => "index_mt_tasks_on_name"
  add_index "mt_tasks", ["user_id"], :name => "index_mt_tasks_on_user_id"

  create_table "mt_workers", :force => true do |t|
    t.string   "mtId"
    t.datetime "created_at", :null => false
    t.datetime "updated_at", :null => false
  end

  add_index "mt_workers", ["mtId"], :name => "index_mt_workers_on_mtId"

  create_table "scenes", :force => true do |t|
    t.string   "name"
    t.integer  "user_id"
    t.text     "data"
    t.text     "ui_log"
    t.datetime "created_at",   :null => false
    t.datetime "updated_at",   :null => false
    t.string   "preview_uid"
    t.string   "preview_name"
    t.string   "description"
    t.string   "category"
    t.string   "tag"
    t.string   "dataset"
    t.boolean  "noedit"
  end

  add_index "scenes", ["user_id", "created_at"], :name => "index_scenes_on_user_id_and_created_at"

  create_table "users", :force => true do |t|
    t.string   "provider"
    t.string   "uid"
    t.string   "name"
    t.datetime "created_at", :null => false
    t.datetime "updated_at", :null => false
    t.string   "role"
  end

  create_table "versions", :force => true do |t|
    t.string   "item_type",  :null => false
    t.integer  "item_id",    :null => false
    t.string   "event",      :null => false
    t.string   "whodunnit"
    t.text     "object"
    t.datetime "created_at"
  end

  add_index "versions", ["item_type", "item_id"], :name => "index_versions_on_item_type_and_item_id"

end
