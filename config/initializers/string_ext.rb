class String

  def to_bool
    case
      when self == true || self =~ /^(true|t|yes|y|1)$/i
        true
      when self == false || self.blank? || self =~ /^(false|f|no|n|0)$/i
        false
      else
        false
#        raise ArgumentError.new "invalid value for Boolean: '#{self}'"
    end
  end

  alias :to_b :to_bool

end