FROM gcc:13-bookworm

# Install GDB
RUN apt-get update && apt-get install -y \
    gdb \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged user (but stay as root until chmod)
RUN useradd -m -u 1000 untrusted

# Copy and make executable while still root
COPY entrypoint.sh /home/untrusted/entrypoint.sh
RUN chmod +x /home/untrusted/entrypoint.sh

# Switch to unprivileged user
USER untrusted
WORKDIR /home/untrusted

ENTRYPOINT ["/home/untrusted/entrypoint.sh"]