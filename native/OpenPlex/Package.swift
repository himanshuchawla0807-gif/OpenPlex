// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "OpenPlex", platforms: [.macOS(.v13)], products: [.executable(name: "OpenPlex", targets: ["OpenPlex"])], targets: [.executableTarget(name: "OpenPlex")])
