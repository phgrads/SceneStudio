module Experiments::RateSceneHelper
  def setup_experiment
    @nChoices = @conf['nChoices'].to_i
    @scale = true
    @choices = @conf['choices']
  end
end