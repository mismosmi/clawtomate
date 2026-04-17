FROM node:lts

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git vim && rm -rf /var/lib/apt/lists/*

ARG HOST_GATEWAY
RUN curl -fsSL "http://${HOST_GATEWAY}:7822/host-tools" \
      -o /usr/local/bin/host-tools && chmod +x /usr/local/bin/host-tools

ARG AI_POD_VERSION
RUN host-tools install claude

WORKDIR /app

RUN useradd -ms /bin/bash claude && chown -R claude /app

# System-level git identity (fallback when no host identity is provided)
RUN git config --system user.email "claude@ai-pod" && \
    git config --system user.name "claude"

USER claude

ENV PATH="/home/claude/.local/bin:${PATH}"
ENV EDITOR=vim

CMD ["claude"]
