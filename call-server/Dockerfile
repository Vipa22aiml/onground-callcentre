FROM python:3.12-slim
RUN pip install --no-cache-dir uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY server.py ./
ENV PORT=7860
EXPOSE 7860
CMD ["uv", "run", "--frozen", "--no-sync", "python", "server.py"]
