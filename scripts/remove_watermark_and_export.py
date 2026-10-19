#!/usr/bin/env python3
"""
scripts/remove_watermark_and_export.py
Removes the bottom-right Gemini star watermark from the INSIGHT.arc loading intro video,
reconstructs background frames using localized Telea inpainting, and encodes high-fidelity,
web-optimized H.264 MP4 assets.
"""

import os
import subprocess
import cv2
import numpy as np

def process_video():
    input_path = "loding page/INSIGHT.arc_brand_loading_animation_1080p_20261019204846.mp4"
    temp_processed_path = "scratch/insight_arc_intro_clean.mp4"
    output_dirs = [
        "frontend/public/static/videos",
        "frontend/static/videos",
        "web/static/videos"
    ]
    for out_dir in output_dirs:
        os.makedirs(out_dir, exist_ok=True)
    
    cap = cv2.VideoCapture(input_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
    
    print(f"Processing input: {input_path}")
    print(f"Dimensions: {w}x{h}, FPS: {fps}, Total Frames: {total_frames}")

    # Build precise logo mask from reference frame (frame 120 / midpoint)
    cap.set(cv2.CAP_PROP_POS_FRAMES, 120)
    ret, ref_frame = cap.read()
    if not ret:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        ret, ref_frame = cap.read()

    mask = np.zeros((h, w), dtype=np.uint8)
    gray = cv2.cvtColor(ref_frame, cv2.COLOR_BGR2GRAY)
    crop_gray = gray[800:950, 1690:1790]
    _, logo_thresh = cv2.threshold(crop_gray, 35, 255, cv2.THRESH_BINARY)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(logo_thresh)
    largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    logo_comp = (labels == largest_label).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    dilated = cv2.dilate(logo_comp, kernel, iterations=3)
    mask[800:950, 1690:1790] = dilated
    # Constrain boundary to avoid orbital line (y < 795) or particle (x > 1785)
    mask[:795, :] = 0
    mask[:, 1785:] = 0

    print(f"Mask created: {np.sum(mask > 0)} pixels")

    # Rewind to start
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    # Launch FFmpeg process to encode raw BGR frames + merge original audio
    ffmpeg_bin = "./.venv/bin/ffmpeg"
    cmd = [
        ffmpeg_bin,
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{w}x{h}",
        "-pix_fmt", "bgr24",
        "-r", str(fps),
        "-i", "-",  # Video from stdin
        "-i", input_path,  # Original file for audio
        "-map", "0:v:0",
        "-map", "1:a:0?",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        temp_processed_path
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Telea inpainting on the exact logo mask
        clean_frame = cv2.inpaint(frame, mask, inpaintRadius=5, flags=cv2.INPAINT_TELEA)
        proc.stdin.write(clean_frame.tobytes())
        frame_count += 1
        if frame_count % 40 == 0 or frame_count == total_frames:
            print(f"Processed frame {frame_count}/{total_frames} ({frame_count/total_frames*100:.1f}%)")

    cap.release()
    proc.stdin.close()
    proc.wait()

    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg encoding failed with exit code {proc.returncode}")

    print(f"Clean video successfully encoded to {temp_processed_path}")

    # Copy to target distribution directories
    import shutil
    for out_dir in output_dirs:
        dest_file = os.path.join(out_dir, "insight_arc_intro.mp4")
        shutil.copyfile(temp_processed_path, dest_file)
        size_mb = os.path.getsize(dest_file) / (1024 * 1024)
        print(f"Copied to {dest_file} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    process_video()
