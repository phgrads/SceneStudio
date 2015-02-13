module Experiments::RateSceneHelper
  def setup_experiment
    @nChoices = @conf['nChoices'].to_i
    @choices = @conf['choices']
  end
end