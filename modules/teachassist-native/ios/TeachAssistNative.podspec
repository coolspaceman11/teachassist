Pod::Spec.new do |s|
  s.name           = 'TeachAssistNative'
  s.version        = '1.0.0'
  s.summary        = 'TeachAssist+ Apple platform integrations'
  s.description    = 'WeatherKit, MapKit ETA, and read-only HealthKit support for TeachAssist+.'
  s.author         = 'TeachAssist+'
  s.homepage       = 'https://github.com/coolspaceman11/teachassist'
  s.license        = { :type => 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/coolspaceman11/teachassist.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WeatherKit', 'HealthKit', 'MapKit', 'CoreLocation'
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
