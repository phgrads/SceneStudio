class AnalyticsController < ApplicationController
	before_filter :retrieve, only: [:loadscene, :viewscene]
	layout 'webgl_viewport', only: [:viewscene]

	#Find all of the mturk collected view data for a particular scene
	def getdata
		@assignments = MtAssignment.where("mt_hit_id=6")
		require 'json'
		data = Array.new()
		@assignments.each do |assignment|
			logger.info assignment.data
			logger.info
			if assignment.data
				d=JSON.parse assignment.data  
				d.each do |datum|
					if datum["scene"]["id"] == params[:id]
						data.push(datum)
					end
				end
			end
		end
		logger.info data
		logger.info 
		render :json => data
	end
	#Retrieve the created scene for an edit assignment
	def loadscene
		logger.info @assignment.data
		render :text => @assignment.data
	end
	#view an mturk created scene
	def viewscene 
		render 'view'
	end
	private
		def retrieve
      		@assignment = MtAssignment.find(params[:id])
      	end
end
