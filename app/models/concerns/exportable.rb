# Allows model to be exported for a variety of formats
# @products.as_csv
module Exportable
  extend ActiveSupport::Concern

  module ClassMethods

    # Exports as csv
    def as_csv(column_names)
      if column_names.nil?
        column_names = self.column_names
      end
      CSV.generate do |csv|
        csv << column_names
        self.all.each do |item|
          csv << item.attributes.values_at(*column_names)
        end
      end
    end
  end
end