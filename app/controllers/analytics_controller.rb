class AnalyticsController < ApplicationController
	def getdata
		@assignments = MtAssignment.find(:all)
		require 'json'
		data = Array.new()
		@assignments.each do |assignment|
			d=JSON.parse assignment.data
			d.each do |datum|
				if datum.is_a?(Hash) and datum["scene"]["id"] == params[:id]
					data.push(datum)
				end
			end
		end
		logger.info data
		logger.info 
		render :json => data
	end		
end
