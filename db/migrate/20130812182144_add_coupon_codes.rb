class AddCouponCodes < ActiveRecord::Migration
  def up
    add_column :mt_assignments, :coupon_code, :string
  end

  def down
    remove_column :mt_assignments, :coupon_code
  end
end
