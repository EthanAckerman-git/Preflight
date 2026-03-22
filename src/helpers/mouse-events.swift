// mouse-events.swift
// Compiled helper for sending mouse events to the macOS screen via CoreGraphics.
// Saves and immediately restores the cursor position so the user's mouse is never moved.
//
// Usage:
//   mouse-events tap <x> <y>
//   mouse-events longpress <x> <y> <durationMs>
//   mouse-events swipe <startX> <startY> <endX> <endY> <steps> <durationMs>

import CoreGraphics
import Foundation

// Save current cursor position before doing anything
func saveCursorPosition() -> CGPoint {
    if let event = CGEvent(source: nil) {
        return event.location
    }
    return .zero
}

// Restore cursor to saved position without generating any mouse events
func restoreCursorPosition(_ point: CGPoint) {
    CGWarpMouseCursorPosition(point)
    // Suppress the cursor-moved delta so apps don't see the warp
    CGAssociateMouseAndMouseCursorPosition(1)
}

func postMouseEvent(type: CGEventType, x: CGFloat, y: CGFloat) {
    let point = CGPoint(x: x, y: y)
    let button: CGMouseButton = .left
    guard let event = CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: point, mouseButton: button) else {
        fputs("Failed to create CGEvent\n", stderr)
        exit(1)
    }
    event.post(tap: .cghidEventTap)
}

let args = CommandLine.arguments
guard args.count >= 2 else {
    fputs("Usage: mouse-events <tap|longpress|swipe> ...\n", stderr)
    exit(1)
}

let command = args[1]
let savedPos = saveCursorPosition()

switch command {
case "tap":
    guard args.count == 4, let x = Double(args[2]), let y = Double(args[3]) else {
        fputs("tap requires: x y\n", stderr); exit(1)
    }
    postMouseEvent(type: .leftMouseDown, x: CGFloat(x), y: CGFloat(y))
    Thread.sleep(forTimeInterval: 0.05)
    postMouseEvent(type: .leftMouseUp, x: CGFloat(x), y: CGFloat(y))

case "longpress":
    guard args.count == 5, let x = Double(args[2]), let y = Double(args[3]), let ms = Double(args[4]) else {
        fputs("longpress requires: x y durationMs\n", stderr); exit(1)
    }
    postMouseEvent(type: .leftMouseDown, x: CGFloat(x), y: CGFloat(y))
    Thread.sleep(forTimeInterval: ms / 1000.0)
    postMouseEvent(type: .leftMouseUp, x: CGFloat(x), y: CGFloat(y))

case "swipe":
    guard args.count == 8,
          let sx = Double(args[2]), let sy = Double(args[3]),
          let ex = Double(args[4]), let ey = Double(args[5]),
          let steps = Int(args[6]), let ms = Double(args[7]) else {
        fputs("swipe requires: startX startY endX endY steps durationMs\n", stderr); exit(1)
    }
    let stepDelay = ms / 1000.0 / Double(steps)
    postMouseEvent(type: .leftMouseDown, x: CGFloat(sx), y: CGFloat(sy))
    for i in 1...steps {
        let t = Double(i) / Double(steps)
        let cx = sx + (ex - sx) * t
        let cy = sy + (ey - sy) * t
        Thread.sleep(forTimeInterval: stepDelay)
        postMouseEvent(type: .leftMouseDragged, x: CGFloat(cx), y: CGFloat(cy))
    }
    Thread.sleep(forTimeInterval: 0.02)
    postMouseEvent(type: .leftMouseUp, x: CGFloat(ex), y: CGFloat(ey))

default:
    fputs("Unknown command: \(command)\n", stderr)
    restoreCursorPosition(savedPos)
    exit(1)
}

// Always restore cursor to where it was before we started
restoreCursorPosition(savedPos)
