import ExpoModulesCore
import CoreLocation
import HealthKit
import MapKit
import WeatherKit

private enum TeachAssistNativeError: Error {
  case locationUnavailable
  case locationDenied
  case destinationUnavailable
  case healthUnavailable
  case healthTypeUnavailable
  case weatherUnavailable
}

private final class OneShotLocationProvider: NSObject, CLLocationManagerDelegate {
  private let manager = CLLocationManager()
  private var continuation: CheckedContinuation<CLLocation, Error>?
  private var didResume = false

  override init() {
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
  }

  func location() async throws -> CLLocation {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<CLLocation, Error>) in
      self.continuation = continuation
      self.didResume = false

      guard CLLocationManager.locationServicesEnabled() else {
        resume(.failure(TeachAssistNativeError.locationUnavailable))
        return
      }

      switch manager.authorizationStatus {
      case .authorizedAlways, .authorizedWhenInUse:
        manager.requestLocation()
      case .notDetermined:
        manager.requestWhenInUseAuthorization()
      case .denied, .restricted:
        resume(.failure(TeachAssistNativeError.locationDenied))
      @unknown default:
        resume(.failure(TeachAssistNativeError.locationUnavailable))
      }
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    guard continuation != nil else { return }
    switch manager.authorizationStatus {
    case .authorizedAlways, .authorizedWhenInUse:
      manager.requestLocation()
    case .denied, .restricted:
      resume(.failure(TeachAssistNativeError.locationDenied))
    case .notDetermined:
      break
    @unknown default:
      resume(.failure(TeachAssistNativeError.locationUnavailable))
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else {
      resume(.failure(TeachAssistNativeError.locationUnavailable))
      return
    }
    resume(.success(location))
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    resume(.failure(error))
  }

  private func resume(_ result: Result<CLLocation, Error>) {
    guard !didResume, let continuation else { return }
    didResume = true
    self.continuation = nil
    switch result {
    case .success(let location): continuation.resume(returning: location)
    case .failure(let error): continuation.resume(throwing: error)
    }
  }
}

public class TeachAssistNativeModule: Module {
  private let healthStore = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("TeachAssistNative")

    AsyncFunction("getAppleWeather") { (latitude: Double, longitude: Double) async throws -> [String: Any] in
      guard #available(iOS 16.0, *) else {
        throw TeachAssistNativeError.weatherUnavailable
      }
      let location = CLLocation(latitude: latitude, longitude: longitude)
      let service = WeatherService.shared
      let current = try await service.weather(for: location, including: .current)
      let attribution = try await service.attribution

