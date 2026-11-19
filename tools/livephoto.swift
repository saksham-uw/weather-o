// Builds an iOS Live Photo pair (HEIC still + MOV) from an image and a video.
// Usage: swift tools/livephoto.swift <still.png|jpg> <video.mp4|mov> <out-basename>
// Produces <out-basename>.HEIC and <out-basename>.MOV sharing one content identifier.
// Import BOTH files together into Photos (Mac Photos app / AirDrop) and they appear as one Live Photo.

import AVFoundation
import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 4 else {
    FileHandle.standardError.write("usage: livephoto <still> <video> <out-basename>\n".data(using: .utf8)!)
    exit(2)
}
let stillURL = URL(fileURLWithPath: args[1])
let videoURL = URL(fileURLWithPath: args[2])
let outImage = URL(fileURLWithPath: args[3] + ".HEIC")
let outVideo = URL(fileURLWithPath: args[3] + ".MOV")
let assetID = UUID().uuidString

func fail(_ msg: String) -> Never {
    FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
    exit(1)
}

// ---- Still image: embed content identifier in Apple MakerNote key "17" ----
do {
    guard let src = CGImageSourceCreateWithURL(stillURL as CFURL, nil),
          let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fail("cannot read still") }
    try? FileManager.default.removeItem(at: outImage)
    guard let dst = CGImageDestinationCreateWithURL(outImage as CFURL, UTType.heic.identifier as CFString, 1, nil)
    else { fail("cannot create HEIC") }
    let props: [CFString: Any] = [
        kCGImagePropertyMakerAppleDictionary: ["17": assetID],
        kCGImageDestinationLossyCompressionQuality: 0.92,
    ]
    CGImageDestinationAddImage(dst, img, props as CFDictionary)
    guard CGImageDestinationFinalize(dst) else { fail("HEIC finalize failed") }
}

// ---- Video: passthrough copy + content identifier + still-image-time metadata track ----
let sem = DispatchSemaphore(value: 0)
Task {
    do {
        let asset = AVURLAsset(url: videoURL)
        guard let vTrack = try await asset.loadTracks(withMediaType: .video).first else { fail("no video track") }
        let duration = try await asset.load(.duration)
        let formatDescs = try await vTrack.load(.formatDescriptions)
        let transform = try await vTrack.load(.preferredTransform)

        let reader = try AVAssetReader(asset: asset)
        let rOut = AVAssetReaderTrackOutput(track: vTrack, outputSettings: nil)
        reader.add(rOut)

        try? FileManager.default.removeItem(at: outVideo)
        let writer = try AVAssetWriter(outputURL: outVideo, fileType: .mov)
        let idItem = AVMutableMetadataItem()
        idItem.keySpace = .quickTimeMetadata
        idItem.key = "com.apple.quicktime.content.identifier" as NSString
        idItem.value = assetID as NSString
        idItem.dataType = "com.apple.metadata.datatype.UTF-8"
        writer.metadata = [idItem]

        let wIn = AVAssetWriterInput(mediaType: .video, outputSettings: nil, sourceFormatHint: formatDescs.first)
        wIn.transform = transform
        wIn.expectsMediaDataInRealTime = false
        writer.add(wIn)

        // Timed metadata track marking the key-photo time.
        let spec: NSDictionary = [
            kCMMetadataFormatDescriptionMetadataSpecificationKey_Identifier as String:
                "mdta/com.apple.quicktime.still-image-time",
            kCMMetadataFormatDescriptionMetadataSpecificationKey_DataType as String:
                "com.apple.metadata.datatype.int8",
        ]
        var metaDesc: CMFormatDescription?
        CMMetadataFormatDescriptionCreateWithMetadataSpecifications(
            allocator: kCFAllocatorDefault, metadataType: kCMMetadataFormatType_Boxed,
            metadataSpecifications: [spec] as CFArray, formatDescriptionOut: &metaDesc)
        let mIn = AVAssetWriterInput(mediaType: .metadata, outputSettings: nil, sourceFormatHint: metaDesc)
        let adaptor = AVAssetWriterInputMetadataAdaptor(assetWriterInput: mIn)
        writer.add(mIn)

        writer.startWriting()
        reader.startReading()
        writer.startSession(atSourceTime: .zero)

        let still = AVMutableMetadataItem()
        still.key = "com.apple.quicktime.still-image-time" as NSString
        still.keySpace = AVMetadataKeySpace(rawValue: "mdta")
        still.value = 0 as NSNumber
        still.dataType = "com.apple.metadata.datatype.int8"
        // Key photo = first frame (the looped clip starts on the still).
        adaptor.append(AVTimedMetadataGroup(items: [still],
            timeRange: CMTimeRange(start: .zero, duration: CMTime(value: 200, timescale: 3000))))
        mIn.markAsFinished()

        while let sample = rOut.copyNextSampleBuffer() {
            while !wIn.isReadyForMoreMediaData { usleep(2000) }
            wIn.append(sample)
        }
        wIn.markAsFinished()
        writer.endSession(atSourceTime: duration)
        await writer.finishWriting()
        if writer.status != .completed { fail("MOV write failed: \(String(describing: writer.error))") }
        print("ok \(outImage.lastPathComponent) + \(outVideo.lastPathComponent) id=\(assetID)")
    } catch {
        fail("error: \(error)")
    }
    sem.signal()
}
sem.wait()
