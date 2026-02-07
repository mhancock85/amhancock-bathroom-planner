import modal
from pathlib import Path

app = modal.App("bathroom-planner")

# Create image with FastAPI and dist files
image = (
    modal.Image.debian_slim()
    .pip_install("fastapi[standard]")
    .add_local_dir("dist", remote_path="/assets")
)

@app.function(image=image)
@modal.fastapi_endpoint(method="GET", label="bathroom-planner")
def serve(request: modal.Request):
    from fastapi.responses import FileResponse, Response

    # Simple static file server logic
    path = request.url.path.lstrip("/")
    if not path or path == "":
        path = "index.html"

    file_path = Path("/assets") / path

    # If file exists, serve it
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)

    # SPA Fallback: if file not found (and not an asset request), serve index.html
    if "." not in path:
        return FileResponse(Path("/assets/index.html"))

    return Response(status_code=404)
