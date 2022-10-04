# ffmpeg HUB
Web UI and Web API for remote and integrated FFmpeg query execution

## Supported Codecs
Implements **NVENC Encoder only** and so H264 and H265 Decoder.
[NVIDIA Video Codec SDK](https://docs.nvidia.com/video-technologies/video-codec-sdk/ffmpeg-with-nvidia-gpu/)
# Setup
## Requirements
### *> NVIDIA Docker*
[NVIDIA Docker](https://github.com/NVIDIA/nvidia-docker) is the required **Docker Backend** for sharing CUDA resources with Host System
`sudo apt install nvidia-docker2` 
[Base image](https://hub.docker.com/layers/nvidia/cuda/11.4.2-base-ubuntu20.04/images/sha256-e513b09d0dab61c85b32b2702f9b37692a4170270adbd3e2612575d1c7208b3c?context=explore) to verify that GPU is detected inside container

### Test Procedure
`docker pull nvidia/cuda:11.4.2-base-ubuntu20.04`

`docker run --rm --runtime=nvidia -e NVIDIA_VISIBLE_DEVICES=all nvidia/cuda:11.4.2-base-ubuntu20.04 nvidia-smi` 

### *> Docker API*
Turn on **Docker Remote API** on Ubuntu (on port 2375)
### File: etc/default/docker
#### Use DOCKER_OPTS to modify the daemon startup options.
```
DOCKER_OPTS="--dns 8.8.8.8 --dns 8.8.4.4 -H tcp://127.0.0.1:2375 -H unix:///var/run/docker.sock"
```
### File: /lib/systemd/system/docker.service
#### Add EnviromentFile + add "$DOCKER_OPTS" at end of ExecStart
#### After change exec "systemctl daemon-reload"

```
EnvironmentFile=/etc/default/docker
ExecStart=/usr/bin/dockerd -H fd:// $DOCKER_OPTS
```

# Base Worker Container
`docker build -t feddynventor/ffmpeg-cuda .`
## Mount Block Devices
`docker run --rm --device=/dev/video0:/dev/video0 --device=/dev/video1:/dev/video1 feddynventor/ffmpeg-cuda ls /dev`

## Low-level Example commands
These commands are available inside the container only. To test them outside you need to create a container (entering Bash or executing them directly) specifying the runtime in the `docker run` command: `--runtime=nvidia`
### Analyze Devices
```v4l2-ctl --list-formats-ext```
### Concat Videos
```
ffmpeg -y -c:v h264_cuvid -i video_test.mp4 -i video2.mp4 -filter_complex "[0:v] [0:a] [1:v] [1:a] concat=n=2:v=1:a=1 [v] [a]" -map "[v]" -map "[a]" -vcodec h264_nvenc -r 30 -b:v 4M output.mp4
```
### Add Watermark
```
ffmpeg -y -c:v h264_cuvid -i video_test.mp4 -i logo.png -filter_complex "overlay=0:0" -vcodec h264_nvenc -b:v 4M output.mp4
```
### Compress to bitrate
```
ffmpeg -y -c:v h264_cuvid -i video_test.mp4 -vcodec h264_nvenc -b:v 2M output.mp4
```