      return [
        "temperatureC": current.temperature.converted(to: .celsius).value,
        "apparentTemperatureC": current.apparentTemperature.converted(to: .celsius).value,
        "condition": current.condition.rawValue,
        "description": current.condition.description,
        "symbolName": current.symbolName,
        "isDaylight": current.isDaylight,
        "cloudCover": current.cloudCover,
        "humidity": current.humidity,
        "windKph": current.wind.speed.converted(to: .kilometersPerHour).value,
        "uvIndex": current.uvIndex.value,
        "providerName": attribution.serviceName,
        "legalPageURL": attribution.legalPageURL.absoluteString,
        "attributionMarkLightURL": attribution.combinedMarkLightURL.absoluteString,
        "attributionMarkDarkURL": attribution.combinedMarkDarkURL.absoluteString,
      ]
    }

    AsyncFunction("requestHealthAccess") { () async throws -> Bool in
      guard HKHealthStore.isHealthDataAvailable() else {
        throw TeachAssistNativeError.healthUnavailable
      }

      let ids: [HKQuantityTypeIdentifier] = [
        .stepCount,
        .distanceWalkingRunning,
        .activeEnergyBurned,
        .flightsClimbed,
      ]

      let readTypes = Set(ids.compactMap { HKObjectType.quantityType(forIdentifier: $0) as HKObjectType? })
      guard !readTypes.isEmpty else { throw TeachAssistNativeError.healthTypeUnavailable }

      return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Bool, Error>) in
        healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
          if let error {
            continuation.resume(throwing: error)
          } else {
            continuation.resume(returning: success)
          }
        }
      }
    }

    AsyncFunction("getHealthSummary") { () async throws -> [String: Any] in
      guard HKHealthStore.isHealthDataAvailable() else {
        throw TeachAssistNativeError.healthUnavailable
      }

      guard
        let stepType = HKObjectType.quantityType(forIdentifier: .stepCount),
        let distanceType = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning),
        let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned),
        let flightsType = HKObjectType.quantityType(forIdentifier: .flightsClimbed)
      else {
        throw TeachAssistNativeError.healthTypeUnavailable
      }

      let calendar = Calendar.current
      let now = Date()
      let startToday = calendar.startOfDay(for: now)
      let startWeek = calendar.date(byAdding: .day, value: -6, to: startToday) ?? startToday
      let end = calendar.date(byAdding: .day, value: 1, to: startToday) ?? now

      async let todaySteps = self.cumulativeSum(stepType, start: startToday, end: end, unit: .count())
      async let weekSteps = self.cumulativeSum(stepType, start: startWeek, end: end, unit: .count())
      async let todayDistance = self.cumulativeSum(distanceType, start: startToday, end: end, unit: .meter())
      async let todayEnergy = self.cumulativeSum(energyType, start: startToday, end: end, unit: .kilocalorie())
      async let todayFlights = self.cumulativeSum(flightsType, start: startToday, end: end, unit: .count())

      let values = try await (todaySteps, weekSteps, todayDistance, todayEnergy, todayFlights)

      return [
        "stepsToday": values.0,
        "stepsWeek": values.1,
        "averageSteps": values.1 / 7.0,
        "distanceKmToday": values.2 / 1000.0,
        "activeEnergyKcalToday": values.3,
        "flightsClimbedToday": values.4,
      ]
    }

    AsyncFunction("getSchoolETA") { () async throws -> [String: Any] in
      let sourceLocation = try await OneShotLocationProvider().location()

      let searchRequest = MKLocalSearch.Request()
      searchRequest.naturalLanguageQuery = "Maple High School, 50 Springside Road, Vaughan, Ontario"
      searchRequest.region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 43.86, longitude: -79.51),
        latitudinalMeters: 15000,
        longitudinalMeters: 15000
      )

      let searchResponse = try await MKLocalSearch(request: searchRequest).start()
      guard let destination = searchResponse.mapItems.first else {
        throw TeachAssistNativeError.destinationUnavailable
      }

      let source = MKMapItem(placemark: MKPlacemark(coordinate: sourceLocation.coordinate))
      source.name = "Current Location"

      let request = MKDirections.Request()
      request.source = source
      request.destination = destination
      request.transportType = .automobile
      request.departureDate = Date()

      let eta = try await self.calculateETA(request)
      let formatter = ISO8601DateFormatter()

      return [
        "seconds": eta.expectedTravelTime,
        "distanceMeters": eta.distance,
        "expectedArrivalISO": formatter.string(from: eta.expectedArrivalDate),
        "destinationName": destination.name ?? "Maple High School",
      ]
    }
  }

  private func cumulativeSum(
    _ type: HKQuantityType,
    start: Date,
    end: Date,
    unit: HKUnit
  ) async throws -> Double {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Double, Error>) in
      let predicate = HKQuery.predicateForSamples(
        withStart: start,
        end: end,
        options: [.strictStartDate]
      )

      let query = HKStatisticsQuery(
        quantityType: type,
        quantitySamplePredicate: predicate,
        options: .cumulativeSum
      ) { _, statistics, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }

        let value = statistics?.sumQuantity()?.doubleValue(for: unit) ?? 0
        continuation.resume(returning: value)
      }

      healthStore.execute(query)
    }
  }

  private func calculateETA(_ request: MKDirections.Request) async throws -> MKDirections.ETAResponse {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<MKDirections.ETAResponse, Error>) in
      MKDirections(request: request).calculateETA { response, error in
        if let error {
          continuation.resume(throwing: error)
        } else if let response {
          continuation.resume(returning: response)
        } else {
          continuation.resume(throwing: TeachAssistNativeError.destinationUnavailable)
        }
      }
    }
  }
}
