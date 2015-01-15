module Experiments::RateSceneHelper
  def setup_experiment
    @nChoices = @conf['nChoices'].to_i
    @scale = true
    if @conf['choices']
      @choices = @conf['choices']
    else
      @choices = (1..@nChoices).map{ |x| '' }
      @choices[0] = "Bad"
      @choices[@nChoices-1] = "Great"
    end
  end
end