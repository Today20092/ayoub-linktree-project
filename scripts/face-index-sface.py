# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = [
#   "numpy==2.2.6",
#   "opencv-python-headless==4.13.0.92",
#   "onnxruntime-directml==1.23.0; sys_platform == 'win32'",
#   "onnxruntime==1.23.0; sys_platform != 'win32'",
# ]
# ///
"""Resumable local SFace indexing. DirectML is required unless --cpu is explicit."""

import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re
import time

import cv2 as cv
import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parent.parent
MODEL = json.loads((ROOT / "src/data/sface-model.json").read_text())


def save(path: Path, value: object) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value), encoding="utf-8")
    os.replace(temporary, path)


def run() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event", required=True)
    parser.add_argument("--photos", type=Path, required=True)
    parser.add_argument("--cpu", action="store_true")
    parser.add_argument("--threshold", type=float, default=MODEL["threshold"])
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9-]+", args.event) or not 0 < args.threshold < 1:
        parser.error("Invalid event slug or threshold")
    source = args.photos.resolve(strict=True)
    files = sorted(
        p
        for p in source.iterdir()
        if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
    )
    if not files:
        parser.error("No photos found")
    work = ROOT / ".face-index" / args.event
    cache = work / "sface-cache"
    cache.mkdir(parents=True, exist_ok=True)
    lock_path = work / ".sface-index.lock"
    lock = lock_path.open("x")
    lock.write(str(os.getpid()))
    lock.close()
    try:
        directory = ROOT / "public/face-models" / MODEL["directory"]
        for item in (MODEL["detector"], MODEL["recognizer"]):
            if (
                hashlib.sha256((directory / item["filename"]).read_bytes()).hexdigest()
                != item["sha256"]
            ):
                raise ValueError("Model checksum mismatch")
        provider = "CPUExecutionProvider" if args.cpu else "DmlExecutionProvider"
        if provider not in ort.get_available_providers():
            raise RuntimeError(
                "DirectML unavailable; use Windows GPU runtime or explicitly pass --cpu"
            )
        cv.setNumThreads(4)
        detector = cv.FaceDetectorYN.create(
            str(directory / MODEL["detector"]["filename"]),
            "",
            (320, 320),
            0.6,
            0.3,
            5000,
        )
        aligner = cv.FaceRecognizerSF.create(
            str(directory / MODEL["recognizer"]["filename"]), ""
        )
        options = ort.SessionOptions()
        options.intra_op_num_threads = 4
        options.enable_mem_pattern = False
        options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        options.enable_profiling = True
        options.profile_file_prefix = str(work / "sface-index-profile")
        options.log_severity_level = 3
        providers = (
            [provider]
            if args.cpu
            else [(provider, {"device_id": "0"}), "CPUExecutionProvider"]
        )
        session = ort.InferenceSession(
            str(directory / MODEL["recognizer"]["filename"]),
            sess_options=options,
            providers=providers,
        )
        if provider not in session.get_providers():
            raise RuntimeError("Requested execution provider failed to initialize")
        input_name = session.get_inputs()[0].name
        detections = []
        processed = resumed = inference_calls = 0
        started = time.perf_counter()
        for position, path in enumerate(files):
            content = path.read_bytes()
            key = hashlib.sha256(path.name.encode()).hexdigest()[:12]
            fingerprint = hashlib.sha256(
                content + json.dumps(MODEL, sort_keys=True).encode() + b":1800-v1"
            ).hexdigest()
            cache_path = cache / (key + ".json")
            cached = json.loads(cache_path.read_text()) if cache_path.exists() else None
            if cached and cached.get("fingerprint") == fingerprint:
                rows = cached["detections"]
                if any(
                    len(row["embedding"]) != 128
                    or not np.isfinite(row["embedding"]).all()
                    for row in rows
                ):
                    raise ValueError("Corrupt cached descriptors")
                resumed += 1
            else:
                image = cv.imdecode(np.frombuffer(content, np.uint8), cv.IMREAD_COLOR)
                if image is None:
                    raise ValueError("Could not decode " + path.name)
                height, width = image.shape[:2]
                scale = min(1.0, 1800 / max(width, height))
                if scale < 1:
                    image = cv.resize(
                        image,
                        (round(width * scale), round(height * scale)),
                        interpolation=cv.INTER_AREA,
                    )
                height, width = image.shape[:2]
                detector.setInputSize((width, height))
                _, faces = detector.detect(image)
                rows = []
                for index, face in enumerate([] if faces is None else faces):
                    aligned = aligner.alignCrop(image, face)
                    blob = cv.dnn.blobFromImage(
                        aligned, 1, (112, 112), (0, 0, 0), True, False
                    )
                    embedding = np.asarray(
                        session.run(None, {input_name: blob})[0]
                    ).flatten()
                    inference_calls += 1
                    if (
                        embedding.size != 128
                        or not np.isfinite(embedding).all()
                        or np.linalg.norm(embedding) == 0
                    ):
                        raise ValueError("Invalid SFace descriptor")
                    rows.append(
                        {
                            "id": f"{key}-{index + 1}",
                            "filename": path.name,
                            "embedding": embedding.tolist(),
                            "box": [
                                float(face[0] / width),
                                float(face[1] / height),
                                float(face[2] / width),
                                float(face[3] / height),
                            ],
                            "landmarks": face[4:14].tolist(),
                            "imageSize": [width, height],
                        }
                    )
                save(cache_path, {"fingerprint": fingerprint, "detections": rows})
                processed += 1
            detections.extend(rows)
            print(
                f"[{position + 1}/{len(files)}] {path.name}: {len(rows)} face(s)"
                + (
                    " [cached]"
                    if cached and cached.get("fingerprint") == fingerprint
                    else ""
                ),
                flush=True,
            )
        profile_path = Path(session.end_profiling())
        events = json.loads(profile_path.read_text())
        provider_counts = Counter(
            e.get("args", {}).get("provider")
            for e in events
            if e.get("args", {}).get("provider")
        )
        if inference_calls and not provider_counts[provider]:
            raise RuntimeError("Requested execution provider performed no work")
        result = {
            "eventSlug": args.event,
            "model": MODEL["id"],
            "dimensions": 128,
            "threshold": args.threshold,
            "sourceDirectory": str(source),
            "photoCount": len(files),
            "detections": detections,
            "runtime": {
                "provider": provider,
                "providerCounts": dict(provider_counts),
                "profile": profile_path.name,
                "processed": processed,
                "resumed": resumed,
                "seconds": time.perf_counter() - started,
            },
        }
        save(work / "faces.json", result)
        print(
            json.dumps({k: v for k, v in result.items() if k != "detections"}),
            flush=True,
        )
    finally:
        lock_path.unlink()


if __name__ == "__main__":
    run()
