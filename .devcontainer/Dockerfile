FROM mcr.microsoft.com/devcontainers/python:3.11-bullseye

# Install Node.js
ARG NODE_VERSION="18"
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y nodejs \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Install TypeScript globally
RUN npm install -g typescript

# [Optional] If your requirements rarely change, uncomment this section
# to add them to the image.
COPY backend/requirements.txt /tmp/pip-tmp/
RUN pip3 --disable-pip-version-check --no-cache-dir install -r /tmp/pip-tmp/requirements.txt \
    && rm -rf /tmp/pip-tmp

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here> 