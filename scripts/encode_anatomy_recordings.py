"""Encode locally captured anatomy lesson frames as reviewable MP4 files."""

from __future__ import annotations

import json
from pathlib import Path

import cv2


ROOT = Path(__file__).resolve().parents[1]
RECORDING_ROOT = (ROOT / "artifacts" / "anatomy-animation").resolve()
FPS = 12


def encode(lesson: str) -> dict[str, object]:
    frame_dir = (RECORDING_ROOT / f"{lesson}-desktop-frames").resolve()
    output_path = (RECORDING_ROOT / f"{lesson}-playback.mp4").resolve()
    if RECORDING_ROOT not in frame_dir.parents or RECORDING_ROOT not in output_path.parents:
        raise ValueError("Recording paths must stay inside artifacts/anatomy-animation")

    frames = sorted(frame_dir.glob("*.jpg"))
    if not frames:
        raise FileNotFoundError(f"No captured JPEG frames in {frame_dir}")

    first = cv2.imread(str(frames[0]))
    if first is None:
        raise ValueError(f"Cannot decode {frames[0]}")
    source_height, source_width = first.shape[:2]
    height = source_height + source_height % 2
    width = source_width + source_width % 2
    writer = cv2.VideoWriter(
        str(output_path), cv2.VideoWriter_fourcc(*"mp4v"), FPS, (width, height)
    )
    if not writer.isOpened():
        raise RuntimeError(f"Could not open MP4 writer for {output_path}")

    try:
        for path in frames:
            frame = cv2.imread(str(path))
            if frame is None or frame.shape[:2] != (source_height, source_width):
                raise ValueError(f"Invalid or differently sized frame: {path}")
            if (source_height, source_width) != (height, width):
                frame = cv2.copyMakeBorder(
                    frame,
                    0,
                    height - source_height,
                    0,
                    width - source_width,
                    cv2.BORDER_REPLICATE,
                )
            writer.write(frame)
    finally:
        writer.release()

    check = cv2.VideoCapture(str(output_path))
    ok, sample = check.read()
    decoded = 1 if ok else 0
    if sample is None or sample.shape[:2] != (height, width):
        check.release()
        raise ValueError(f"Encoded file failed its first-frame decode: {output_path}")
    while True:
        ok, _ = check.read()
        if not ok:
            break
        decoded += 1
    check.release()
    if decoded != len(frames):
        raise ValueError(f"Decoded {decoded}/{len(frames)} frames from {output_path}")

    return {
        "lesson": lesson,
        "file": str(output_path.relative_to(ROOT)),
        "frames": decoded,
        "fps": FPS,
        "durationSeconds": round(decoded / FPS, 2),
        "width": width,
        "height": height,
        "bytes": output_path.stat().st_size,
    }


if __name__ == "__main__":
    print(json.dumps([encode("body-systems"), encode("heart-anatomy")], indent=2))
