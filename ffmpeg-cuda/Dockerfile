# Start with NVidia CUDA base image
FROM nvidia/cuda:9.1-devel

LABEL Author="Xiaohai Li <haixiaolee@gmail.com>"
LABEL Description="Edited by Fedele Cavaliere <cavaliere12@gmail.com>"
LABEL Git="https://github.com/nightseas/gpgpu_applications/tree/master/docker/ffmpeg"

COPY video_test.mp4 /root

# Install dependent packages
RUN apt-get -y update && apt-get install -y wget nano git build-essential yasm pkg-config zlib1g-dev libmp3lame0 libmp3lame-dev librtmp* libx264* libx265* v4l-utils

# RUN git clone https://github.com/FFmpeg/nv-codec-headers /root/nv-codec-headers && \
COPY nv-codec-headers/ /root/nv-codec-headers
RUN cd /root/nv-codec-headers &&\
  make -j8 && \
  make install -j8 && \
  cd /root && rm -rf nv-codec-headers

# Compile and install ffmpeg from source
# RUN git clone https://github.com/FFmpeg/FFmpeg /root/ffmpeg && \
COPY FFmpeg/ /root/ffmpeg
RUN cd /root/ffmpeg && ./configure \
  --enable-nonfree --disable-shared \
  --enable-nvenc --enable-cuda \
  --enable-cuvid --enable-libnpp \
  --enable-decoder=png --enable-encoder=png \
  --extra-cflags=-I/usr/local/cuda/include \
  --extra-cflags=-I/usr/local/include \
  --extra-ldflags=-L/usr/local/cuda/lib64 && \
  make -j8 && \
  make install -j8 && \
  cd /root && rm -rf ffmpeg

ENV NVIDIA_DRIVER_CAPABILITIES video,compute,utility

WORKDIR /root


# --enable-gpl --enable-version3 \
# --enable-runtime-cpudetect --enable-zlib \
# --enable-libmp3lame --enable-librtmp \
# --enable-libx264 \